<?php

namespace App\Services\Nasa;

use App\Exceptions\NasaApiException;
use App\Exceptions\NasaRateLimitException;
use App\Exceptions\NasaUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cliente HTTP base para todas as requisições à API da NASA.
 *
 * Centraliza configuração de chave de API, timeout, retry e tratamento de erros HTTP,
 * para que os services individuais (NeoWs, APOD, EPIC) não precisem repetir essa lógica.
 *
 * Todos os parâmetros de conexão são lidos de `config/services.php` (prefixo `nasa`):
 *   - `base_url`      URL base da API
 *   - `api_key`       Chave da NASA (obrigatória; vem de NASA_API_KEY no .env)
 *   - `timeout`       Timeout em segundos (padrão: 8)
 *   - `retry_times`   Número de tentativas em caso de falha (padrão: 2)
 *   - `retry_sleep_ms` Intervalo entre tentativas em milissegundos (padrão: 250)
 */
final class NasaHttpClient
{
    /**
     * Executa uma requisição GET autenticada e retorna o JSON decodificado como array.
     *
     * @param  string  $path   Caminho relativo à base URL (ex: `/neo/rest/v1/feed`)
     * @param  array   $query  Parâmetros de query string; `api_key` é injetado automaticamente
     *
     * @throws NasaApiException         Se a chave não estiver configurada ou a resposta for inválida
     * @throws NasaRateLimitException   Se a NASA retornar HTTP 429
     * @throws NasaUnavailableException Se houver falha de conexão ou erro de servidor (5xx)
     */
    public function get(string $path, array $query = []): array
    {
        $apiKey = config('services.nasa.api_key');

        if (blank($apiKey)) {
            throw new NasaApiException('NASA API key is not configured.', 500, 'Configure a NASA_API_KEY no arquivo .env para consultar dados reais da NASA.');
        }

        try {
            $retryTimes   = (int) config('services.nasa.retry_times', 2);
            $retrySleepMs = (int) config('services.nasa.retry_sleep_ms', 250);

            $response = Http::baseUrl(config('services.nasa.base_url'))
                ->acceptJson()
                ->timeout((int) config('services.nasa.timeout', 8))
                ->retry($retryTimes, $retrySleepMs, throw: false)
                ->get($path, array_merge($query, ['api_key' => $apiKey]));
        } catch (ConnectionException) {
            Log::warning('Falha de conexão com a API da NASA.', ['path' => $path]);
            throw new NasaUnavailableException();
        }

        return $this->decode($response, $path);
    }

    /**
     * Interpreta o status HTTP da resposta e lança a exceção adequada em caso de erro.
     * Retorna o corpo JSON como array em caso de sucesso.
     */
    private function decode(Response $response, string $path): array
    {
        if ($response->status() === 429) {
            Log::notice('Limite de requisições da API da NASA atingido.', ['path' => $path]);
            throw new NasaRateLimitException();
        }

        if ($response->serverError()) {
            Log::warning('Erro de servidor na API da NASA.', ['path' => $path, 'status' => $response->status()]);
            throw new NasaUnavailableException();
        }

        if ($response->failed()) {
            Log::warning('Requisição à API da NASA falhou.', ['path' => $path, 'status' => $response->status()]);
            throw new NasaApiException();
        }

        $json = $response->json();

        if (! is_array($json)) {
            Log::warning('API da NASA retornou JSON inválido.', ['path' => $path, 'status' => $response->status()]);
            throw new NasaApiException('NASA API invalid JSON.');
        }

        return $json;
    }
}
