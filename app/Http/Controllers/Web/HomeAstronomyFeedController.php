<?php

namespace App\Http\Controllers\Web;

use App\Services\Approaches\ApproachObservatoryService;
use App\Services\Nasa\ApodService;
use App\Services\SpaceNews\SpaceNewsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Config;
use Throwable;

class HomeAstronomyFeedController
{
    public function __construct(
        private readonly ApodService $apod,
        private readonly ApproachObservatoryService $observatory,
        private readonly SpaceNewsService $spaceNews,
    ) {
    }

    public function __invoke(): JsonResponse
    {
        try {
            $apod = $this->apod->today();
            $apodError = null;
        } catch (Throwable) {
            $apod = null;
            $apodError = 'NASA APOD indisponível agora.';
        }

        $nextApproach = null;

        if ((bool) Config::get('features.home_observatory_feed', true)) {
            try {
                $today = now()->toDateString();
                $nextApproach = $this->observatory->nextApproach([
                    'date_min' => $today,
                    'date_max' => now()->addDays(7)->toDateString(),
                    'dist_max' => '0.2',
                    'type'     => 'all',
                ]);
            } catch (Throwable) {
                $nextApproach = null;
            }
        }

        return response()->json([
            'apod' => $apod,
            'apodError' => $apodError,
            'nextApproach' => $nextApproach,
            'spaceNewsHighlight' => $this->spaceNews->highlight(),
        ])->header('Cache-Control', 'public, max-age=900, stale-while-revalidate=1800');
    }
}
