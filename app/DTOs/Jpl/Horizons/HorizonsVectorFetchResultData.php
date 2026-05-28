<?php

namespace App\DTOs\Jpl\Horizons;

final readonly class HorizonsVectorFetchResultData
{
    /**
     * @param  array<int, HorizonsVectorPointData>|null  $points
     */
    public function __construct(
        public ?array $points,
        public ?string $failureReason,
        public ?HorizonsOrbitalElementsData $elements,
    ) {
    }

    /**
     * @param  array<int, HorizonsVectorPointData>  $points
     */
    public static function available(array $points, ?HorizonsOrbitalElementsData $elements): self
    {
        return new self($points, null, $elements);
    }

    public static function unavailable(?string $failureReason): self
    {
        return new self(null, $failureReason, null);
    }

    /**
     * @return array<int, array<string, float|string|null>>|null
     */
    public function pointsToArray(): ?array
    {
        return $this->points === null
            ? null
            : array_map(static fn (HorizonsVectorPointData $point): array => $point->toArray(), $this->points);
    }

    /**
     * @return array{ec: float, qrAu: float, inDeg: float, omDeg: float, wDeg: float, tpJd: float, epochJd: float}|null
     */
    public function elementsToArray(): ?array
    {
        return $this->elements?->toArray();
    }
}
