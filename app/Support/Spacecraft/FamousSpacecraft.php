<?php

namespace App\Support\Spacecraft;

/**
 * Naves e missões interplanetárias famosas (Voyager 1/2, Pioneer 10, New Horizons, Juno).
 *
 * Responsabilidade: ser a FONTE DE VERDADE no backend da identidade dessas naves (id da nave no
 * Horizons, nome) e montar o payload aceito pelo HorizonsTrajectoryService para buscar a POSIÇÃO
 * ATUAL de cada uma. Diferente de FamousAsteroids/FamousComets, as naves NÃO entram no feed
 * /radar/famous: elas vivem na cena como os planetas (sempre presentes), e a posição ao vivo é
 * servida por um endpoint próprio (/radar/spacecraft → SpacecraftPositionSelector). Quando o Horizons
 * falha, o frontend cai num vetor heliocêntrico fixo (knownSpacecraft.ts), então a nave nunca some.
 *
 * O Horizons resolve naves por um id de nave (SPK negativo, ex.: -31 = Voyager 1), não por número do
 * MPC nem por DES=...;CAP. Esse id vem pronto em `horizonsCommand`, e HorizonsObjectIdentity o
 * prioriza com precedência absoluta, pulando o AsteroidIdentityNormalizer.
 *
 * Naves não têm "diâmetro": são estruturas de poucos metros, sub-pixel em qualquer escala. Esta classe
 * guarda só identidade; metadados de exibição (operador, ano) vivem no frontend (knownSpacecraft.ts).
 *
 * @see SpacecraftPositionSelector  Resolve a posição atual das naves no Horizons
 * @see \App\Support\Asteroids\FamousComets  Contraparte para cometas (que entram no feed famosos)
 */
final class FamousSpacecraft
{
    /**
     * As naves famosas. `horizonsId` é o id da nave no Horizons (SPK negativo). O frontend usa `id`
     * (spacecraft:<horizonsId>) para casar identidade.
     *
     * @var array<int, array{horizonsId: string, name: string}>
     */
    private const FAMOUS = [
        ['horizonsId' => '-31', 'name' => 'Voyager 1'],
        ['horizonsId' => '-32', 'name' => 'Voyager 2'],
        ['horizonsId' => '-23', 'name' => 'Pioneer 10'],
        ['horizonsId' => '-98', 'name' => 'New Horizons'],
        ['horizonsId' => '-61', 'name' => 'Juno'],
    ];

    /** Prefixo do id sintético. Casa com KNOWN_SPACECRAFT_ID_PREFIX no frontend. */
    public const ID_PREFIX = 'spacecraft:';

    /**
     * Lista crua das naves.
     *
     * @return array<int, array{horizonsId: string, name: string}>
     */
    public static function all(): array
    {
        return self::FAMOUS;
    }

    /** Id sintético estável de uma nave (ex.: "spacecraft:-31"). */
    public static function idFor(string $horizonsId): string
    {
        return self::ID_PREFIX.$horizonsId;
    }

    /**
     * Payload de uma nave no shape esperado por HorizonsTrajectoryService::trajectoryAroundNow.
     *
     * O `horizonsCommand` é o id da nave (ex.: "-31"), que HorizonsObjectIdentity prioriza com
     * precedência absoluta, pulando o normalizador de asteroides. Sem `approachTime`: não há
     * evento de aproximação, só a posição atual interessa.
     *
     * @param  array{horizonsId: string, name: string}  $craft
     * @return array<string, mixed>
     */
    public static function horizonsPayload(array $craft): array
    {
        return [
            'id'               => self::idFor($craft['horizonsId']),
            'name'             => $craft['name'],
            'displayName'      => $craft['name'],
            'rawName'          => $craft['name'],
            'designation'      => $craft['horizonsId'],
            'detailIdentifier' => $craft['horizonsId'],
            'horizonsCommand'  => $craft['horizonsId'],
            'spkId'            => '',
            'source'           => 'cad',
            'sourceLabel'      => 'JPL Horizons',
            // Naves ficam muito além do teto padrão de ~5 UA do parser (Voyager ~160 UA). Sem este teto
            // maior, TODOS os pontos seriam descartados como "distância impossível". ~200 UA de folga.
            'maxGeocentricDistanceKm' => self::MAX_SPACECRAFT_DISTANCE_KM,
        ];
    }

    /** Teto de distância geocêntrica para naves: ~200 UA, cobre o Voyager 1 (~167 UA) com folga. */
    private const MAX_SPACECRAFT_DISTANCE_KM = 3.0e10;
}
