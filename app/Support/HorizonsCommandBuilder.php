<?php

namespace App\Support;

final class HorizonsCommandBuilder
{
    /**
     * @param  array{
     *   permanentNumber:?string,
     *   properName:?string,
     *   provisionalDesignation:?string,
     *   aliases?:array<int,string>
     * }  $identity
     * @return array<int,string>
     */
    public static function build(array $identity, ?string $spkId = null, ?string $detailIdentifier = null, ?string $designation = null): array
    {
        $commands = [];

        self::push($commands, self::clean($spkId));

        $permanentNumber = self::clean($identity['permanentNumber'] ?? null);
        if ($permanentNumber !== null && preg_match('/^\d+$/', $permanentNumber) === 1) {
            self::push($commands, $permanentNumber.';');
        }

        $provisionalDesignation = self::clean($identity['provisionalDesignation'] ?? null)
            ?? self::designationCommandValue($designation)
            ?? self::designationCommandValue($detailIdentifier);
        if ($provisionalDesignation !== null) {
            self::push($commands, 'DES='.$provisionalDesignation.';');
        }

        $properName = self::clean($identity['properName'] ?? null);
        if ($properName !== null) {
            self::push($commands, $properName);
        }

        if ($permanentNumber === null && $properName === null && $provisionalDesignation !== null) {
            self::push($commands, $provisionalDesignation);
        }

        return $commands;
    }

    private static function designationCommandValue(?string $value): ?string
    {
        $clean = self::clean($value);
        if ($clean === null) {
            return null;
        }

        if (str_starts_with(strtoupper($clean), 'DES=')) {
            $clean = substr($clean, 4);
        }

        $clean = rtrim($clean, ';');

        return preg_match('/^\d{4}\s+[A-Z]{1,3}\d*[A-Z]?\d*$/i', $clean) === 1 ? $clean : null;
    }

    private static function clean(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $clean = preg_replace('/\s+/', ' ', trim((string) $value));

        return $clean === '' ? null : $clean;
    }

    /**
     * @param array<int,string> $commands
     */
    private static function push(array &$commands, ?string $command): void
    {
        if ($command === null || in_array($command, $commands, true)) {
            return;
        }

        $commands[] = $command;
    }
}
