<?php

namespace App\Services\Jpl\Sbdb;

use App\DTOs\Jpl\SmallBodyData;
use App\Exceptions\JplApiException;
use App\Exceptions\JplUnavailableException;
use App\Services\Jpl\JplHttpClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Consulta o Small-Body Database (SBDB) do JPL para detalhes de um objeto específico.
 *
 * Responsabilidades:
 *   - Normalizar o identificador recebido (SPK-ID numérico ou designação textual).
 *   - Gerenciar cache das respostas (TTL configurável em services.jpl.sbdb_cache_ttl).
 *   - Delegar a interpretação dos códigos de resposta SBDB a SbdbResponseInterpreter.
 *   - Expor o SPKID de um objeto por designação (usado como fallback pelo HorizonsEphemerisRetrier).
 */
final class SmallBodyService
{
    public function __construct(
        private readonly JplHttpClient $client,
        private readonly SbdbResponseInterpreter $interpreter,
    ) {
    }

    /**
     * Busca os detalhes completos de um pequeno corpo pelo identificador.
     *
     * O identificador pode ser um SPK-ID numérico (7–10 dígitos) ou qualquer
     * designação aceita pelo SBDB (ex.: "2021 PH27", "433", "C/2020 F3").
     *
     * @return array<string, mixed>
     *
     * @throws JplApiException  404 quando não encontrado, 422 quando ambíguo, 503 quando indisponível
     */
    public function lookup(string $identifier): array
    {
        $lookup = $this->normalizeIdentifier($identifier);
        $key = 'jpl:sbdb:'.md5($lookup['type'].':'.$lookup['value']);

        return Cache::remember($key, (int) config('services.jpl.sbdb_cache_ttl', 86400), function () use ($lookup) {
            $query = [
                $lookup['type'] => $lookup['value'],
                'full-prec'  => 'true',
                'phys-par'   => 'true',
                'ca-data'    => 'true',
                'ca-body'    => 'Earth',
                'ca-time'    => 'both',
                'ca-tunc'    => 'both',
                'discovery'  => 'true',
            ];

            try {
                $response = $this->client->get('/sbdb.api', $query);
            } catch (JplUnavailableException $e) {
                Log::info('SBDB: objeto não encontrado ou ainda não indexado.', ['identifier' => $lookup['value']]);
                throw new JplApiException(
                    message: $e->getMessage(),
                    statusCode: 503,
                    userMessage: 'O JPL não conseguiu carregar este objeto. Objetos descobertos recentemente podem levar dias para aparecer no SBDB. Tente novamente mais tarde.',
                );
            }

            $this->interpreter->assertFound($response);

            return [
                'smallBody' => SmallBodyData::fromSbdbResponse($response)->toArray(),
                'source'    => 'NASA/JPL Small-Body Database API',
                'query'     => $query,
            ];
        });
    }

    /**
     * Retorna o SPKID de um objeto pela sua designação, ou null em qualquer falha.
     *
     * Usado pelo HorizonsEphemerisRetrier como fallback quando os candidatos de
     * comando normais não produzem efemérides (falha transiente na API Horizons).
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

    // =========================================================================
    // Helpers privados
    // =========================================================================

    /**
     * Determina o tipo de parâmetro de consulta pelo formato do identificador.
     *
     * SPK-IDs são inteiros de 7 a 10 dígitos; qualquer outra string é tratada
     * como designação ('des'), que o SBDB aceita em vários formatos.
     *
     * @return array{type: string, value: string}
     */
    private function normalizeIdentifier(string $identifier): array
    {
        $value = trim(rawurldecode($identifier));

        if (preg_match('/^\d{7,10}$/', $value) === 1) {
            return ['type' => 'spk', 'value' => $value];
        }

        return ['type' => 'des', 'value' => $value];
    }
}
