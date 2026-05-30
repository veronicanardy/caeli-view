<?php

namespace App\Support\Horizons;

/**
 * Gera a lista de comandos de identificação de objeto para o Horizons (JPL).
 *
 * O Horizons aceita vários formatos de identificador para encontrar um corpo celeste:
 *   - SPK-ID numérico (ex: `2000433` para Eros)
 *   - Número permanente seguido de `;` (ex: `433;`) — força busca exata
 *   - Designação provisória prefixada com `DES=` (ex: `DES=2026 KL2;`)
 *   - Nome próprio em texto livre (ex: `Bennu`)
 *
 * Como cada objeto pode ter múltiplos identificadores válidos, este builder produz
 * uma lista ordenada do mais específico ao mais ambíguo. O serviço de trajetória
 * tenta cada comando em sequência até o Horizons responder com sucesso.
 *
 * @see HorizonsTrajectoryService  Consumidor desta lista de comandos
 */
final class HorizonsCommandBuilder
{
    /**
     * Constrói a lista de comandos de identificação em ordem de especificidade decrescente.
     *
     * Prioridade:
     *   1. SPK-ID direto (identificador numérico único no banco do JPL)
     *   2. Número permanente com `;` (busca exata, evita ambiguidade em nomes parecidos)
     *   3. Designação provisória com prefixo `DES=` (formato canônico do Horizons)
     *   4. Nome próprio em texto livre (mais propenso a colisões)
     *   5. Designação provisória crua (fallback sem prefixo, quando só há designação)
     *
     * @param  array{
     *   permanentNumber: ?string,
     *   properName: ?string,
     *   provisionalDesignation: ?string,
     *   aliases?: array<int, string>
     * }  $identity  Identidade normalizada produzida pelo `AsteroidIdentityNormalizer`
     * @param  string|null  $spkId            SPK-ID do objeto no catálogo JPL, se disponível
     * @param  string|null  $detailIdentifier Identificador usado na rota de detalhe do sistema
     * @param  string|null  $designation      Designação bruta recebida da fonte de dados original
     * @return array<int, string>
     */
    public static function build(array $identity, ?string $spkId = null, ?string $detailIdentifier = null, ?string $designation = null): array
    {
        $commands = [];

        // 1. Número permanente com `;` força busca exata no Horizons pelo número do asteroide.
        // Tem precedência sobre o SPK-ID porque o Horizons resolve SPK-IDs do formato 2000NNN
        // de forma ambígua para alguns objetos, retornando corpos errados. O número permanente
        // com `;` é inequívoco: busca exatamente o asteroide de número NNN.
        $permanentNumber = self::clean($identity['permanentNumber'] ?? null);
        if ($permanentNumber !== null && preg_match('/^\d+$/', $permanentNumber) === 1) {
            self::push($commands, $permanentNumber . ';');
        }

        // 2. SPK-ID — fallback quando não há número permanente (objetos sem numeração oficial)
        self::push($commands, self::clean($spkId));

        // 3. Designação provisória com prefixo DES= (formato canônico do Horizons)
        // Tenta na ordem: identidade normalizada → campo $designation → $detailIdentifier
        $provisionalDesignation = self::clean($identity['provisionalDesignation'] ?? null)
            ?? self::designationCommandValue($designation)
            ?? self::designationCommandValue($detailIdentifier);
        if ($provisionalDesignation !== null) {
            self::push($commands, 'DES=' . $provisionalDesignation . ';');
        }

        // 4. Nome próprio em texto livre
        $properName = self::clean($identity['properName'] ?? null);
        if ($properName !== null) {
            self::push($commands, $properName);
        }

        // 5. Designação crua como último fallback, apenas quando não há número nem nome próprio
        if ($permanentNumber === null && $properName === null && $provisionalDesignation !== null) {
            self::push($commands, $provisionalDesignation);
        }

        return $commands;
    }

    /**
     * Extrai e valida o valor de uma designação provisória a partir de uma string arbitrária.
     *
     * Aceita strings no formato `2026 KL2`, `DES=2026 KL2;` ou variações.
     * Rejeita qualquer coisa que não corresponda ao padrão `AAAA XNN` do MPC
     * (ano + letras + dígitos opcionais), evitando enviar lixo ao Horizons.
     */
    private static function designationCommandValue(?string $value): ?string
    {
        $clean = self::clean($value);
        if ($clean === null) {
            return null;
        }

        // Remove prefixo DES= e sufixo ; caso já estejam presentes
        if (str_starts_with(strtoupper($clean), 'DES=')) {
            $clean = substr($clean, 4);
        }
        $clean = rtrim($clean, ';');

        // Valida o padrão de designação provisória do MPC: ex. "2026 KL2", "1997 XF11"
        return preg_match('/^\d{4}\s+[A-Z]{1,3}\d*[A-Z]?\d*$/i', $clean) === 1 ? $clean : null;
    }

    /**
     * Normaliza espaços e converte para string; retorna `null` para valores vazios.
     */
    private static function clean(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = preg_replace('/\s+/', ' ', trim((string) $value));

        return $clean === '' ? null : $clean;
    }

    /**
     * Adiciona um comando à lista somente se não for nulo e ainda não estiver presente.
     * Garante que a lista não tenha duplicatas mesmo quando múltiplas fontes convergem
     * para o mesmo identificador.
     *
     * @param  array<int, string>  $commands
     */
    private static function push(array &$commands, ?string $command): void
    {
        if ($command === null || in_array($command, $commands, true)) {
            return;
        }

        $commands[] = $command;
    }
}
