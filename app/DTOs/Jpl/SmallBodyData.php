<?php

namespace App\DTOs\Jpl;

final readonly class SmallBodyData
{
    /**
     * @param array<int, OrbitalElementData> $orbitalElements
     * @param array<int, PhysicalParameterData> $physicalParameters
     * @param array<int, CloseApproachDetailData> $closeApproaches
     */
    public function __construct(
        public ?string $designation,
        public ?string $spkId,
        public ?string $fullName,
        public ?string $shortName,
        public ?string $orbitClass,
        public ?string $orbitClassDescription,
        public ?string $kind,
        public ?string $prefix,
        public ?string $firstObservation,
        public ?string $epoch,
        public ?string $equinox,
        public ?string $solutionDate,
        public string $objectType,
        public array $orbitalElements,
        public array $physicalParameters,
        public array $closeApproaches,
    ) {
    }

    public static function fromSbdbResponse(array $response): self
    {
        $object = $response['object'] ?? [];
        $orbit = $response['orbit'] ?? [];
        $elements = is_array($orbit['elements'] ?? null) ? $orbit['elements'] : [];
        $physical = is_array($response['phys_par'] ?? null) ? $response['phys_par'] : [];
        $approaches = is_array($response['ca_data'] ?? null) ? $response['ca_data'] : [];
        $kind = self::cleanText($object['kind'] ?? null);
        $prefix = self::cleanText($object['prefix'] ?? null);
        $designation = self::cleanText($object['des'] ?? null);
        $fullName = self::cleanText($object['fullname'] ?? null);

        return new self(
            designation: $designation,
            spkId: self::cleanText($object['spkid'] ?? null),
            fullName: $fullName,
            shortName: self::cleanText($object['shortname'] ?? null),
            orbitClass: self::cleanText($object['orbit_class']['code'] ?? $object['class'] ?? null),
            orbitClassDescription: self::cleanText($object['orbit_class']['name'] ?? null),
            kind: $kind,
            prefix: $prefix,
            firstObservation: self::cleanText($orbit['first_obs'] ?? null),
            epoch: self::cleanText($orbit['epoch'] ?? null),
            equinox: self::cleanText($orbit['equinox'] ?? null),
            solutionDate: self::cleanText($orbit['soln_date'] ?? null),
            objectType: self::inferObjectType($kind, $prefix, $designation, $fullName),
            orbitalElements: array_values(array_filter(array_map(
                fn (mixed $element) => is_array($element) ? OrbitalElementData::fromArray($element) : null,
                $elements
            ))),
            physicalParameters: array_values(array_filter(array_map(
                fn (mixed $parameter) => is_array($parameter) ? PhysicalParameterData::fromArray($parameter) : null,
                $physical
            ))),
            closeApproaches: array_values(array_filter(array_map(
                fn (mixed $approach) => is_array($approach) ? CloseApproachDetailData::fromArray($approach) : null,
                $approaches
            ))),
        );
    }

    public function primaryName(): string
    {
        return $this->shortName ?: ($this->fullName ?: ($this->designation ?: 'Pequeno corpo'));
    }

    public function physicalParameter(string $name): ?PhysicalParameterData
    {
        foreach ($this->physicalParameters as $parameter) {
            if (strcasecmp($parameter->name, $name) === 0) {
                return $parameter;
            }
        }

        return null;
    }

    public function orbitalElement(string $name): ?OrbitalElementData
    {
        foreach ($this->orbitalElements as $element) {
            if (strcasecmp($element->name, $name) === 0) {
                return $element;
            }
        }

        return null;
    }

    public function toArray(): array
    {
        return [
            'designation' => $this->designation,
            'spkId' => $this->spkId,
            'fullName' => $this->fullName,
            'shortName' => $this->shortName,
            'primaryName' => $this->primaryName(),
            'orbitClass' => $this->orbitClass,
            'orbitClassDescription' => $this->orbitClassDescription,
            'kind' => $this->kind,
            'prefix' => $this->prefix,
            'firstObservation' => $this->firstObservation,
            'epoch' => $this->epoch,
            'equinox' => $this->equinox,
            'solutionDate' => $this->solutionDate,
            'objectType' => $this->objectType,
            'absoluteMagnitude' => $this->physicalParameter('H')?->value,
            'diameterKm' => $this->physicalParameter('diameter')?->value,
            'albedo' => $this->physicalParameter('albedo')?->value,
            'rotationPeriodHours' => $this->physicalParameter('rot_per')?->value,
            'orbitalElements' => array_map(fn (OrbitalElementData $element) => $element->toArray(), $this->orbitalElements),
            'physicalParameters' => array_map(fn (PhysicalParameterData $parameter) => $parameter->toArray(), $this->physicalParameters),
            'closeApproaches' => array_map(fn (CloseApproachDetailData $approach) => $approach->toArray(), $this->closeApproaches),
        ];
    }

    private static function inferObjectType(?string $kind, ?string $prefix, ?string $designation, ?string $fullName): string
    {
        if ($kind !== null && str_starts_with(strtolower($kind), 'c')) {
            return 'comet';
        }

        if ($kind !== null && str_starts_with(strtolower($kind), 'a')) {
            return 'asteroid';
        }

        if ($prefix !== null && in_array(strtoupper($prefix), ['P', 'C', 'D'], true)) {
            return 'comet';
        }

        return CloseApproachData::inferObjectType($designation ?? '', $fullName);
    }

    private static function cleanText(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $text = trim((string) $value);

        return $text === '' ? null : $text;
    }
}
