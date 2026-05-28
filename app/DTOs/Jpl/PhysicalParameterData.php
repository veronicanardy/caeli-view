<?php

namespace App\DTOs\Jpl;

final readonly class PhysicalParameterData
{
    public function __construct(
        public string $name,
        public ?string $title,
        public ?float $value,
        public ?string $displayValue,
        public ?float $sigma,
        public ?string $units,
        public ?string $description,
        public ?string $reference,
    ) {
    }

    public static function fromArray(array $data): self
    {
        $rawValue = $data['value'] ?? null;

        return new self(
            name: (string) ($data['name'] ?? ''),
            title: self::cleanText($data['title'] ?? null),
            value: self::floatOrNull($rawValue),
            displayValue: self::cleanText($rawValue),
            sigma: self::floatOrNull($data['sigma'] ?? null),
            units: self::cleanText($data['units'] ?? null),
            description: self::cleanText($data['desc'] ?? null),
            reference: self::cleanText($data['ref'] ?? null),
        );
    }

    public function toArray(): array
    {
        return [
            'name' => $this->name,
            'title' => $this->title,
            'value' => $this->value,
            'displayValue' => $this->displayValue,
            'sigma' => $this->sigma,
            'units' => $this->units,
            'description' => $this->description,
            'reference' => $this->reference,
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
