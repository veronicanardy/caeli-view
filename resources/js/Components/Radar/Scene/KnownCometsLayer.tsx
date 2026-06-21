/**
 * Camada de FALLBACK dos cometas famosos (Halley, Encke, 67P) na cena do radar.
 *
 * Responsabilidade: desenhar (núcleo 3D real, label e hitbox) os cometas cuja posição NÃO veio do
 * Horizons, na régua LINEAR dos planetas (Sol na origem), via Kepler local (knownComets). É a rede de
 * segurança para que nenhum cometa suma quando o Horizons falha. Contraparte cometária de
 * KnownAsteroidsLayer.
 *
 * Caminho principal: os cometas vêm do feed /radar/famous com posição real do Horizons e são
 * desenhados pelo AsteroidSceneLayer (igual aos asteroides). Esta camada recebe `skipIds` com os
 * cometas que já têm posição real e os PULA, evitando duplicar o corpo.
 *
 * Visual: usa o GLB do núcleo de cometa via cometModelRegistry, o 67P tem shape model real (Rosetta);
 * Halley e Encke reusam o mesmo GLB genérico texturizado dos asteroides como forma representativa,
 * variada por seed. Cor/textura batem com a rocha por construção. A cauda é desenhada à parte (decisão
 * de produto), fora deste GLB.
 */

import { useMemo, useState } from 'react';
import { ResolvedScreenLabel } from '../Overlays/SceneLabels';
import { BodyHitbox } from '../Bodies/BodyHitbox';
import RealAsteroidModel from '../Bodies/Asteroid/RealAsteroidModel';
import type { AsteroidModelAsset } from '../Bodies/Asteroid/asteroidModelRegistry';
import type { KnownComet } from '../Bodies/Comet/knownComets';
import { knownCometId, knownCometPlacements, knownCometVisualScale } from '../Bodies/Comet/knownComets';
import { cometModelAsset, COMET_67P_COLOR } from '../Bodies/Comet/cometModelRegistry';
import { CometTail } from '../Bodies/Comet/CometTail';

/** Mesmos pisos de hitbox/label da camada de asteroides (corpos pequenos na cena). */
const HITBOX_RADIUS_FACTOR = 4;
const MIN_HITBOX_RADIUS = 0.06;
const COMET_HITBOX_SEGMENTS: [number, number] = [16, 16];
const LABEL_OFFSET_FACTOR = 6;

type KnownCometsLayerProps = {
    showLabels: boolean;
    /** Id do cometa atualmente selecionado (formato knownCometId), ou null. */
    selectedId?: string | null;
    /** Escala AU própria (modo linear); default = ORBIT_AU_SCALE da régua normal. */
    auScale?: number;
    /** Ids de cometas que já têm posição real do Horizons. Esta camada (Kepler local) os PULA. */
    skipIds?: Set<string>;
    /** Abre o card do cometa clicado. */
    onSelect?: (comet: KnownComet) => void;
};

/**
 * Renderiza os cometas famosos com núcleo 3D real na régua dos planetas (Sol na origem), cada um na
 * região real onde está. As posições são recalculadas por render a partir da data atual.
 */
export function KnownCometsLayer({ showLabels, selectedId, auScale, skipIds, onSelect }: KnownCometsLayerProps) {
    const placements = useMemo(() => knownCometPlacements(new Date(), auScale), [auScale]);
    const hasSelection = Boolean(selectedId);

    return (
        <group>
            {placements.map(({ comet, scenePosition }) => {
                const id = knownCometId(comet);
                // Pula os que já têm posição real do Horizons (desenhados pelo AsteroidSceneLayer).
                if (skipIds?.has(id)) return null;
                const isSelected = id === selectedId;
                return (
                    <KnownCometBody
                        key={comet.designation}
                        comet={comet}
                        position={scenePosition}
                        showLabel={showLabels}
                        dimmed={hasSelection && !isSelected}
                        selected={isSelected}
                        onSelect={onSelect ? () => onSelect(comet) : undefined}
                    />
                );
            })}
        </group>
    );
}

type KnownCometBodyProps = {
    comet: KnownComet;
    position: [number, number, number];
    showLabel: boolean;
    dimmed: boolean;
    selected: boolean;
    onSelect?: () => void;
};

function KnownCometBody({ comet, position, showLabel, dimmed, selected, onSelect }: KnownCometBodyProps) {
    const [hovered, setHovered] = useState(false);
    // O núcleo do cometa vem do cometModelRegistry (67P real; demais reusam o genérico). RealAsteroidModel
    // só consome url/rotation/excludedVariants, então adaptamos o asset de cometa ao shape esperado.
    const model = cometModelAsset(comet.modelKey);
    const asset = useMemo<AsteroidModelAsset>(
        () => ({ key: 'generic', url: model.url, rotation: model.rotation, aliases: [], numbers: [] }),
        [model.url, model.rotation],
    );
    const scale = knownCometVisualScale(comet);
    const opacity = dimmed && !hovered ? 0.5 : 1;
    const hitboxRadius = Math.max(scale * HITBOX_RADIUS_FACTOR, MIN_HITBOX_RADIUS);
    const labelOffset: [number, number, number] = [0, Math.max(scale * LABEL_OFFSET_FACTOR, 0.05), 0];

    return (
        <group position={position}>
            {/* Coma + cauda (anti-solar): o que diferencia o cometa do asteroide. Fora do <group scale>
                porque dimensiona pela própria régua do núcleo (nucleusRadius), não pelo scale do GLB. */}
            <CometTail scenePosition={position} nucleusRadius={scale} opacity={opacity} />

            <group scale={scale}>
                {/* Cometa sem modelo próprio reusa o MESMO GLB genérico texturizado do asteroide, então
                    cor/textura batem com a rocha sem ajuste. O 67P tem GLB próprio SEM textura (cinza claro
                    embutido), então recebe a cor escura dedicada. showOutline acompanha os rótulos pra ter
                    o mesmo contorno do asteroide do feed (antes só aparecia quando selecionado). */}
                <RealAsteroidModel
                    asset={asset}
                    opacity={opacity}
                    seed={comet.designation}
                    selected={selected || hovered}
                    showOutline={showLabel || selected}
                    {...(comet.modelKey === 'c67p' ? { fallbackColor: COMET_67P_COLOR } : {})}
                />
            </group>

            {!selected ? (
                <BodyHitbox
                    radius={hitboxRadius}
                    segments={COMET_HITBOX_SEGMENTS}
                    onClick={() => onSelect?.()}
                    onHoverChange={setHovered}
                />
            ) : null}

            {(showLabel || hovered || selected) ? (
                <ResolvedScreenLabel
                    position={labelOffset}
                    labelId={`known-comet:${knownCometId(comet)}`}
                    labelKind="asteroid"
                    emphasized={hovered || selected}
                    selected={selected}
                    hovered={hovered}
                    protectFromFocus={!hovered && !selected}
                    onClick={selected ? undefined : () => onSelect?.()}
                >
                    {comet.name}
                </ResolvedScreenLabel>
            ) : null}
        </group>
    );
}
