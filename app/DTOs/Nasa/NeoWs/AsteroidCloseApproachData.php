<?php

namespace App\DTOs\Nasa\NeoWs;

final readonly class AsteroidCloseApproachData
{
    public function __construct(
        public ?string $date,
        public ?string $dateTime,
        public ?float $velocityKmPerHour,
        public ?float $missDistanceKm,
        public ?float $missDistanceLunar,
        public ?string $orbitingBody,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            date: $data['close_approach_date'] ?? null,
            dateTime: $data['close_approach_date_full'] ?? null,
            velocityKmPerHour: isset($data['relative_velocity']['kilometers_per_hour'])
                ? (float) $data['relative_velocity']['kilometers_per_hour']
                : null,
            missDistanceKm: isset($data['miss_distance']['kilometers'])
                ? (float) $data['miss_distance']['kilometers']
                : null,
            missDistanceLunar: isset($data['miss_distance']['lunar'])
                ? (float) $data['miss_distance']['lunar']
                : null,
            orbitingBody: $data['orbiting_body'] ?? null,
        );
    }

    public function toArray(): array
    {
        return [
            'date' => $this->date,
            'dateTime' => $this->dateTime,
            'velocityKmPerHour' => $this->velocityKmPerHour,
            'missDistanceKm' => $this->missDistanceKm,
            'missDistanceLunar' => $this->missDistanceLunar,
            'orbitingBody' => $this->orbitingBody,
        ];
    }
}
