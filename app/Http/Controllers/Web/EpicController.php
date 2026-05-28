<?php

namespace App\Http\Controllers\Web;

use App\Exceptions\NasaApiException;
use App\Http\Requests\EpicDateRequest;
use App\Services\Nasa\EpicService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Inertia\Inertia;
use Inertia\Response;

class EpicController
{
    public function __construct(private readonly EpicService $epic)
    {
    }

    public function index(EpicDateRequest $request): Response
    {
        $date = $request->input('date') ?: CarbonImmutable::today()->subDays(2)->toDateString();

        try {
            $data = $this->epic->imagesByDate($date);
            $error = null;
        } catch (NasaApiException $exception) {
            $data = ['date' => $date, 'images' => [], 'source' => 'NASA EPIC'];
            $error = $exception->getUserMessage();
        }

        return Inertia::render('Epic/Index', [
            ...$data,
            'error' => $error,
            'filters' => ['date' => $date],
        ]);
    }

    public function data(EpicDateRequest $request): JsonResponse
    {
        $date = $request->input('date') ?: CarbonImmutable::today()->subDays(2)->toDateString();

        try {
            $data = $this->epic->imagesByDate($date);
            $error = null;
        } catch (NasaApiException $exception) {
            $data = ['date' => $date, 'images' => [], 'source' => 'NASA EPIC'];
            $error = $exception->getUserMessage();
        }

        $ttl = (int) config('services.nasa.epic_cache_ttl', 86400);

        return response()->json([
            ...$data,
            'error' => $error,
            'filters' => ['date' => $date],
        ])->header('Cache-Control', $error ? 'no-store' : "public, max-age={$ttl}, stale-while-revalidate=3600");
    }
}
