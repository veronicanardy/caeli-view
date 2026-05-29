<?php

namespace App\Services\Jpl\Horizons;

use App\Support\Horizons\AsteroidIdentityNormalizer;
use App\Support\Horizons\HorizonsCommandBuilder;

/**
 * Resolve a identidade de um objeto para uso na API Horizons.
 *
 * Encapsula a lógica de extrair identificadores do array de aproximação
 * e montar os candidatos de comando para consulta no Horizons.
 */
final class HorizonsObjectIdentity
{
    /**
     * Retorna um identificador estável para o objeto, preferindo campos mais confiáveis.
     *
     * @param  array<string, mixed>  $object
     */
    public function resolveId(array $object): string
    {
        return (string) (
            $object['id']
            ?? $object['spkId']
            ?? $object['detailIdentifier']
            ?? $object['designation']
            ?? md5((string) json_encode($object))
        );
    }

    /**
     * Extrai a designação provisória ou fallback para busca no SBDB.
     *
     * @param  array<string, mixed>  $object
     * @param  array<string, mixed>  $identity
     */
    public function resolveDesignation(array $object, array $identity): ?string
    {
        $provisional = $identity['provisionalDesignation'] ?? null;
        if ($provisional !== null) {
            return $provisional;
        }

        $des = trim((string) ($object['designation'] ?? $object['detailIdentifier'] ?? ''));

        return $des !== '' ? $des : null;
    }

    /**
     * Normaliza a identidade do objeto e monta a lista de comandos candidatos
     * para tentar na API Horizons (em ordem de preferência).
     *
     * @param  array<string, mixed>  $object
     * @return array<int, string>
     */
    public function buildCommandCandidates(array $object): array
    {
        $identity = AsteroidIdentityNormalizer::normalize(
            (string) ($object['rawName'] ?? $object['name'] ?? '')
        );

        return HorizonsCommandBuilder::build(
            $identity,
            $this->parseTrustedSpkId($object['spkId'] ?? null),
            (string) ($object['detailIdentifier'] ?? ''),
            (string) ($object['designation'] ?? ''),
        );
    }

    /**
     * Normaliza a identidade do objeto e retorna tanto os candidatos quanto o array de identidade.
     *
     * @param  array<string, mixed>  $object
     * @return array{commands: array<int, string>, identity: array<string, mixed>}
     */
    public function buildCommandCandidatesWithIdentity(array $object): array
    {
        $identity = AsteroidIdentityNormalizer::normalize(
            (string) ($object['rawName'] ?? $object['name'] ?? '')
        );

        $commands = HorizonsCommandBuilder::build(
            $identity,
            $this->parseTrustedSpkId($object['spkId'] ?? null),
            (string) ($object['detailIdentifier'] ?? ''),
            (string) ($object['designation'] ?? ''),
        );

        return ['commands' => $commands, 'identity' => $identity];
    }

    /**
     * Valida que o SPKID é um número puro com pelo menos 4 dígitos antes de confiar nele.
     * Strings como "2021-xyz" ou vazias são rejeitadas.
     */
    private function parseTrustedSpkId(mixed $value): ?string
    {
        $spkId = trim((string) $value);

        return preg_match('/^\d{4,}$/', $spkId) === 1 ? $spkId : null;
    }
}
