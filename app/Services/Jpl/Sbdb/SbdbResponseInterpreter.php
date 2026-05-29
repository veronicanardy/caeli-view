<?php

namespace App\Services\Jpl\Sbdb;

use App\Exceptions\JplApiException;

/**
 * Interpreta os códigos de resposta da API SBDB e lança a exceção adequada.
 *
 * O SBDB retorna erros semânticos via HTTP 200 com um campo `code` no JSON
 * (diferente dos erros HTTP tratados pelo JplHttpClient). Esta classe isola
 * essa lógica específica do protocolo SBDB para que o SmallBodyService
 * não precise conhecer os detalhes do contrato da API.
 *
 * Códigos conhecidos:
 *   - 200 no corpo (com HTTP 200) → objeto não encontrado
 *   - 300 no corpo → designação ambígua (múltiplos objetos)
 */
final class SbdbResponseInterpreter
{
    /**
     * Verifica a resposta decodificada e lança JplApiException se o SBDB sinalizou erro.
     *
     * Deve ser chamado após o JplHttpClient já ter garantido que a resposta HTTP foi bem-sucedida.
     *
     * @param  array<string, mixed>  $response
     *
     * @throws JplApiException  404 quando o objeto não existe no SBDB
     * @throws JplApiException  422 quando a designação é ambígua
     */
    public function assertFound(array $response): void
    {
        // SBDB sinaliza "não encontrado" com code=200 no corpo (sem campo `object`)
        // ou com uma mensagem sem o objeto esperado.
        if (($response['code'] ?? null) === 200 || (($response['message'] ?? null) && ! isset($response['object']))) {
            throw new JplApiException(
                message: 'JPL object not found.',
                statusCode: 404,
                userMessage: 'Não encontramos esse viajante no Small-Body Database. Ele pode ter outra designação no JPL.',
            );
        }

        // SBDB sinaliza "designação ambígua" com code=300.
        if (($response['code'] ?? null) === 300) {
            throw new JplApiException(
                message: 'JPL object lookup is ambiguous.',
                statusCode: 422,
                userMessage: 'Essa designação corresponde a mais de um objeto. Retorne à listagem e escolha um registro mais específico.',
            );
        }
    }
}
