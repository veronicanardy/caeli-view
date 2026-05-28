<?php

namespace App\Services\Approaches;

use Illuminate\Support\Facades\Cache;

final class AsteroidModelResolverService
{
    private const CACHE_VERSION = 'v1';

    public function resolve(array $object): array
    {
        $normalized = $this->normalize($object);
        $ttl = (int) config('services.asteroid_models.cache_ttl', 604800);
        $key = 'asteroid-model:'.self::CACHE_VERSION.':'.md5(json_encode($normalized, JSON_THROW_ON_ERROR));

        return Cache::flexible($key, [$ttl, $ttl + 86400], function () use ($normalized, $ttl) {
            return $this->buildResult($normalized, $ttl);
        });
    }

    private function buildResult(array $object, int $ttl): array
    {
        $catalog = $this->catalogMatch($object);
        $diameter = $this->diameter($object);
        $diameterMin = $this->floatOrNull($object['diameterMinMeters'] ?? null);
        $diameterMax = $this->floatOrNull($object['diameterMaxMeters'] ?? null);

        if ($catalog !== null && ($catalog['modelUrl'] ?? null)) {
            $level = 'N1';
            $kind = 'real_shape';
            $status = 'available';
            $confidence = 0.95;
            $note = 'Modelo real de forma resolvido pelo catalogo do backend. O frontend pode carregar a URL do modelo sob demanda.';
        } elseif ($catalog !== null) {
            $level = 'N2';
            $kind = 'catalog_reference';
            $status = 'fallback';
            $confidence = 0.78;
            $note = 'Referencia catalogada encontrada, mas ainda sem GLB leve configurado. Exibindo proxy procedural com atribuicao de fonte.';
        } elseif ($diameter !== null && $this->hasOrbitIdentity($object)) {
            $level = 'N3';
            $kind = 'procedural';
            $status = 'fallback';
            $confidence = 0.62;
            $note = 'Modelo procedural gerado a partir do diametro conhecido e da identidade orbital. A forma e ilustrativa, nao um modelo medido.';
        } elseif ($diameter !== null || ($diameterMin !== null && $diameterMax !== null)) {
            $level = 'N4';
            $kind = 'procedural';
            $status = 'fallback';
            $confidence = 0.46;
            $note = 'Modelo procedural baseado no intervalo de diametro disponivel. Forma e superficie sao ilustrativas.';
        } else {
            $level = 'N5';
            $kind = 'size_placeholder';
            $status = 'fallback';
            $confidence = 0.22;
            $note = 'Sem tamanho fisico confiavel. Exibindo placeholder apenas para preservar contexto espacial.';
        }

        return [
            'objectId' => $object['id'],
            'objectName' => $object['displayName'] ?: $object['name'],
            'status' => $status,
            'fidelityLevel' => $level,
            'modelKind' => $kind,
            'modelUrl' => $catalog['modelUrl'] ?? null,
            'sourceName' => $catalog['sourceName'] ?? $this->sourceName($level),
            'sourceUrl' => $catalog['sourceUrl'] ?? $this->sourceUrl($level),
            'cacheTtlSeconds' => $ttl,
            'generatedAt' => now()->toIso8601String(),
            'shapeSeed' => $this->shapeSeed($object),
            'diameterMeters' => $diameter,
            'diameterMinMeters' => $diameterMin,
            'diameterMaxMeters' => $diameterMax,
            'rotationPeriodHours' => null,
            'albedo' => null,
            'confidence' => $confidence,
            'note' => $note,
        ];
    }

    private function normalize(array $object): array
    {
        return [
            'id' => (string) ($object['id'] ?? ''),
            'name' => trim((string) ($object['name'] ?? '')),
            'displayName' => trim((string) ($object['displayName'] ?? '')),
            'designation' => trim((string) ($object['designation'] ?? '')),
            'detailIdentifier' => trim((string) ($object['detailIdentifier'] ?? '')),
            'spkId' => trim((string) ($object['spkId'] ?? '')),
            'objectType' => trim((string) ($object['objectType'] ?? 'asteroid')),
            'diameterMeters' => $this->floatOrNull($object['diameterMeters'] ?? null),
            'diameterMinMeters' => $this->floatOrNull($object['diameterMinMeters'] ?? null),
            'diameterMaxMeters' => $this->floatOrNull($object['diameterMaxMeters'] ?? null),
            'absoluteMagnitude' => $this->floatOrNull($object['absoluteMagnitude'] ?? null),
        ];
    }

    private function catalogMatch(array $object): ?array
    {
        $haystack = strtolower(implode(' ', array_filter([
            $object['name'],
            $object['displayName'],
            $object['designation'],
            $object['detailIdentifier'],
            $object['spkId'],
        ])));

        foreach ($this->catalog() as $needle => $entry) {
            if (str_contains($haystack, $needle)) {
                return $entry;
            }
        }

        return null;
    }

    private function catalog(): array
    {
        return [
            '101955' => [
                'sourceName' => 'NASA 3D Resources / OSIRIS-REx shape model reference',
                'sourceUrl' => 'https://science.nasa.gov/mission/osiris-rex/',
                'modelUrl' => null,
            ],
            'bennu' => [
                'sourceName' => 'NASA 3D Resources / OSIRIS-REx shape model reference',
                'sourceUrl' => 'https://science.nasa.gov/mission/osiris-rex/',
                'modelUrl' => null,
            ],
            '162173' => [
                'sourceName' => 'JAXA / PDS small-body shape model reference',
                'sourceUrl' => 'https://pds-smallbodies.astro.umd.edu/',
                'modelUrl' => null,
            ],
            'ryugu' => [
                'sourceName' => 'JAXA / PDS small-body shape model reference',
                'sourceUrl' => 'https://pds-smallbodies.astro.umd.edu/',
                'modelUrl' => null,
            ],
            '433' => [
                'sourceName' => 'NEAR Shoemaker / PDS small-body shape model reference',
                'sourceUrl' => 'https://pds-smallbodies.astro.umd.edu/',
                'modelUrl' => null,
            ],
            'eros' => [
                'sourceName' => 'NEAR Shoemaker / PDS small-body shape model reference',
                'sourceUrl' => 'https://pds-smallbodies.astro.umd.edu/',
                'modelUrl' => null,
            ],
        ];
    }

    private function diameter(array $object): ?float
    {
        $diameter = $this->floatOrNull($object['diameterMeters'] ?? null);
        if ($diameter !== null) {
            return $diameter;
        }

        $min = $this->floatOrNull($object['diameterMinMeters'] ?? null);
        $max = $this->floatOrNull($object['diameterMaxMeters'] ?? null);

        if ($min !== null && $max !== null) {
            return ($min + $max) / 2;
        }

        return null;
    }

    private function hasOrbitIdentity(array $object): bool
    {
        return $object['spkId'] !== '' || $object['designation'] !== '' || $object['detailIdentifier'] !== '';
    }

    private function sourceName(string $level): string
    {
        return match ($level) {
            'N1', 'N2' => 'NASA 3D Resources / PDS Small Bodies',
            'N3' => 'CaeliView procedural resolver + JPL/NASA physical metadata',
            'N4' => 'CaeliView diameter-only procedural resolver',
            default => 'CaeliView placeholder resolver',
        };
    }

    private function sourceUrl(string $level): ?string
    {
        return match ($level) {
            'N1', 'N2' => 'https://pds-smallbodies.astro.umd.edu/',
            default => null,
        };
    }

    private function shapeSeed(array $object): int
    {
        return (int) (hexdec(substr(md5(implode('|', [
            $object['id'],
            $object['name'],
            $object['designation'],
            $object['spkId'],
        ])), 0, 7)) % 100000);
    }

    private function floatOrNull(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        return is_numeric($value) ? (float) $value : null;
    }
}
