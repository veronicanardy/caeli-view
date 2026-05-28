<?php

namespace App\DTOs\Nasa\Apod;

final readonly class ApodData
{
    public function __construct(
        public string $date,
        public string $title,
        public ?string $explanation,
        public string $mediaType,
        public ?string $url,
        public ?string $hdUrl,
        public ?string $thumbnailUrl,
        public ?string $copyright,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            date: (string) ($data['date'] ?? ''),
            title: (string) ($data['title'] ?? 'Astronomy Picture of the Day'),
            explanation: $data['explanation'] ?? null,
            mediaType: (string) ($data['media_type'] ?? 'unknown'),
            url: self::safeUrl($data['url'] ?? null),
            hdUrl: self::safeUrl($data['hdurl'] ?? null),
            thumbnailUrl: self::safeUrl($data['thumbnail_url'] ?? null),
            copyright: isset($data['copyright']) ? trim((string) $data['copyright']) : null,
        );
    }

    public function isImage(): bool
    {
        return $this->mediaType === 'image';
    }

    public function isVideo(): bool
    {
        return $this->mediaType === 'video';
    }

    public function displayUrl(): ?string
    {
        return $this->isImage() ? ($this->hdUrl ?? $this->url) : $this->thumbnailUrl;
    }

    public function videoUrl(): ?string
    {
        return $this->isVideo() ? $this->url : null;
    }

    public function toArray(): array
    {
        return [
            'date' => $this->date,
            'title' => $this->title,
            'explanation' => $this->explanation,
            'mediaType' => $this->mediaType,
            'url' => $this->url,
            'hdUrl' => $this->hdUrl,
            'thumbnailUrl' => $this->thumbnailUrl,
            'displayUrl' => $this->displayUrl(),
            'videoUrl' => $this->videoUrl(),
            'copyright' => $this->copyright,
            'isImage' => $this->isImage(),
            'isVideo' => $this->isVideo(),
        ];
    }

    private static function safeUrl(?string $url): ?string
    {
        if (! is_string($url) || $url === '') {
            return null;
        }

        if (! filter_var($url, FILTER_VALIDATE_URL)) {
            return null;
        }

        return str_starts_with($url, 'https://') ? $url : null;
    }
}
