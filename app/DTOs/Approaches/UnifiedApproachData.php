<?php

namespace App\DTOs\Approaches;

use App\Support\AsteroidIdentityNormalizer;
use App\Support\DistancePresenter;

final readonly class UnifiedApproachData
{
    public function __construct(
        public string $id,
        public string $source,
        public string $sourceLabel,
        public string $rawName,
        public string $name,
        public ?string $designation,
        public ?string $spkId,
        public string $objectType,
        public ?string $approachDate,
        public ?string $approachBody,
        public ?float $nominalDistanceKm,
        public ?float $nominalDistanceMiles,
        public ?float $lunarDistance,
        public ?float $relativeVelocityKph,
        public ?float $relativeVelocityKms,
        public ?float $estimatedDiameterMinMeters,
        public ?float $estimatedDiameterMaxMeters,
        public ?float $diameterMeters,
        public bool $hazardFlag,
        public string $detailIdentifier,
        public string $detailSource,
        public ?string $orbitId,
        public ?float $absoluteMagnitude,
        public array $distanceContext,
    ) {
    }

    public static function fromNeoWs(array $asteroid): self
    {
        $approach = is_array($asteroid['primaryApproach'] ?? null) ? $asteroid['primaryApproach'] : [];
        $distanceKm = self::floatOrNull($approach['missDistanceKm'] ?? null);
        $velocityKph = self::floatOrNull($approach['velocityKmPerHour'] ?? null);
        $rawName = trim((string) ($asteroid['name'] ?? 'Asteroide monitorado'));
        $identity = AsteroidIdentityNormalizer::normalize($rawName);
        $name = $identity['displayName'];
        $designation = $identity['provisionalDesignation'] ?? self::designationFromName($rawName);
        $detailIdentifier = (string) ($designation ?: ($asteroid['id'] ?? $rawName));
        $date = self::cleanText($approach['dateTime'] ?? $approach['date'] ?? null);

        return new self(
            id: 'neows:'.(string) ($asteroid['id'] ?? md5($rawName.$date)),
            source: 'neows',
            sourceLabel: 'NASA NeoWs',
            rawName: $rawName,
            name: $name,
            designation: $designation,
            spkId: null,
            objectType: 'asteroid',
            approachDate: $date,
            approachBody: self::cleanText($approach['orbitingBody'] ?? null) ?: 'Earth',
            nominalDistanceKm: $distanceKm,
            nominalDistanceMiles: $distanceKm === null ? null : $distanceKm * 0.621371,
            lunarDistance: self::floatOrNull($approach['missDistanceLunar'] ?? null) ?: ($distanceKm === null ? null : $distanceKm / DistancePresenter::LUNAR_DISTANCE_KM),
            relativeVelocityKph: $velocityKph,
            relativeVelocityKms: $velocityKph === null ? null : $velocityKph / 3600,
            estimatedDiameterMinMeters: self::floatOrNull($asteroid['estimatedDiameterMinKm'] ?? null) === null ? null : (float) $asteroid['estimatedDiameterMinKm'] * 1000,
            estimatedDiameterMaxMeters: self::floatOrNull($asteroid['estimatedDiameterMaxKm'] ?? null) === null ? null : (float) $asteroid['estimatedDiameterMaxKm'] * 1000,
            diameterMeters: null,
            hazardFlag: (bool) ($asteroid['potentiallyHazardous'] ?? false),
            detailIdentifier: $detailIdentifier,
            detailSource: 'JPL SBDB',
            orbitId: null,
            absoluteMagnitude: null,
            distanceContext: DistancePresenter::fromKilometers($distanceKm),
        );
    }

    public static function fromCad(array $approach): self
    {
        $distanceKm = self::floatOrNull($approach['distanceKm'] ?? null);
        $velocityKms = self::floatOrNull($approach['relativeVelocityKmS'] ?? null);
        $rawName = trim((string) ($approach['fullName'] ?? $approach['displayName'] ?? $approach['designation'] ?? 'Pequeno corpo monitorado'));
        $identity = AsteroidIdentityNormalizer::normalize($rawName);
        $name = $identity['displayName'];

        return new self(
            id: 'cad:'.(string) ($approach['spkId'] ?? $approach['designation'] ?? md5($rawName)).':'.md5((string) ($approach['julianDate'] ?? $approach['calendarDate'] ?? '')),
            source: 'cad',
            sourceLabel: 'JPL CAD',
            rawName: $rawName,
            name: $name,
            designation: $identity['provisionalDesignation'] ?? self::cleanText($approach['designation'] ?? null),
            spkId: self::cleanText($approach['spkId'] ?? null),
            objectType: in_array($approach['objectType'] ?? 'asteroid', ['asteroid', 'comet'], true) ? (string) $approach['objectType'] : 'other',
            approachDate: self::cleanText($approach['calendarDate'] ?? null),
            approachBody: self::cleanText($approach['approachBody'] ?? null) ?: 'Earth',
            nominalDistanceKm: $distanceKm,
            nominalDistanceMiles: $distanceKm === null ? null : $distanceKm * 0.621371,
            lunarDistance: self::floatOrNull($approach['distanceLunar'] ?? null),
            relativeVelocityKph: self::floatOrNull($approach['relativeVelocityKmH'] ?? null),
            relativeVelocityKms: $velocityKms,
            estimatedDiameterMinMeters: null,
            estimatedDiameterMaxMeters: null,
            diameterMeters: self::floatOrNull($approach['diameterKm'] ?? null) === null ? null : (float) $approach['diameterKm'] * 1000,
            hazardFlag: false,
            detailIdentifier: (string) ($approach['detailId'] ?? $approach['designation'] ?? $name),
            detailSource: 'JPL SBDB',
            orbitId: self::cleanText($approach['orbitId'] ?? null),
            absoluteMagnitude: self::floatOrNull($approach['absoluteMagnitude'] ?? null),
            distanceContext: DistancePresenter::fromKilometers($distanceKm),
        );
    }

    public function dedupeKey(): string
    {
        $name = $this->designation ?: $this->name;
        $normalizedName = preg_replace('/[^a-z0-9]+/i', '', strtolower($name)) ?: $this->id;
        $date = substr((string) $this->approachDate, 0, 10);

        return $normalizedName.':'.$date;
    }

    public function toArray(): array
    {
        $identity = AsteroidIdentityNormalizer::normalize($this->rawName);

        return [
            'id' => $this->id,
            'source' => $this->source,
            'sourceLabel' => $this->sourceLabel,
            'rawName' => $this->rawName,
            'name' => $this->name,
            'designation' => $this->designation,
            'spkId' => $this->spkId,
            'permanentNumber' => $identity['permanentNumber'],
            'properName' => $identity['properName'],
            'provisionalDesignation' => $identity['provisionalDesignation'],
            'displayName' => $identity['displayName'],
            'subtitle' => $identity['subtitle'],
            'aliases' => $identity['aliases'],
            'objectType' => $this->objectType,
            'approachDate' => $this->approachDate,
            'approachBody' => $this->approachBody,
            'nominalDistanceKm' => $this->nominalDistanceKm,
            'nominalDistanceMiles' => $this->nominalDistanceMiles,
            'lunarDistance' => $this->lunarDistance,
            'relativeVelocityKph' => $this->relativeVelocityKph,
            'relativeVelocityKms' => $this->relativeVelocityKms,
            'estimatedDiameterMinMeters' => $this->estimatedDiameterMinMeters,
            'estimatedDiameterMaxMeters' => $this->estimatedDiameterMaxMeters,
            'diameterMeters' => $this->diameterMeters,
            'hazardFlag' => $this->hazardFlag,
            'detailIdentifier' => $this->detailIdentifier,
            'detailSource' => $this->detailSource,
            'detailRoute' => '/radar/objetos/'.rawurlencode($this->detailIdentifier),
            'orbitId' => $this->orbitId,
            'absoluteMagnitude' => $this->absoluteMagnitude,
            'distanceContext' => $this->distanceContext,
        ];
    }

    private static function designationFromName(string $name): ?string
    {
        if (preg_match('/\(([^)]+)\)/', $name, $matches) === 1) {
            return trim($matches[1]);
        }

        return null;
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
