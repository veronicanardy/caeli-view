<?php

namespace App\Services\Jpl;

use App\Exceptions\JplApiException;
use App\Exceptions\JplRateLimitException;
use App\Exceptions\JplUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente HTTP genérico para as APIs JSON do JPL (CAD, SBDB, etc.).
 *
 * Responsabilidades:
 *   - Executar requisições GET com retry automático configurável.
 *   - Mapear status HTTP e erros de conexão para as exceções de domínio do projeto.
 *   - Garantir que a resposta é um array JSON válido antes de retornar.
 *
 * Para a API Horizons (formato texto), use HorizonsClient + HorizonsHttpTransport.
 */
final class JplHttpClient
{
    /**
     * Executa um GET JSON com retry automático e retorna o array decodificado.
     *
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     *
     * @throws JplUnavailableException  quando há falha de conexão ou erro 5xx
     * @throws JplRateLimitException    quando o servidor retorna 429
     * @throws JplApiException          quando a resposta é inválida ou outro erro HTTP
     */
    public function get(string $path, array $query = []): array
    {
        try {
            $response = Http::baseUrl(config('services.jpl.base_url'))
                ->acceptJson()
                ->timeout((int) config('services.jpl.timeout', 10))
                ->retry(
                    (int) config('services.jpl.retry_times', 2),
                    (int) config('services.jpl.retry_sleep_ms', 300),
                    throw: false,
                )
                ->get($path, $query);
        } catch (ConnectionException) {
            Log::warning('JPL API: falha de conexão.', ['path' => $path]);
            throw new JplUnavailableException();
        }

        return $this->decode($response, $path);
    }

    // =========================================================================
    // Helpers privados
    // =========================================================================

    /**
     * Valida a resposta HTTP e decodifica o corpo JSON.
     *
     * Mapeamento de status:
     *   - 429 → JplRateLimitException
     *   - 5xx → JplUnavailableException
     *   - outros erros ou JSON inválido → JplApiException
     *
     * @return array<string, mixed>
     *
     * @throws JplRateLimitException
     * @throws JplUnavailableException
     * @throws JplApiException
     */
    private function decode(Response $response, string $path): array
    {
        if ($response->status() === 429) {
            Log::notice('JPL API: rate limit atingido.', ['path' => $path]);
            throw new JplRateLimitException();
        }

        if ($response->serverError()) {
            Log::warning('JPL API: erro de servidor.', [
                'path'   => $path,
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new JplUnavailableException();
        }

        if ($response->failed()) {
            Log::warning('JPL API: requisição falhou.', ['path' => $path, 'status' => $response->status()]);
            throw new JplApiException();
        }

        $json = $response->json();

        if (! is_array($json)) {
            Log::warning('JPL API: resposta não é JSON válido.', ['path' => $path, 'status' => $response->status()]);
            throw new JplApiException('JPL API retornou JSON inválido.');
        }

        return $json;
    }
}
