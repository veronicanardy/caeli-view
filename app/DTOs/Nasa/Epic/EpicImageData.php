<?php

namespace App\DTOs\Nasa\Epic;

use Carbon\CarbonImmutable;

final readonly class EpicImageData
{
    public function __construct(
        public string $identifier,
        public string $image,
        public ?string $caption,
        public ?string $date,
        public ?array $centroidCoordinates,
        public ?array $dscovrPosition,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            identifier: (string) ($data['identifier'] ?? $data['image'] ?? ''),
            image: (string) ($data['image'] ?? ''),
            caption: $data['caption'] ?? null,
            date: $data['date'] ?? null,
            centroidCoordinates: $data['centroid_coordinates'] ?? null,
            dscovrPosition: $data['dscovr_j2000_position'] ?? null,
        );
    }

    public function imageUrl(): ?string
    {
        return $this->imageUrlForCollection('natural');
    }

    public function imageUrlForCollection(string $collection = 'natural'): ?string
    {
        if ($this->image === '' || $this->date === null) {
            return null;
        }

        $date = CarbonImmutable::parse($this->date);
        $image = preg_replace('/\.(png|jpg|jpeg)$/i', '', $this->image) ?: $this->image;

        return sprintf(
            'https://epic.gsfc.nasa.gov/archive/%s/%s/%s/%s/png/%s.png',
            $collection,
            $date->format('Y'),
            $date->format('m'),
            $date->format('d'),
            rawurlencode($image)
        );
    }

    public function toArray(string $collection = 'natural'): array
    {
        return [
            'identifier' => $this->identifier,
            'image' => $this->image,
            'caption' => $this->caption,
            'date' => $this->date,
            'imageUrl' => $this->imageUrlForCollection($collection),
            'centroidCoordinates' => $this->centroidCoordinates,
            'dscovrPosition' => $this->dscovrPosition,
        ];
    }
}
