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
            'projection' => '2D simplified',
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
     * Resultado de posição simbólica — usado quando não há coordenadas reais disponíveis
     * mas ainda podemos exibir a distância de aproximação mais próxima registrada.
     *
     * @param  array<string, mixed>  $object
     */
    public function symbolicPosition(
        string $id,
        array $object,
        string $note,
        string $failureReason,
        ?CarbonImmutable $approachTime = null,
    ): array {
        $approachTime ??= $this->parseTime($object['approachTime'] ?? null);
        $distanceKm = $this->approachDistanceKm($object);
        $distanceLd = $distanceKm !== null ? $distanceKm / DistancePresenter::LUNAR_DISTANCE_KM : null;

        return [
            'id' => $id,
            'status' => 'unavailable',
            'positionKind' => 'symbolic_distance_only',
            'x' => null,
            'y' => null,
            'z' => null,
            'vx' => null,
            'vy' => null,
            'vz' => null,
            'currentPositionTime' => null,
            'closestApproachTime' => $approachTime?->toIso8601String(),
            'closestApproachDistanceKm' => $distanceKm,
            'closestApproachDistanceLD' => $distanceLd,
            'distanceSource' => $this->distanceSourceFor($object, $distanceKm),
            'positionSource' => 'unavailable',
            'failureReason' => $failureReason,
            'horizonsFailureKind' => $this->failureKind($failureReason),
            'note' => $note,
        ];
    }

    /**
     * Resultado de posição real — coordenadas cartesianas obtidas do Horizons,
     * enriquecidas com a distância de aproximação e a fonte dos dados.
     *
     * @param  array<string, mixed>  $chosen  ponto escolhido via closestPointTo
     * @param  array<string, mixed>  $object
     */
    public function availablePosition(
        string $id,
        array $object,
        array $chosen,
        string $mode,
        CarbonImmutable $referenceTime,
        ?CarbonImmutable $approachTime,
    ): array {
        $closestApproachDistanceKm = $mode === 'current'
            ? $this->floatOrNull($chosen['distanceKm'] ?? null)
            : $this->approachDistanceKm($object);

        $closestApproachDistanceLd = $closestApproachDistanceKm !== null
            ? $closestApproachDistanceKm / DistancePresenter::LUNAR_DISTANCE_KM
            : null;

        return [
            'id' => $id,
            'status' => 'available',
            'positionKind' => 'horizons_current',
            'x' => $this->floatOrNull($chosen['x'] ?? null),
            'y' => $this->floatOrNull($chosen['y'] ?? null),
            'z' => $this->floatOrNull($chosen['z'] ?? null),
            'vx' => $this->floatOrNull($chosen['vx'] ?? null),
            'vy' => $this->floatOrNull($chosen['vy'] ?? null),
            'vz' => $this->floatOrNull($chosen['vz'] ?? null),
            'currentPositionTime' => (string) ($chosen['timestamp'] ?? $referenceTime->toIso8601String()),
            'closestApproachTime' => $approachTime?->toIso8601String(),
            'closestApproachDistanceKm' => $closestApproachDistanceKm,
            'closestApproachDistanceLD' => $closestApproachDistanceLd,
            'distanceSource' => $mode === 'current' && $closestApproachDistanceKm !== null
                ? 'JPL Horizons'
                : $this->distanceSourceFor($object, $closestApproachDistanceKm),
            'positionSource' => 'JPL Horizons',
            'failureReason' => null,
            'note' => null,
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
            'projection' => '2D simplified',
            'closestApproachTime' => $approachTime->toIso8601String(),
            'points' => $points,
            'referencePoint' => $referencePoint,
            'motionState' => $motionState,
            'status' => 'available',
            'note' => 'Trajetória baseada em efemérides JPL Horizons e projetada em 2D para visualização.',
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

        return [
            'objectId' => $objectId,
            'objectName' => (string) ($object['displayName'] ?? $object['name'] ?? $objectId),
            'source' => 'JPL Horizons',
            'center' => 'Earth',
            'projection' => '2D simplified',
            'anchor' => 'now',
            'anchorTime' => $now->toIso8601String(),
            'closestApproachTime' => $approachTime?->toIso8601String(),
            'points' => $points,
            'pastPoints' => $pastPoints,
            'futurePoints' => $futurePoints,
            'currentPoint' => $currentPoint,
            'currentDistanceKm' => $currentDistanceKm,
            'currentDistanceLD' => $currentDistanceLd,
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

    /**
     * Retorna a mensagem de nota para o usuário de acordo com o motivo da falha.
     */
    public function noteForFailure(string $reason, string $mode): string
    {
        return match ($reason) {
            'timeout', 'http_error', 'rate_limit'
                => 'Horizons temporariamente indisponível para este objeto. Representação simbólica baseada na distância.',
            'invalid_target', 'no_command_candidates'
                => 'Sem identificador Horizons válido para este objeto. Representação simbólica baseada na distância.',
            'no_ephemeris'
                => 'Objeto sem efemérides publicadas no Horizons neste momento. Pode ser muito recente. Representação simbólica baseada na distância.',
            default => $mode === 'current'
                ? 'Sem efemérides Horizons disponíveis para o horário atual. Representação simbólica baseada na distância.'
                : 'Sem efemérides Horizons disponíveis para o instante da máxima aproximação. Representação simbólica baseada na distância.',
        };
    }

    // -------------------------------------------------------------------------
    // Helpers privados
    // -------------------------------------------------------------------------

    private function approachDistanceKm(array $object): ?float
    {
        $value = $object['nominalDistanceKm'] ?? $object['distanceKm'] ?? null;

        return is_numeric($value) ? (float) $value : null;
    }

    private function distanceSourceFor(array $object, ?float $distanceKm): string
    {
        if ($distanceKm === null) {
            return 'fallback';
        }

        $sourceLabel = strtolower((string) ($object['source'] ?? $object['sourceLabel'] ?? ''));

        if (str_contains($sourceLabel, 'cad')) {
            return 'CAD';
        }
        if (str_contains($sourceLabel, 'neows') || str_contains($sourceLabel, 'neo')) {
            return 'NeoWs';
        }

        return 'fallback';
    }

    private function parseTime(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($value, 'UTC');
        } catch (\Throwable) {
            return null;
        }
    }

    private function floatOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
