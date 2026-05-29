<?php

return [
    'nasa' => [
        'base_url' => env('NASA_API_BASE_URL', 'https://api.nasa.gov'),
        'api_key' => env('NASA_API_KEY'),
        'timeout' => (int) env('NASA_TIMEOUT_SECONDS', 8),
        'retry_times' => (int) env('NASA_RETRY_TIMES', 2),
        'retry_sleep_ms' => (int) env('NASA_RETRY_SLEEP_MS', 250),
        'cache_ttl' => (int) env('NASA_CACHE_TTL_SECONDS', 21600),
        'epic_cache_ttl' => (int) env('NASA_EPIC_CACHE_TTL_SECONDS', 86400),
        'apod_cache_ttl' => (int) env('NASA_APOD_CACHE_TTL_SECONDS', 86400),
    ],

    'jpl' => [
        'base_url' => env('JPL_API_BASE_URL', 'https://ssd-api.jpl.nasa.gov'),
        'horizons_base_url' => env('JPL_HORIZONS_BASE_URL', 'https://ssd.jpl.nasa.gov/api'),
        'timeout' => (int) env('JPL_TIMEOUT_SECONDS', 20),
        'retry_times' => (int) env('JPL_RETRY_TIMES', 2),
        'retry_sleep_ms' => (int) env('JPL_RETRY_SLEEP_MS', 300),
        'cad_cache_ttl' => (int) env('JPL_CAD_CACHE_TTL_SECONDS', 21600),
        'sbdb_cache_ttl' => (int) env('JPL_SBDB_CACHE_TTL_SECONDS', 86400),
        'horizons_cache_ttl' => (int) env('JPL_HORIZONS_CACHE_TTL_SECONDS', 86400),
    ],

    'asteroid_models' => [
        'cache_ttl' => (int) env('ASTEROID_MODEL_CACHE_TTL_SECONDS', 604800),
    ],
];
