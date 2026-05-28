<?php

namespace App\DTOs\Nasa\NeoWs;

final readonly class AsteroidData
{
    /**
     * @param array<int, AsteroidCloseApproachData> $closeApproaches
     */
    public function __construct(
        public string $id,
        public string $name,
        public ?string $nasaJplUrl,
        public ?float $estimatedDiameterMinKm,
        public ?float $estimatedDiameterMaxKm,
        public bool $potentiallyHazardous,
        public array $closeApproaches,
    ) {
    }

    public static function fromArray(array $data): self
    {
        $diameter = $data['estimated_diameter']['kilometers'] ?? [];

        return new self(
            id: (string) ($data['id'] ?? ''),
            name: (string) ($data['name'] ?? 'Asteroide sem nome'),
            nasaJplUrl: $data['nasa_jpl_url'] ?? null,
            estimatedDiameterMinKm: isset($diameter['estimated_diameter_min']) ? (float) $diameter['estimated_diameter_min'] : null,
            estimatedDiameterMaxKm: isset($diameter['estimated_diameter_max']) ? (float) $diameter['estimated_diameter_max'] : null,
            potentiallyHazardous: (bool) ($data['is_potentially_hazardous_asteroid'] ?? false),
            closeApproaches: array_map(
                fn (array $approach) => AsteroidCloseApproachData::fromArray($approach),
                $data['close_approach_data'] ?? []
            ),
        );
    }

    public function averageDiameterKm(): ?float
    {
        if ($this->estimatedDiameterMinKm === null || $this->estimatedDiameterMaxKm === null) {
            return null;
        }

        return ($this->estimatedDiameterMinKm + $this->estimatedDiameterMaxKm) / 2;
    }

    public function primaryApproach(): ?AsteroidCloseApproachData
    {
        return $this->closeApproaches[0] ?? null;
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'nasaJplUrl' => $this->nasaJplUrl,
            'estimatedDiameterMinKm' => $this->estimatedDiameterMinKm,
            'estimatedDiameterMaxKm' => $this->estimatedDiameterMaxKm,
            'averageDiameterKm' => $this->averageDiameterKm(),
            'potentiallyHazardous' => $this->potentiallyHazardous,
            'primaryApproach' => $this->primaryApproach()?->toArray(),
            'closeApproaches' => array_map(fn (AsteroidCloseApproachData $approach) => $approach->toArray(), $this->closeApproaches),
        ];
    }
}
