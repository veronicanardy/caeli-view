<?php

namespace App\DTOs\Jpl;

final readonly class CloseApproachDetailData
{
    public function __construct(
        public ?string $date,
        public ?string $julianDate,
        public ?string $body,
        public ?float $distanceAu,
        public ?float $distanceMinAu,
        public ?float $distanceMaxAu,
        public ?float $relativeVelocityKmS,
        public ?float $infinityVelocityKmS,
        public ?string $timeUncertainty,
        public ?string $orbitReference,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            date: self::cleanText($data['cd'] ?? null),
            julianDate: self::cleanText($data['jd'] ?? null),
            body: self::cleanText($data['body'] ?? null),
            distanceAu: self::floatOrNull($data['dist'] ?? null),
            distanceMinAu: self::floatOrNull($data['dist_min'] ?? null),
            distanceMaxAu: self::floatOrNull($data['dist_max'] ?? null),
            relativeVelocityKmS: self::floatOrNull($data['v_rel'] ?? null),
            infinityVelocityKmS: self::floatOrNull($data['v_inf'] ?? null),
            timeUncertainty: self::cleanText($data['sigma_tf'] ?? $data['sigma_t'] ?? null),
            orbitReference: self::cleanText($data['orbit_ref'] ?? null),
        );
    }

    public function distanceKm(): ?float
    {
        return $this->distanceAu === null ? null : $this->distanceAu * 149_597_870.7;
    }

    public function distanceLunar(): ?float
    {
        return $this->distanceKm() === null ? null : $this->distanceKm() / 384_400;
    }

    public function relativeVelocityKmH(): ?float
    {
        return $this->relativeVelocityKmS === null ? null : $this->relativeVelocityKmS * 3600;
    }

    public function toArray(): array
    {
        return [
            'date' => $this->date,
            'julianDate' => $this->julianDate,
            'body' => $this->body,
            'distanceAu' => $this->distanceAu,
            'distanceKm' => $this->distanceKm(),
            'distanceLunar' => $this->distanceLunar(),
            'distanceMinAu' => $this->distanceMinAu,
            'distanceMaxAu' => $this->distanceMaxAu,
            'relativeVelocityKmS' => $this->relativeVelocityKmS,
            'relativeVelocityKmH' => $this->relativeVelocityKmH(),
            'infinityVelocityKmS' => $this->infinityVelocityKmS,
            'timeUncertainty' => $this->timeUncertainty,
            'orbitReference' => $this->orbitReference,
        ];
    }

    private static function cleanText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }

    private static function floatOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
