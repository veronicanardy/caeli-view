<?php

namespace App\Support\Horizons;

/**
 * Analisa o nome bruto de um asteroide e extrai suas partes de identidade.
 *
 * Asteroides têm nomes compostos seguindo convenções do MPC (Minor Planet Center):
 *   - Número permanente: atribuído após a órbita ser confirmada (ex: `433`)
 *   - Nome próprio: dado pela descobridora após numeração (ex: `Eros`)
 *   - Designação provisória: atribuída no momento da descoberta (ex: `2026 KL2`)
 *
 * Formatos típicos recebidos das APIs:
 *   - `"433 Eros"`                     → número + nome próprio
 *   - `"433 Eros (1898 DQ)"`           → número + nome + designação entre parênteses
 *   - `"2026 KL2"`                      → só designação provisória
 *   - `"(2026 KL2)"`                    → designação entre parênteses
 *   - `"99942 Apophis (2004 MN4)"`     → número + nome + designação
 *   - `"Bennu"`                         → só nome próprio (objeto já numerado e famoso)
 *
 * A saída normalizada é usada em todo o sistema para exibição consistente e como
 * entrada para o `HorizonsCommandBuilder` montar os identificadores de busca no JPL.
 *
 * @see HorizonsCommandBuilder  Usa a identidade normalizada para gerar comandos do Horizons
 */
final class AsteroidIdentityNormalizer
{
    /**
     * Analisa `$rawName` e retorna a identidade decomposta.
     *
     * @return array{
     *   rawName: string,
     *   permanentNumber: ?string,
     *   properName: ?string,
     *   provisionalDesignation: ?string,
     *   displayName: string,
     *   subtitle: ?string,
     *   aliases: array<int, string>
     * }
     */
    public static function normalize(string $rawName): array
    {
        $raw                    = trim($rawName);
        $permanentNumber        = null;
        $properName             = null;
        $provisionalDesignation = null;

        // Padrão MPC para designação provisória: AAAA XNN (ano + letras + dígitos opcionais)
        // Exemplos válidos: "2026 KL2", "1997 XF11", "2004 MN4"
        $designationPattern = '/^\d{4}\s+[A-Z]{1,3}\d*[A-Z]?\d*$/i';

        if (preg_match('/^\(([^)]+)\)$/', $raw, $onlyDesignation) === 1) {
            // Caso: "(2026 KL2)" — só designação provisória entre parênteses
            $provisionalDesignation = self::cleanToken($onlyDesignation[1]);

        } elseif (preg_match($designationPattern, $raw) === 1) {
            // Caso: "2026 KL2" — só designação provisória, sem parênteses
            $provisionalDesignation = self::cleanToken($raw);

        } elseif (preg_match('/^(\d+)\s+(.+?)(?:\s*\(([^)]+)\))?$/', $raw, $numbered) === 1) {
            // Caso: "433 Eros", "433 Eros (1898 DQ)", "99942 Apophis (2004 MN4)"
            // Grupo 1 = número permanente, grupo 2 = corpo do nome, grupo 3 = conteúdo entre parênteses
            $permanentNumber = self::cleanToken($numbered[1]);
            $middle          = self::cleanToken($numbered[2]);
            $paren           = isset($numbered[3]) ? self::cleanToken($numbered[3]) : null;

            // Alguns nomes chegam com o nome próprio também entre parênteses: "433 (Eros)"
            if ($middle !== null && preg_match('/^\(([^)]+)\)$/', $middle, $middleParens) === 1) {
                $middle = null;
                $paren  = self::cleanToken($middleParens[1]) ?? $paren;
            }

            if ($paren !== null) {
                $provisionalDesignation = $paren;
            }

            if ($middle !== null && ! preg_match($designationPattern, $middle)) {
                // O conteúdo do grupo 2 não é designação provisória → é nome próprio
                $properName = $middle;
            } elseif ($provisionalDesignation === null && $middle !== null && preg_match($designationPattern, $middle) === 1) {
                // O conteúdo do grupo 2 É uma designação provisória (ex: "433 2026 KL2" — raro mas possível)
                $provisionalDesignation = $middle;
            }

        } elseif (preg_match('/\(([^)]+)\)/', $raw, $inParens) === 1) {
            // Caso: "Algum nome (2026 KL2)" — nome livre com designação entre parênteses
            $provisionalDesignation = self::cleanToken($inParens[1]);
        }

        // Se após todos os casos ainda não há nome próprio, trata o nome bruto inteiro como tal —
        // exceto quando é só um número permanente isolado ou já temos designação provisória.
        if ($properName === null && preg_match('/^([1-9]\d*)\s*$/', $raw) !== 1 && $provisionalDesignation === null) {
            $bare       = preg_replace('/\s+/', ' ', trim($raw));
            $properName = $bare !== '' ? $bare : null;
        }

        // Nome de exibição: prioridade para nome próprio → designação → número → fallback
        $displayName = $properName
            ?? $provisionalDesignation
            ?? ($permanentNumber !== null ? 'Objeto ' . $permanentNumber : ($raw !== '' ? self::stripOuterParens($raw) : 'Objeto monitorado'));

        // Subtítulo exibido abaixo do nome principal nos cards, compondo os identificadores secundários
        $subtitle = null;
        if ($properName !== null && $permanentNumber !== null && $provisionalDesignation !== null) {
            $subtitle = $permanentNumber . ' · designação ' . $provisionalDesignation;
        } elseif ($properName !== null && $permanentNumber !== null) {
            $subtitle = 'Objeto numerado ' . $permanentNumber;
        } elseif ($permanentNumber !== null && $provisionalDesignation !== null) {
            $subtitle = 'Objeto numerado ' . $permanentNumber;
        } elseif ($provisionalDesignation !== null) {
            $subtitle = 'Designação provisória';
        }

        $aliases = self::aliases($permanentNumber, $properName, $provisionalDesignation, $displayName);

        return [
            'rawName'                => $raw !== '' ? $raw : 'Objeto monitorado',
            'permanentNumber'        => $permanentNumber,
            'properName'             => $properName,
            'provisionalDesignation' => $provisionalDesignation,
            'displayName'            => $displayName,
            'subtitle'               => $subtitle,
            'aliases'                => $aliases,
        ];
    }

    /**
     * Constrói a lista de aliases do objeto — todas as formas válidas de referenciá-lo.
     * Usada pelo sistema de busca e pelo `HorizonsCommandBuilder` para tentar múltiplos identificadores.
     * Duplicatas são removidas mantendo a ordem de inserção.
     */
    private static function aliases(?string $number, ?string $properName, ?string $provisional, string $display): array
    {
        $items = [];

        if ($number !== null)                              { $items[] = $number; }
        if ($properName !== null)                          { $items[] = $properName; }
        if ($number !== null && $properName !== null)      { $items[] = $number . ' ' . $properName; }
        if ($provisional !== null)                         { $items[] = $provisional; }
        if ($number !== null && $provisional !== null)     { $items[] = $number . ' ' . $provisional; }

        $items[] = $display;

        $normalized = [];
        foreach ($items as $item) {
            $value = preg_replace('/\s+/', ' ', trim((string) $item));
            if ($value === '' || in_array($value, $normalized, true)) {
                continue;
            }
            $normalized[] = $value;
        }

        return $normalized;
    }

    /**
     * Normaliza espaços internos e retorna `null` para strings vazias.
     */
    private static function cleanToken(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = preg_replace('/\s+/', ' ', trim($value));

        return $clean === '' ? null : $clean;
    }

    /**
     * Remove parênteses externos de uma string, se presentes.
     * Ex: `"(2026 KL2)"` → `"2026 KL2"`. Strings sem parênteses externos são retornadas intactas.
     */
    private static function stripOuterParens(string $value): string
    {
        if (preg_match('/^\(([^)]+)\)$/', trim($value), $matches) === 1) {
            return trim($matches[1]);
        }

        return trim($value);
    }
}
