<?php

namespace App\DTOs\Jpl;

final readonly class CloseApproachData
{
    public function __construct(
        public string $designation,
        public ?string $fullName,
        public ?string $spkId,
        public ?string $orbitId,
        public ?string $julianDate,
        public ?string $calendarDate,
        public ?float $distanceAu,
        public ?float $distanceMinAu,
        public ?float $distanceMaxAu,
        public ?float $relativeVelocityKmS,
        public ?float $infinityVelocityKmS,
        public ?string $timeUncertainty,
        public ?string $approachBody,
        public ?float $absoluteMagnitude,
        public ?float $diameterKm,
        public ?float $diameterSigmaKm,
        public string $objectType,
    ) {
    }

    public static function fromCadRecord(array $fields, array $record, ?string $fallbackBody = null, ?string $forcedType = null): self
    {
        $values = array_combine($fields, array_pad($record, count($fields), null)) ?: [];
        $designation = trim((string) ($values['des'] ?? ''));
        $fullName = self::cleanText($values['fullname'] ?? null);
        $type = $forcedType ?: self::inferObjectType($designation, $fullName);

        return new self(
            designation: $designation,
            fullName: $fullName,
            spkId: isset($values['spkid']) ? trim((string) $values['spkid']) : null,
            orbitId: isset($values['orbit_id']) ? trim((string) $values['orbit_id']) : null,
            julianDate: isset($values['jd']) ? trim((string) $values['jd']) : null,
            calendarDate: self::cleanText($values['cd'] ?? null),
            distanceAu: self::floatOrNull($values['dist'] ?? null),
            distanceMinAu: self::floatOrNull($values['dist_min'] ?? null),
            distanceMaxAu: self::floatOrNull($values['dist_max'] ?? null),
            relativeVelocityKmS: self::floatOrNull($values['v_rel'] ?? null),
            infinityVelocityKmS: self::floatOrNull($values['v_inf'] ?? null),
            timeUncertainty: self::cleanText($values['t_sigma_f'] ?? null),
            approachBody: self::cleanText($values['body'] ?? null) ?: $fallbackBody,
            absoluteMagnitude: self::floatOrNull($values['h'] ?? null),
            diameterKm: self::floatOrNull($values['diameter'] ?? null),
            diameterSigmaKm: self::floatOrNull($values['diameter_sigma'] ?? null),
            objectType: $type,
        );
    }

    public static function inferObjectType(string $designation, ?string $fullName = null): string
    {
        $value = strtoupper(trim($designation.' '.($fullName ?? '')));

        if (preg_match('/(^|\s)([PCD]\/|\d+[PCD](?:\b|-)|\d+P[-\s]|C\(|P\(|D\()/u', $value) === 1) {
            return 'comet';
        }

        if (str_contains($value, '/')) {
            return 'comet';
        }

        return 'asteroid';
    }

    public function detailRouteParameter(): string
    {
        return $this->spkId ?: $this->designation;
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

    public function displayName(): string
    {
        return $this->fullName ?: $this->designation;
    }

    public function toArray(): array
    {
        return [
            'designation' => $this->designation,
            'fullName' => $this->fullName,
            'spkId' => $this->spkId,
            'detailId' => $this->detailRouteParameter(),
            'orbitId' => $this->orbitId,
            'julianDate' => $this->julianDate,
            'calendarDate' => $this->calendarDate,
            'distanceAu' => $this->distanceAu,
            'distanceKm' => $this->distanceKm(),
            'distanceLunar' => $this->distanceLunar(),
            'distanceMinAu' => $this->distanceMinAu,
            'distanceMaxAu' => $this->distanceMaxAu,
            'relativeVelocityKmS' => $this->relativeVelocityKmS,
            'relativeVelocityKmH' => $this->relativeVelocityKmH(),
            'infinityVelocityKmS' => $this->infinityVelocityKmS,
            'timeUncertainty' => $this->timeUncertainty,
            'approachBody' => $this->approachBody,
            'absoluteMagnitude' => $this->absoluteMagnitude,
            'diameterKm' => $this->diameterKm,
            'diameterSigmaKm' => $this->diameterSigmaKm,
            'objectType' => $this->objectType,
            'displayName' => $this->displayName(),
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
