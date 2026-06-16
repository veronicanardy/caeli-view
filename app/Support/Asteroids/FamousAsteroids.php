<?php

namespace App\Support\Asteroids;

use App\Support\DistancePresenter;

/**
 * Asteroides famosos por missões espaciais (Ceres, Vesta, Eros, Bennu, Itokawa).
 *
 * Responsabilidade: ser a FONTE DE VERDADE no backend da identidade desses corpos (número de
 * catálogo, nome, diâmetro, tipo) e montar, para cada um, tanto o payload aceito pelo
 * HorizonsTrajectoryService quanto o "approach" sintético do shape ClosestNowObject.
 *
 * Por que existir: esses corpos raramente se aproximam da Terra, então o feed closest-now
 * (CAD + NeoWs) não os retorna. Antes eram posicionados por Kepler local no frontend; agora
 * buscam posição e trilha curta de movimento do JPL Horizons ao vivo, como qualquer outro
 * objeto da cena. Esta classe é a contraparte PHP de knownAsteroids.ts.
 *
 * NÃO guarda elementos osculadores: o Horizons fornece a posição. Guarda só identidade e
 * metadados de exibição. O número de catálogo é o identificador que o Horizons resolve de forma
 * inequívoca (HorizonsCommandBuilder monta "433;" etc.).
 */
final class FamousAsteroids
{
    /**
     * Os cinco famosos com modelo 3D exclusivo. `number` é o número de catálogo (designação
     * permanente); o frontend usa `permanentNumber` para escolher o GLB (REAL_ASTEROID_MODELS)
     * e abrir o detalhe SBDB. Diâmetro médio real em metros (JPL SBDB).
     *
     * @var array<int, array{number: string, name: string, diameterMeters: int, objectType: string}>
     */
    private const FAMOUS = [
        ['number' => '1',      'name' => 'Ceres',   'diameterMeters' => 939_400, 'objectType' => 'asteroid'],
        ['number' => '4',      'name' => 'Vesta',   'diameterMeters' => 525_400, 'objectType' => 'asteroid'],
        ['number' => '433',    'name' => 'Eros',    'diameterMeters' => 16_840,  'objectType' => 'asteroid'],
        ['number' => '101955', 'name' => 'Bennu',   'diameterMeters' => 490,     'objectType' => 'asteroid'],
        ['number' => '25143',  'name' => 'Itokawa', 'diameterMeters' => 330,     'objectType' => 'asteroid'],
    ];

    /** Prefixo do id sintético, casa com KNOWN_ASTEROID_ID_PREFIX no frontend (knownAsteroids.ts). */
    public const ID_PREFIX = 'known:';

    /**
     * Lista crua dos famosos.
     *
     * @return array<int, array{number: string, name: string, diameterMeters: int, objectType: string}>
     */
    public static function all(): array
    {
        return self::FAMOUS;
    }

    /** Id sintético estável de um famoso (ex.: "known:433"), usado como selectedId e na cena. */
    public static function idFor(string $number): string
    {
        return self::ID_PREFIX.$number;
    }

    /**
     * Payload de um famoso no shape esperado por HorizonsTrajectoryService::trajectoryAroundNow.
     *
     * Sem `approachTime`: não há evento de aproximação. O `permanentNumber` é o que o
     * HorizonsObjectIdentity::mergeExplicitPermanentNumber injeta na identidade para o
     * HorizonsCommandBuilder montar o comando exato ("433;").
     *
     * @param  array{number: string, name: string, diameterMeters: int, objectType: string}  $famous
     * @return array<string, mixed>
     */
    public static function horizonsPayload(array $famous): array
    {
        return [
            'id'              => self::idFor($famous['number']),
            'name'            => $famous['name'],
            'displayName'     => $famous['name'],
            'rawName'         => $famous['name'],
            'permanentNumber' => $famous['number'],
            'designation'     => $famous['number'],
            'detailIdentifier' => $famous['number'],
            'spkId'           => '',
            'source'          => 'cad',
            'sourceLabel'     => 'JPL Small-Body Database',
        ];
    }

    /**
     * "approach" sintético de um famoso (UnifiedApproach), sem evento de aproximação: campos de
     * distância, data e velocidade ficam null de propósito. Espelha knownAsteroidToClosestNowObject
     * do frontend, agora montado no backend. O card de rocha já trata esses nulos.
     *
     * @param  array{number: string, name: string, diameterMeters: int, objectType: string}  $famous
     * @return array<string, mixed>
     */
    public static function syntheticApproach(array $famous): array
    {
        return [
            'id'               => self::idFor($famous['number']),
            'source'           => 'cad',
            'sourceLabel'      => 'JPL Small-Body Database',
            'name'             => $famous['name'],
            'displayName'      => $famous['name'],
            'rawName'          => $famous['name'],
            'designation'      => $famous['number'],
            'permanentNumber'  => $famous['number'],
            'properName'       => $famous['name'],
            'provisionalDesignation' => null,
            'aliases'          => [mb_strtolower($famous['name'])],
            'objectType'       => $famous['objectType'],
            'approachDate'     => null,
            'approachBody'     => null,
            'nominalDistanceKm'    => null,
            'nominalDistanceMiles' => null,
            'lunarDistance'    => null,
            'relativeVelocityKph' => null,
            'relativeVelocityKms' => null,
            'estimatedDiameterMinMeters' => $famous['diameterMeters'],
            'estimatedDiameterMaxMeters' => $famous['diameterMeters'],
            'diameterMeters'   => $famous['diameterMeters'],
            'hazardFlag'       => false,
            'detailIdentifier' => $famous['number'],
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
