<?php

namespace App\Http\Controllers\Web;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class SkyObservationProxyController
{
    /**
     * Responsabilidade: proxy com cache para a API 7Timer, retornando
     * condições astronômicas do céu para as coordenadas informadas.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $lat = $request->float('lat');
        $lon = $request->float('lon');

        if ($lat === 0.0 && $lon === 0.0) {
            return response()->json(['error' => 'Missing coordinates'], 422);
        }

        $cacheKey = 'sky_obs:' . round($lat, 2) . ':' . round($lon, 2);

        $data = Cache::remember($cacheKey, now()->addHours(4), function () use ($lat, $lon) {
            $response = Http::timeout(8)->get('https://www.7timer.info/bin/astro.php', [
                'lon'     => $lon,
                'lat'     => $lat,
                'ac'      => 0,
                'unit'    => 'metric',
                'output'  => 'json',
                'tzshift' => 0,
            ]);

            return $response->successful() ? $response->json() : null;
        });

        if ($data === null) {
            return response()->json(['error' => '7Timer unavailable'], 502);
        }

        return response()->json($data);
    }
}
