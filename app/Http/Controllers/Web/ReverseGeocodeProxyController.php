<?php

namespace App\Http\Controllers\Web;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ReverseGeocodeProxyController
{
    public function __invoke(Request $request): JsonResponse
    {
        $lat = (float) $request->query('latitude', '0');
        $lon = (float) $request->query('longitude', '0');
        $lang = in_array($request->query('localityLanguage'), ['pt', 'en'], true)
            ? $request->query('localityLanguage')
            : 'pt';

        if ($lat === 0.0 && $lon === 0.0) {
            return response()->json(['error' => 'Missing coordinates'], 422);
        }

        $cacheKey = sprintf('geocode:%s:%.3f:%.3f', $lang, $lat, $lon);

        $data = Cache::remember($cacheKey, now()->addDay(), function () use ($lat, $lon, $lang) {
            $response = Http::timeout(5)->acceptJson()->get(
                'https://api.bigdatacloud.net/data/reverse-geocode-client',
                [
                    'latitude' => $lat,
                    'longitude' => $lon,
                    'localityLanguage' => $lang,
                ],
            );

            if (! $response->ok()) {
                return null;
            }

            return $response->json();
        });

        if ($data === null) {
            return response()->json(['error' => 'Geocoding unavailable'], 502);
        }

        return response()->json($data)->header('Cache-Control', 'public, max-age=86400');
    }
}
