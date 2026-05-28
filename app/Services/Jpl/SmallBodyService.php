<?php

namespace App\Services\Jpl;

use App\DTOs\Jpl\SmallBodyData;
use App\Exceptions\JplApiException;
use Illuminate\Support\Facades\Cache;

final class SmallBodyService
{
    public function __construct(private readonly JplHttpClient $client)
    {
    }

    public function lookup(string $identifier): array
    {
        $lookup = $this->normalizeIdentifier($identifier);
        $key = 'jpl:sbdb:'.md5($lookup['type'].':'.$lookup['value']);

        return Cache::remember($key, (int) config('services.jpl.sbdb_cache_ttl', 86400), function () use ($lookup) {
            $query = [
                $lookup['type'] => $lookup['value'],
                'full-prec' => 'true',
                'phys-par' => 'true',
                'ca-data' => 'true',
                'ca-body' => 'Earth',
                'ca-time' => 'both',
                'ca-tunc' => 'both',
                'discovery' => 'true',
            ];

            $response = $this->client->get('/sbdb.api', $query);

            if (($response['code'] ?? null) === 200 || (($response['message'] ?? null) && ! isset($response['object']))) {
                throw new JplApiException(
                    message: 'JPL object not found.',
                    statusCode: 404,
                    userMessage: 'Não encontramos esse viajante no Small-Body Database. Ele pode ter outra designação no JPL.'
                );
            }

            if (($response['code'] ?? null) === 300) {
                throw new JplApiException(
                    message: 'JPL object lookup is ambiguous.',
                    statusCode: 422,
                    userMessage: 'Essa designação corresponde a mais de um objeto. Retorne à listagem e escolha um registro mais específico.'
                );
            }

            return [
                'smallBody' => SmallBodyData::fromSbdbResponse($response)->toArray(),
                'source' => 'NASA/JPL Small-Body Database API',
                'query' => $query,
            ];
        });
    }

    private function normalizeIdentifier(string $identifier): array
    {
        $value = trim(rawurldecode($identifier));

        if (preg_match('/^\d{7,10}$/', $value) === 1) {
            return ['type' => 'spk', 'value' => $value];
        }

        return ['type' => 'des', 'value' => $value];
    }
}
