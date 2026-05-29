<?php

namespace App\Services\Jpl\Horizons;

use App\Exceptions\JplApiException;
use App\Exceptions\JplRateLimitException;
use App\Exceptions\JplUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Transporte HTTP para a API Horizons do JPL.
 *
 * Responsabilidades:
 *   - Executar requisições GET com ou sem retry interno do Laravel.
 *   - Mapear status HTTP e exceções de conexão para as exceções de domínio do projeto.
 *
 * Não conhece o formato dos parâmetros — recebe o array de query já pronto.
 */
final class HorizonsHttpTransport
{
    private const PATH = '/horizons.api';

    /**
     * Executa a requisição com retry automático configurado em services.jpl.retry_times.
     *
     * Usar quando o caller não implementa backoff próprio.
     *
     * @param  array<string, string>  $query
     * @throws JplUnavailableException
     * @throws JplRateLimitException
     * @throws JplApiException
     */
    public function get(array $query): string
    {
        try {
            $response = Http::baseUrl($this->baseUrl())
                ->timeout($this->timeout())
                ->retry(
                    (int) config('services.jpl.retry_times', 2),
                    (int) config('services.jpl.retry_sleep_ms', 300),
                    throw: false,
                )
                ->get(self::PATH, $query);
        } catch (ConnectionException) {
            Log::warning('JPL Horizons: falha de conexão.', ['path' => self::PATH]);
            throw new JplUnavailableException();
        }

        return $this->decode($response);
    }

    /**
     * Executa uma única tentativa sem retry interno.
     *
     * Usar quando o caller implementa seu próprio backoff (ex.: HorizonsEphemerisRetrier).
     *
     * @param  array<string, string>  $query
     * @throws JplUnavailableException
     * @throws JplRateLimitException
     * @throws JplApiException
     */
    public function getOnce(array $query): string
    {
        try {
            $response = Http::baseUrl($this->baseUrl())
                ->timeout($this->timeout())
                ->get(self::PATH, $query);
        } catch (ConnectionException) {
            Log::warning('JPL Horizons: falha de conexão (tentativa única).', ['path' => self::PATH]);
            throw new JplUnavailableException();
        }

        return $this->decode($response);
    }

    // =========================================================================
    // Helpers privados
    // =========================================================================

    /**
     * Mapeia status HTTP para exceções de domínio.
     *
     * - 429 → JplRateLimitException (rate limit da API)
     * - 5xx → JplUnavailableException (servidor Horizons fora do ar)
     * - outros 4xx/erros → JplApiException
     *
     * @throws JplRateLimitException
     * @throws JplUnavailableException
     * @throws JplApiException
     */
    private function decode(Response $response): string
    {
        if ($response->status() === 429) {
            Log::notice('JPL Horizons: rate limit atingido.', ['path' => self::PATH]);
            throw new JplRateLimitException();
        }

        if ($response->serverError()) {
            Log::warning('JPL Horizons: erro de servidor.', ['path' => self::PATH, 'status' => $response->status()]);
            throw new JplUnavailableException();
        }

        if ($response->failed()) {
            Log::warning('JPL Horizons: requisição falhou.', ['path' => self::PATH, 'status' => $response->status()]);
            throw new JplApiException();
        }

        return $response->body();
    }

    private function baseUrl(): string
    {
        return (string) config('services.jpl.horizons_base_url', 'https://ssd.jpl.nasa.gov/api');
    }

    private function timeout(): int
    {
        return (int) config('services.jpl.timeout', 10);
    }
}
