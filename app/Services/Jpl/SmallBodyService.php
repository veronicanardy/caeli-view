<?php

namespace App\Services\Jpl;

use App\DTOs\Jpl\SmallBodyData;
use App\Exceptions\JplApiException;
use App\Exceptions\JplUnavailableException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

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

            try {
                $response = $this->client->get('/sbdb.api', $query);
            } catch (JplUnavailableException $e) {
                Log::info('SBDB lookup failed for identifier (may be too new for SBDB).', ['identifier' => $lookup['value']]);
                throw new JplApiException(
                    message: $e->getMessage(),
                    statusCode: 503,
                    userMessage: 'O JPL não conseguiu carregar este objeto. Objetos descobertos recentemente podem levar dias para aparecer no SBDB. Tente novamente mais tarde.'
                );
            }

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

    /**
     * Looks up the SPKID for a designation via the SBDB API.
     * Returns null on any failure so callers can fall through gracefully.
     */
    public function spkIdFor(string $designation): ?string
    {
        $key = 'jpl:sbdb:spkid:'.md5($designation);

        try {
            $spkId = Cache::remember($key, (int) config('services.jpl.sbdb_cache_ttl', 86400), function () use ($designation) {
                $response = $this->client->get('/sbdb.api', ['des' => $designation]);
                $spkId = trim((string) ($response['object']['spkid'] ?? ''));
                return $spkId !== '' ? $spkId : null;
            });
        } catch (\Throwable) {
            return null;
        }

        return is_string($spkId) && $spkId !== '' ? $spkId : null;
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
