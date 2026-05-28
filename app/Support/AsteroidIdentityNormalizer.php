<?php

namespace App\Support;

final class AsteroidIdentityNormalizer
{
    /**
     * @return array{
     *   rawName:string,
     *   permanentNumber:?string,
     *   properName:?string,
     *   provisionalDesignation:?string,
     *   displayName:string,
     *   subtitle:?string,
     *   aliases:array<int,string>
     * }
     */
    public static function normalize(string $rawName): array
    {
        $raw = trim($rawName);
        $permanentNumber = null;
        $properName = null;
        $provisionalDesignation = null;

        $designationPattern = '/^\d{4}\s+[A-Z]{1,3}\d*[A-Z]?\d*$/i';

        if (preg_match('/^\(([^)]+)\)$/', $raw, $onlyDesignation) === 1) {
            $provisionalDesignation = self::cleanToken($onlyDesignation[1]);
        } elseif (preg_match($designationPattern, $raw) === 1) {
            $provisionalDesignation = self::cleanToken($raw);
        } elseif (preg_match('/^(\d+)\s+(.+?)(?:\s*\(([^)]+)\))?$/', $raw, $numbered) === 1) {
            $permanentNumber = self::cleanToken($numbered[1]);
            $middle = self::cleanToken($numbered[2]);
            $paren = isset($numbered[3]) ? self::cleanToken($numbered[3]) : null;

            if ($middle !== null && preg_match('/^\(([^)]+)\)$/', $middle, $middleParens) === 1) {
                $middle = null;
                $paren = self::cleanToken($middleParens[1]) ?? $paren;
            }

            if ($paren !== null) {
                $provisionalDesignation = $paren;
            }

            if ($middle !== null && !preg_match($designationPattern, $middle)) {
                $properName = $middle;
            } elseif ($provisionalDesignation === null && $middle !== null && preg_match($designationPattern, $middle)) {
                $provisionalDesignation = $middle;
            }
        } elseif (preg_match('/\(([^)]+)\)/', $raw, $inParens) === 1) {
            $provisionalDesignation = self::cleanToken($inParens[1]);
        }

        if ($properName === null && preg_match('/^([1-9]\d*)\s*$/', $raw) !== 1 && $provisionalDesignation === null) {
            $bare = preg_replace('/\s+/', ' ', trim($raw));
            $properName = $bare !== '' ? $bare : null;
        }

        $displayName = $properName
            ?? $provisionalDesignation
            ?? ($permanentNumber !== null ? 'Objeto '.$permanentNumber : ($raw !== '' ? self::stripOuterParens($raw) : 'Objeto monitorado'));

        $subtitle = null;
        if ($properName !== null && $permanentNumber !== null && $provisionalDesignation !== null) {
            $subtitle = $permanentNumber.' · designação '.$provisionalDesignation;
        } elseif ($properName !== null && $permanentNumber !== null) {
            $subtitle = 'Objeto numerado '.$permanentNumber;
        } elseif ($permanentNumber !== null && $provisionalDesignation !== null) {
            $subtitle = 'Objeto numerado '.$permanentNumber;
        } elseif ($provisionalDesignation !== null) {
            $subtitle = 'Designação provisória';
        }

        $aliases = self::aliases($permanentNumber, $properName, $provisionalDesignation, $displayName);

        return [
            'rawName' => $raw !== '' ? $raw : 'Objeto monitorado',
            'permanentNumber' => $permanentNumber,
            'properName' => $properName,
            'provisionalDesignation' => $provisionalDesignation,
            'displayName' => $displayName,
            'subtitle' => $subtitle,
            'aliases' => $aliases,
        ];
    }

    private static function aliases(?string $number, ?string $properName, ?string $provisional, string $display): array
    {
        $items = [];
        if ($number !== null) {
            $items[] = $number;
        }
        if ($properName !== null) {
            $items[] = $properName;
        }
        if ($number !== null && $properName !== null) {
            $items[] = $number.' '.$properName;
        }
        if ($provisional !== null) {
            $items[] = $provisional;
        }
        if ($number !== null && $provisional !== null) {
            $items[] = $number.' '.$provisional;
        }
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

    private static function cleanToken(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $clean = preg_replace('/\s+/', ' ', trim($value));

        return $clean === '' ? null : $clean;
    }

    private static function stripOuterParens(string $value): string
    {
        if (preg_match('/^\(([^)]+)\)$/', trim($value), $matches) === 1) {
            return trim($matches[1]);
        }

        return trim($value);
    }
}
