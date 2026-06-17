<?php

namespace App\Services\Approaches;

use Illuminate\Support\Facades\Cache;

/**
 * Resolve qual modelo 3D usar para representar um asteroide na visualização.
 *
 * Aplica uma hierarquia de fidelidade (N1 a N5) baseada nos dados físicos disponíveis:
 *   N1 — modelo real de forma (GLB a partir de missão espacial, ex: OSIRIS-REx / Hayabusa2)
 *   N2 — referência catalogada sem GLB configurado; exibe proxy procedural com atribuição de fonte
 *   N3 — modelo procedural gerado a partir do diâmetro medido + identidade orbital conhecida
 *   N4 — modelo procedural baseado apenas no intervalo de diâmetro estimado
 *   N5 — placeholder sem dados físicos; preserva contexto espacial mas não representa forma real
 *
 * O resultado é cacheado com stale-while-revalidate para evitar recálculo por objeto/visita.
 */
final class AsteroidModelResolverService
{
    /** Versão do schema de cache — incrementar quando o formato de saída mudar */
    private const CACHE_VERSION = 'v1';

    /**
     * Resolve o modelo 3D para o objeto fornecido.
     * A entrada deve conter ao menos `id`, `name` e `displayName`; campos físicos são opcionais.
     */
    public function resolve(array $object): array
    {
        $normalized = $this->normalize($object);
        $ttl        = (int) config('services.asteroid_models.cache_ttl', 604800);
        $key        = 'asteroid-model:' . self::CACHE_VERSION . ':' . md5(json_encode($normalized, JSON_THROW_ON_ERROR));

        return Cache::flexible($key, [$ttl, $ttl + 86400], fn () => $this->buildResult($normalized, $ttl));
    }

    /**
     * Monta o payload de resposta determinando o nível de fidelidade do modelo.
     * A ordem dos blocos `if` representa a hierarquia: preferimos sempre o dado mais preciso.
     */
    private function buildResult(array $object, int $ttl): array
    {
        $catalog     = $this->catalogMatch($object);
        $diameter    = $this->diameter($object);
        $diameterMin = $this->floatOrNull($object['diameterMinMeters'] ?? null);
        $diameterMax = $this->floatOrNull($object['diameterMaxMeters'] ?? null);

        if ($catalog !== null && ($catalog['modelUrl'] ?? null)) {
            // Melhor caso: temos um GLB real de uma missão científica
            $level      = 'N1';
            $kind       = 'real_shape';
            $status     = 'available';
            $confidence = 0.95;
            $note       = 'Modelo real de forma resolvido pelo catálogo do backend. O frontend pode carregar a URL do modelo sob demanda.';
        } elseif ($catalog !== null) {
            // Objeto catalogado, mas o GLB ainda não foi configurado
            $level      = 'N2';
            $kind       = 'catalog_reference';
            $status     = 'fallback';
            $confidence = 0.78;
            $note       = 'Referência catalogada encontrada, mas ainda sem GLB leve configurado. Exibindo proxy procedural com atribuição de fonte.';
        } elseif ($diameter !== null && $this->hasOrbitIdentity($object)) {
            // Diâmetro medido + identidade orbital: forma procedural bem ancorада
            $level      = 'N3';
            $kind       = 'procedural';
            $status     = 'fallback';
            $confidence = 0.62;
            $note       = 'Modelo procedural gerado a partir do diâmetro conhecido e da identidade orbital. A forma é ilustrativa, não um modelo medido.';
        } elseif ($diameter !== null || ($diameterMin !== null && $diameterMax !== null)) {
            // Só temos intervalo de diâmetro estimado; forma é puramente ilustrativa
            $level      = 'N4';
            $kind       = 'procedural';
            $status     = 'fallback';
            $confidence = 0.46;
            $note       = 'Modelo procedural baseado no intervalo de diâmetro disponível. Forma e superfície são ilustrativas.';
        } else {
            // Sem dados físicos — exibe apenas um placeholder para não quebrar o contexto espacial
            $level      = 'N5';
            $kind       = 'size_placeholder';
            $status     = 'fallback';
            $confidence = 0.22;
            $note       = 'Sem tamanho físico confiável. Exibindo placeholder apenas para preservar contexto espacial.';
        }

        return [
            'objectId'           => $object['id'],
            'objectName'         => $object['displayName'] ?: $object['name'],
            'status'             => $status,
            'fidelityLevel'      => $level,
            'modelKind'          => $kind,
            'modelUrl'           => $catalog['modelUrl'] ?? null,
            'sourceName'         => $catalog['sourceName'] ?? $this->sourceName($level),
            'sourceUrl'          => $catalog['sourceUrl'] ?? $this->sourceUrl($level),
            'cacheTtlSeconds'    => $ttl,
            'generatedAt'        => now()->toIso8601String(),
            'shapeSeed'          => $this->shapeSeed($object),
            'diameterMeters'     => $diameter,
            'diameterMinMeters'  => $diameterMin,
            'diameterMaxMeters'  => $diameterMax,
            'rotationPeriodHours' => null,
            'albedo'             => null,
            'confidence'         => $confidence,
            'note'               => $note,
        ];
    }

    /**
     * Normaliza e sanitiza a entrada para garantir tipos corretos antes do cache e do processamento.
     * Campos ausentes recebem string vazia para evitar null-checks espalhados no restante do código.
     */
    private function normalize(array $object): array
    {
        return [
            'id'               => (string) ($object['id'] ?? ''),
            'name'             => trim((string) ($object['name'] ?? '')),
            'displayName'      => trim((string) ($object['displayName'] ?? '')),
            'designation'      => trim((string) ($object['designation'] ?? '')),
            'detailIdentifier' => trim((string) ($object['detailIdentifier'] ?? '')),
            'spkId'            => trim((string) ($object['spkId'] ?? '')),
            'objectType'       => trim((string) ($object['objectType'] ?? 'asteroid')),
            'diameterMeters'    => $this->floatOrNull($object['diameterMeters'] ?? null),
            'diameterMinMeters' => $this->floatOrNull($object['diameterMinMeters'] ?? null),
            'diameterMaxMeters' => $this->floatOrNull($object['diameterMaxMeters'] ?? null),
            'absoluteMagnitude' => $this->floatOrNull($object['absoluteMagnitude'] ?? null),
        ];
    }

    /**
     * Verifica se algum identificador do objeto bate com uma entrada do catálogo interno.
     *
     * O critério espelha o registry do front (asteroidModelRegistry.ts): a identidade só é
     * aceita quando é inequívoca, evitando os falsos positivos do `str_contains` anterior:
     *   - aliases batem por PALAVRA INTEIRA (ex.: "eros" não combina com "Heros"/"Erosita");
     *   - números batem por IGUALDADE DO CAMPO INTEIRO, tolerando "(N)" (ex.: o campo "433" casa
     *     com 433, mas "2000433", "2001 AB1" e "4337" não — o que protege números baixos como
     *     Ceres=1 e Vesta=4 de casar com fragmentos de designação tipo "2001 AB1").
     *
     * Números são buscados só em designation/detailIdentifier (campos de identificador), nunca em
     * name (texto livre) nem spkId. O SPK-ID de um asteroide numerado é 2000000 + número
     * (Bennu = 2101955), então casá-lo geraria correspondência incorreta.
     */
    private function catalogMatch(array $object): ?array
    {
        $textFields = array_values(array_filter([
            $object['name'],
            $object['displayName'],
            $object['designation'],
            $object['detailIdentifier'],
        ], static fn (string $value): bool => $value !== ''));

        $numberFields = array_values(array_filter([
            $object['designation'],
            $object['detailIdentifier'],
        ], static fn (string $value): bool => $value !== ''));

        foreach ($this->catalog() as $entry) {
            foreach ($entry['aliases'] as $alias) {
                foreach ($textFields as $field) {
                    if ($this->fieldContainsWord($field, $alias)) {
                        return $entry;
                    }
                }
            }

            foreach ($entry['numbers'] as $number) {
                foreach ($numberFields as $field) {
                    if ($this->fieldEqualsCatalogNumber($field, $number)) {
                        return $entry;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Verifica se `$needle` aparece como palavra inteira em `$field` (case-insensitive).
     * Fronteiras são qualquer caractere que não seja [a-z0-9], evitando falsos positivos
     * por substring como "ceres" dentro de "cerebral". Espelha fieldContainsWord do front.
     */
    private function fieldContainsWord(string $field, string $needle): bool
    {
        $escaped = preg_quote($needle, '/');

        return preg_match('/(^|[^a-z0-9])' . $escaped . '([^a-z0-9]|$)/i', $field) === 1;
    }

    /**
     * Verifica se `$field` é exatamente o número de catálogo `$number` (campo inteiro),
     * tolerando o formato "(NNN)" entre parênteses. Espelha fieldEqualsCatalogNumber do front:
     * exige igualdade do campo todo, não correspondência parcial — assim "433" casa com 433,
     * mas "2000433", "2001 AB1" e "4337" não.
     */
    private function fieldEqualsCatalogNumber(string $field, string $number): bool
    {
        $trimmed = preg_replace('/^\((\d+)\)$/', '$1', trim($field));

        return $trimmed === $number;
    }

    /**
     * Catálogo de asteroides com modelos 3D conhecidos ou referências de missões espaciais.
     *
     * Cada entrada declara separadamente:
     *   - `aliases`: nomes válidos, batidos por PALAVRA INTEIRA (sempre em minúsculas);
     *   - `numbers`: números de catálogo, batidos por TOKEN EXATO.
     * Espelha a estrutura de REAL_ASTEROID_MODELS no front (asteroidModelRegistry.ts) para que
     * os dois lados usem o mesmo critério de identidade.
     *
     * O campo `modelUrl` recebe a URL do GLB quando o arquivo estiver disponível; enquanto `null`,
     * o nível cai para N2 (referência catalogada sem modelo carregável).
     *
     * @return array<int, array{aliases: array<int, string>, numbers: array<int, string>, sourceName: string, sourceUrl: string, modelUrl: ?string}>
     */
    private function catalog(): array
    {
        // Caminho público dos GLBs (servidos de public/models/asteroids/). As mesmas URLs que o
        // front usa em asteroidModelRegistry.ts — manter os dois lados em sincronia.
        $glb = '/models/asteroids/';

        return [
            // Bennu — explorado pela missão OSIRIS-REx (NASA). GLB disponível → N1.
            [
                'aliases'    => ['bennu', 'rq36'],
                'numbers'    => ['101955'],
                'sourceName' => 'NASA 3D Resources / OSIRIS-REx shape model reference',
                'sourceUrl'  => 'https://science.nasa.gov/mission/osiris-rex/',
                'modelUrl'   => $glb . 'bennu.glb',
            ],
            // Eros — explorado pela missão NEAR Shoemaker (NASA). GLB disponível → N1.
            [
                'aliases'    => ['eros'],
                'numbers'    => ['433'],
                'sourceName' => 'NEAR Shoemaker / PDS small-body shape model reference',
                'sourceUrl'  => 'https://pds-smallbodies.astro.umd.edu/',
                'modelUrl'   => $glb . 'eros.glb',
            ],
            // Itokawa — explorado pela missão Hayabusa (JAXA). GLB disponível → N1.
            [
                'aliases'    => ['itokawa'],
                'numbers'    => ['25143'],
                'sourceName' => 'JAXA / PDS small-body shape model reference',
                'sourceUrl'  => 'https://pds-smallbodies.astro.umd.edu/',
                'modelUrl'   => $glb . 'itokawa.glb',
            ],
            // Vesta — mapeado pela missão Dawn (NASA). GLB disponível → N1.
            [
                'aliases'    => ['vesta'],
                'numbers'    => ['4'],
                'sourceName' => 'NASA / Dawn / PDS small-body shape model reference',
                'sourceUrl'  => 'https://pds-smallbodies.astro.umd.edu/',
                'modelUrl'   => $glb . 'vesta.glb',
            ],
            // Ceres — mapeado pela missão Dawn (NASA). GLB disponível → N1.
            [
                'aliases'    => ['ceres'],
                'numbers'    => ['1'],
                'sourceName' => 'NASA / Dawn / PDS small-body shape model reference',
                'sourceUrl'  => 'https://pds-smallbodies.astro.umd.edu/',
                'modelUrl'   => $glb . 'ceres.glb',
            ],
            // Ryugu — explorado pela Hayabusa2 (JAXA). Sem GLB no projeto ainda → permanece N2.
            [
                'aliases'    => ['ryugu'],
                'numbers'    => ['162173'],
                'sourceName' => 'JAXA / PDS small-body shape model reference',
                'sourceUrl'  => 'https://pds-smallbodies.astro.umd.edu/',
                'modelUrl'   => null,
            ],
        ];
    }

    /**
     * Retorna o melhor diâmetro disponível em metros.
     * Prioriza o valor medido direto; se ausente, usa a média do intervalo estimado.
     */
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

    /**
     * Verifica se o objeto possui algum identificador orbital confiável.
     * SPK-ID, designação provisória ou detailIdentifier indicam que o JPL conhece o objeto,
     * o que eleva a fidelidade do modelo procedural para N3.
     */
    private function hasOrbitIdentity(array $object): bool
    {
        return $object['spkId'] !== '' || $object['designation'] !== '' || $object['detailIdentifier'] !== '';
    }

    /**
     * Rótulo da fonte de dados exibido na interface para o nível de fidelidade dado.
     */
    private function sourceName(string $level): string
    {
        return match ($level) {
            'N1', 'N2' => 'NASA 3D Resources / PDS Small Bodies',
            'N3'       => 'CaeliView procedural resolver + JPL/NASA physical metadata',
            'N4'       => 'CaeliView diameter-only procedural resolver',
            default    => 'CaeliView placeholder resolver',
        };
    }

    /**
     * URL da fonte de dados para o nível de fidelidade dado; null para modelos gerados internamente.
     */
    private function sourceUrl(string $level): ?string
    {
        return match ($level) {
            'N1', 'N2' => 'https://pds-smallbodies.astro.umd.edu/',
            default    => null,
        };
    }

    /**
     * Gera uma semente inteira determinística para o gerador procedural de forma.
     * O mesmo objeto sempre recebe a mesma semente, garantindo que a aparência seja
     * consistente entre sessões mesmo sem um modelo real.
     */
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
