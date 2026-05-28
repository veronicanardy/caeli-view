<?php

namespace App\Http\Controllers\Web;

use App\Exceptions\NasaApiException;
use App\Http\Requests\ApodDateRequest;
use App\Services\Nasa\ApodService;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class ApodController
{
    public function __construct(private readonly ApodService $apod)
    {
    }

    public function index(ApodDateRequest $request): Response
    {
        $date = $request->input('date') ?: $this->apod->defaultDate();

        return Inertia::render('Apod/Index', [
            'apod' => null,
            'filters' => ['date' => $date],
            'error' => null,
        ]);
    }

    public function data(ApodDateRequest $request): JsonResponse
    {
        $date = $request->input('date') ?: $this->apod->defaultDate();

        try {
            $apod = $this->apod->byDate($date);
            $error = null;
        } catch (NasaApiException $exception) {
            $apod = null;
            $error = $exception->getUserMessage();
        }

        $ttl = (int) config('services.nasa.apod_cache_ttl', 86400);

        return response()->json([
            'apod' => $apod,
            'filters' => ['date' => $date],
            'error' => $error,
        ])->header('Cache-Control', $error ? 'no-store' : "public, max-age={$ttl}, stale-while-revalidate=3600");
    }
}
