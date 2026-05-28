<?php

namespace App\Http\Controllers\Web;

use App\Exceptions\NasaApiException;
use App\Http\Requests\NeoWsDateRangeRequest;
use App\Services\Nasa\NeoWsService;
use Inertia\Inertia;
use Inertia\Response;

class AsteroidController
{
    public function __construct(private readonly NeoWsService $neoWs)
    {
    }

    public function index(NeoWsDateRangeRequest $request): Response
    {
        $period = [
            'startDate' => $request->input('start_date') ?: $this->neoWs->defaultPeriod()['startDate'],
            'endDate' => $request->input('end_date') ?: $this->neoWs->defaultPeriod()['endDate'],
        ];

        try {
            $data = $this->neoWs->feed($period['startDate'], $period['endDate']);
            $error = null;
        } catch (NasaApiException $exception) {
            $data = [
                'asteroids' => [],
                'stats' => null,
                'period' => $period,
                'source' => 'NASA NeoWs',
            ];
            $error = $exception->getUserMessage();
        }

        return Inertia::render('Asteroids/Index', [
            ...$data,
            'error' => $error,
            'filters' => [
                'start_date' => $period['startDate'],
                'end_date' => $period['endDate'],
            ],
        ]);
    }

    public function show(string $asteroidId): Response
    {
        try {
            $asteroid = $this->neoWs->lookup($asteroidId);
            $error = null;
        } catch (NasaApiException $exception) {
            $asteroid = null;
            $error = $exception->getUserMessage();
        }

        return Inertia::render('Asteroids/Show', [
            'asteroid' => $asteroid,
            'error' => $error,
        ]);
    }
}
