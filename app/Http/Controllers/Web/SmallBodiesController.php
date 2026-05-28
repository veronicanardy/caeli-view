<?php

namespace App\Http\Controllers\Web;

use App\Exceptions\JplApiException;
use App\Http\Requests\JplCloseApproachRequest;
use App\Http\Requests\SmallBodyLookupRequest;
use App\Services\Jpl\CloseApproachService;
use App\Services\Jpl\SmallBodyService;
use Inertia\Inertia;
use Inertia\Response;

class SmallBodiesController
{
    public function __construct(
        private readonly CloseApproachService $closeApproaches,
        private readonly SmallBodyService $smallBodies,
    ) {
    }

    public function index(JplCloseApproachRequest $request): Response
    {
        $filters = $request->filters($this->closeApproaches->defaultFilters());

        try {
            $data = $this->closeApproaches->search($filters);
            $error = null;
        } catch (JplApiException $exception) {
            $data = [
                'approaches' => [],
                'summary' => null,
                'charts' => null,
                'filters' => $filters,
                'source' => 'NASA/JPL SBDB Close Approach Data API',
                'query' => [],
            ];
            $error = $exception->getUserMessage();
        }

        return Inertia::render('SmallBodies/Index', [
            ...$data,
            'error' => $error,
        ]);
    }

    public function show(SmallBodyLookupRequest $request): Response
    {
        try {
            $data = $this->smallBodies->lookup($request->identifier());
            $smallBody = $data['smallBody'];
            $query = $data['query'];
            $error = null;
        } catch (JplApiException $exception) {
            $smallBody = null;
            $query = [];
            $error = $exception->getUserMessage();
        }

        return Inertia::render('SmallBodies/Show', [
            'smallBody' => $smallBody,
            'source' => 'NASA/JPL Small-Body Database API',
            'query' => $query,
            'error' => $error,
        ]);
    }
}
