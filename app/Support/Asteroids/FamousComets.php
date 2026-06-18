<?php

namespace App\Support\Asteroids;

use App\Support\DistancePresenter;

/**
 * Cometas famosos (Halley, Encke, 67P, NEOWISE).
 *
 * Responsabilidade: ser a FONTE DE VERDADE no backend da identidade desses cometas (designação,
 * nome, diâmetro estimado do núcleo, comando de busca no Horizons) e montar, para cada um, tanto o
 * payload aceito pelo HorizonsTrajectoryService quanto o "approach" sintético do shape ClosestNowObject.
 * É a contraparte de FamousAsteroids para corpos cometários.
 *
 * Por que existir separado de FamousAsteroids: cometas NÃO se resolvem no Horizons como asteroides.
 * Mandar "1P;" (que funciona para "433;" Eros) retorna múltiplos registros de aparição e o Horizons
 * pede desambiguação. Cometas usam a sintaxe própria "DES=<des>;CAP" (CAP = última aparição), por isso
 * cada cometa carrega um `horizonsCommand` explícito que o HorizonsObjectIdentity prioriza, sem passar
 * pelo AsteroidIdentityNormalizer (que assume convenções do MPC para planetas menores).
 *
 * NÃO guarda elementos osculadores: o Horizons fornece a posição. Guarda só identidade e metadados de
 * exibição. O fallback Kepler quando o Horizons falha vive no frontend (knownAsteroids.ts).
 *
 * @see FamousAsteroids          Contraparte para os 5 asteroides com modelo 3D
 * @see FamousAsteroidsSelector  Resolve asteroides e cometas no mesmo feed /radar/famous
 */
final class FamousComets
{
    /**
     * Os cometas famosos. `designation` é a designação cometária (1P, 2P, 67P, C/2020 F3); o frontend
     * usa `id` para casar identidade e abrir o detalhe. `horizonsCommand` é o comando EXATO que o
     * Horizons aceita (DES=...;CAP). Diâmetro = diâmetro médio estimado do núcleo, em metros (JPL/ESA).
     *
     * @var array<int, array{designation: string, name: string, horizonsCommand: string, diameterMeters: int}>
     */
    private const FAMOUS = [
        ['designation' => '1P',        'name' => 'Halley',  'horizonsCommand' => 'DES=1P;CAP',        'diameterMeters' => 11_000],
        ['designation' => '2P',        'name' => 'Encke',   'horizonsCommand' => 'DES=2P;CAP',        'diameterMeters' => 4_800],
        ['designation' => '67P',       'name' => '67P Churyumov-Gerasimenko', 'horizonsCommand' => 'DES=67P;CAP', 'diameterMeters' => 4_000],
        ['designation' => 'C/2020 F3', 'name' => 'NEOWISE',  'horizonsCommand' => 'DES=C/2020 F3;CAP', 'diameterMeters' => 5_000],
    ];

    /**
     * Prefixo do id sintético. Distinto de FamousAsteroids (known:) para o frontend reconhecer um cometa
     * pelo id e escolher o tratamento visual próprio. Casa com COMET_ID_PREFIX no frontend.
     */
    public const ID_PREFIX = 'comet:';

    /**
     * Lista crua dos cometas.
     *
     * @return array<int, array{designation: string, name: string, horizonsCommand: string, diameterMeters: int}>
     */
    public static function all(): array
    {
        return self::FAMOUS;
    }

    /** Id sintético estável de um cometa (ex.: "comet:1P"), usado como selectedId e na cena. */
    public static function idFor(string $designation): string
    {
        return self::ID_PREFIX.$designation;
    }

    /**
     * Payload de um cometa no shape esperado por HorizonsTrajectoryService::trajectoryAroundNow.
     *
     * O `horizonsCommand` é o que HorizonsObjectIdentity prioriza para montar o comando exato do Horizons,
     * pulando o normalizador de asteroides. Sem `approachTime`: não há evento de aproximação.
     *
     * @param  array{designation: string, name: string, horizonsCommand: string, diameterMeters: int}  $comet
     * @return array<string, mixed>
     */
    public static function horizonsPayload(array $comet): array
    {
        return [
            'id'               => self::idFor($comet['designation']),
            'name'             => $comet['name'],
            'displayName'      => $comet['name'],
            'rawName'          => $comet['name'],
            'designation'      => $comet['designation'],
            'detailIdentifier' => $comet['designation'],
            'horizonsCommand'  => $comet['horizonsCommand'],
            'spkId'            => '',
            'source'           => 'cad',
            'sourceLabel'      => 'JPL Horizons',
        ];
    }

    /**
     * "approach" sintético de um cometa (UnifiedApproach), sem evento de aproximação: campos de
     * distância, data e velocidade ficam null de propósito. Espelha FamousAsteroids::syntheticApproach.
     *
     * @param  array{designation: string, name: string, horizonsCommand: string, diameterMeters: int}  $comet
     * @return array<string, mixed>
     */
    public static function syntheticApproach(array $comet): array
    {
        return [
            'id'               => self::idFor($comet['designation']),
            'source'           => 'cad',
            'sourceLabel'      => 'JPL Horizons',
            'name'             => $comet['name'],
            'displayName'      => $comet['name'],
            'rawName'          => $comet['name'],
            'designation'      => $comet['designation'],
            'permanentNumber'  => null,
            'properName'       => $comet['name'],
            'provisionalDesignation' => null,
            'aliases'          => [mb_strtolower($comet['name']), mb_strtolower($comet['designation'])],
            'objectType'       => 'comet',
            'approachDate'     => null,
            'approachBody'     => null,
            'nominalDistanceKm'    => null,
            'nominalDistanceMiles' => null,
            'lunarDistance'    => null,
            'relativeVelocityKph' => null,
            'relativeVelocityKms' => null,
            'estimatedDiameterMinMeters' => $comet['diameterMeters'],
            'estimatedDiameterMaxMeters' => $comet['diameterMeters'],
            'diameterMeters'   => $comet['diameterMeters'],
            'hazardFlag'       => false,
            'detailIdentifier' => $comet['designation'],
            'detailSource'     => 'sbdb',
            'detailRoute'      => '',
            'orbitId'          => null,
            'absoluteMagnitude' => null,
            'distanceContext'  => [
                'kilometers'           => null,
                'miles'                => null,
                'lunarDistance'        => null,
                'lunarReferenceKm'     => DistancePresenter::LUNAR_DISTANCE_KM,
                'earthDiametersApprox' => null,
                'proximityBand'        => 'unknown',
                'headline'             => '',
                'comparison'           => '',
            ],
        ];
    }
}
