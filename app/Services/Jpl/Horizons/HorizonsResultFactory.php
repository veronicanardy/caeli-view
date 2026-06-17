<?php

namespace App\Services\Jpl\Horizons;

use App\Support\DistancePresenter;
use Carbon\CarbonImmutable;

/**
 * Monta os arrays de resposta padronizados para trajetória e posição de objetos Horizons.
 *
 * Centraliza o contrato de dados enviado ao frontend, separando a construção
 * de payload da lógica de orquestração e cache do service.
 */
final class HorizonsResultFactory
{
    /**
     * Resultado de trajetória indisponível — retornado quando não há efemérides publicadas
     * ou o Horizons está temporariamente fora do ar.
     *
     * @param  array<string, mixed>  $object
     */
    public function unavailableTrajectory(
        array $object,
        string $objectId,
        string $note,
        string $failureReason = 'no_ephemeris',
        ?CarbonImmutable $approachTime = null,
    ): array {
        return [
            'objectId' => $objectId,
            'objectName' => (string) ($object['displayName'] ?? $object['name'] ?? 'Objeto monitorado'),
            'source' => 'JPL Horizons',
            'center' => 'Earth',
            'projection' => '3D ecliptic J2000',
            'closestApproachTime' => $approachTime?->toIso8601String() ?? (string) ($object['approachTime'] ?? ''),
            'points' => [],
            'referencePoint' => null,
            'motionState' => 'unknown',
            'status' => 'unavailable',
            'horizonsFailureKind' => $this->failureKind($failureReason),
            'note' => $note,
        ];
    }

    /**
     * Resultado de trajetória completa (janela ±2 dias em torno da aproximação máxima).
     *
     * @param  array<string, mixed>  $object
     * @param  array<int, array<string, mixed>>  $points
     * @param  array<string, mixed>|null  $referencePoint
     * @param  array<string, mixed>|null  $closestPoint
     */
    public function availableTrajectory(
        array $object,
        string $objectId,
        CarbonImmutable $approachTime,
        array $points,
        ?array $referencePoint,
        ?array $closestPoint,
        string $motionState,
    ): array {
        return [
            'objectId' => $objectId,
            'objectName' => (string) ($object['displayName'] ?? $object['name'] ?? $objectId),
            'source' => 'JPL Horizons',
            'center' => 'Earth',
            'projection' => '3D ecliptic J2000',
            'closestApproachTime' => $approachTime->toIso8601String(),
            'points' => $points,
            'referencePoint' => $referencePoint,
            'motionState' => $motionState,
            'status' => 'available',
            'note' => 'Trajetória baseada em efemérides JPL Horizons em coordenadas eclípticas J2000 (3D).',
        ];
    }

    /**
     * Resultado de trajetória ancorada no instante atual (radar "5 mais próximos agora").
     *
     * @param  array<string, mixed>  $object
     * @param  array<int, array<string, mixed>>  $points
     * @param  array<int, array<string, mixed>>  $pastPoints
     * @param  array<int, array<string, mixed>>  $futurePoints
     * @param  array<string, mixed>|null  $currentPoint
     * @param  array<string, mixed>|null  $orbitalElements
     */
    public function availableNowTrajectory(
        array $object,
        string $objectId,
        CarbonImmutable $now,
        ?CarbonImmutable $approachTime,
        array $points,
        array $pastPoints,
        array $futurePoints,
        ?array $currentPoint,
        ?array $orbitalElements,
        string $motionState,
    ): array {
        $currentDistanceKm = $this->floatOrNull($currentPoint['distanceKm'] ?? null);
        $currentDistanceLd = $currentDistanceKm !== null
            ? $currentDistanceKm / DistancePresenter::LUNAR_DISTANCE_KM
            : null;

        $vx = $this->floatOrNull($currentPoint['vx'] ?? null);
        $vy = $this->floatOrNull($currentPoint['vy'] ?? null);
        $vz = $this->floatOrNull($currentPoint['vz'] ?? null);
        $currentVelocityKph = ($vx !== null && $vy !== null && $vz !== null)
            ? sqrt($vx ** 2 + $vy ** 2 + $vz ** 2) * 3600.0
            : null;

        return [
            'objectId' => $objectId,
            'objectName' => (string) ($object['displayName'] ?? $object['name'] ?? $objectId),
            'source' => 'JPL Horizons',
            'center' => 'Earth',
            'projection' => '3D ecliptic J2000',
            'anchor' => 'now',
            'anchorTime' => $now->toIso8601String(),
            'closestApproachTime' => $approachTime?->toIso8601String(),
            'points' => $points,
            'pastPoints' => $pastPoints,
            'futurePoints' => $futurePoints,
            'currentPoint' => $currentPoint,
            'currentDistanceKm' => $currentDistanceKm,
            'currentDistanceLD' => $currentDistanceLd,
            'currentVelocityKph' => $currentVelocityKph,
            'referencePoint' => $currentPoint,
            'motionState' => $motionState,
            // Elementos orbitais osculadores heliocentricos do cabeçalho Horizons,
            // usados pelo frontend para desenhar a órbita completa ao redor do Sol.
            'orbitalElements' => $orbitalElements,
            'status' => 'available',
            'note' => 'Trajetória baseada em vetores JPL/Horizons.',
        ];
    }

    /**
     * Mapeia o motivo de falha para a string de tipo usada pelo frontend
     * ao escolher o label de status adequado.
     */
    public function failureKind(string $reason): string
    {
        return match ($reason) {
            'timeout', 'http_error', 'rate_limit' => 'horizons_transient',
            'no_ephemeris' => 'no_ephemeris',
            'invalid_target', 'no_command_candidates' => 'no_orbital_data',
            default => 'symbolic',
        };
    }

    // -------------------------------------------------------------------------
    // Helpers privados
    // -------------------------------------------------------------------------

    private function floatOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
