<?php

namespace App\DTOs\Jpl\Horizons;

final readonly class HorizonsVectorPointData
{
    public function __construct(
        public string $timestamp,
        public float $x,
        public float $y,
        public float $z,
        public ?float $vx,
        public ?float $vy,
        public ?float $vz,
        public ?float $rangeKm,
        public ?float $rangeRateKmS,
        public float $distanceKm,
        public float $distanceLunar,
    ) {
    }

    /**
     * External JSON contract stays array-based; this DTO is only an internal seam.
     *
     * @return array<string, float|string|null>
     */
    public function toArray(): array
    {
        return [
            'timestamp' => $this->timestamp,
            'x' => $this->x,
            'y' => $this->y,
            'z' => $this->z,
            'vx' => $this->vx,
            'vy' => $this->vy,
            'vz' => $this->vz,
            'rangeKm' => $this->rangeKm,
            'rangeRateKmS' => $this->rangeRateKmS,
            'distanceKm' => $this->distanceKm,
            'distanceLunar' => $this->distanceLunar,
        ];
    }
}
