/**
 * Camada das naves famosas (Voyager 1/2, Pioneer 10/11, New Horizons, Juno, James Webb, Parker Solar
 * Probe, Europa Clipper) na cena do radar.
 *
 * Responsabilidade: desenhar (modelo 3D real, label e hitbox) as naves na régua LINEAR dos planetas
 * (Sol na origem), a partir da posição heliocêntrica de knownSpacecraft. É a contraparte de
 * KnownCometsLayer para objetos artificiais, com duas diferenças deliberadas: o corpo é o GLB oficial
 * da NASA (SpacecraftModel; cai no marcador estilizado SpacecraftMarker se o GLB não carregar), e a
 * posição vem de um vetor (ao vivo ou fixo), não de Kepler (naves não seguem órbita kepleriana).
 *
 * Caminho principal x fallback: as naves NÃO entram no feed /radar/famous; a posição ao vivo vem do
 * endpoint próprio /radar/spacecraft (livePositions) e o fallback local de knownSpacecraft cobre as
 * ausentes. O RadarScene ainda exclui objectType 'spacecraft' do AsteroidSceneLayer por defesa (o
 * AsteroidMarker só sabe desenhar rocha/cometa): esta é a única camada que sabe desenhá-las.
 *
 * As naves distantes (Voyager a ~167 UA) ficam no extremo da régua honesta. Isso é intencional: revela a
 * escala real do Sistema Solar. Não há cauda (decisão: nave não é cometa).
 */

import { Suspense, useState } from 'react';
import { ResolvedScreenLabel } from '../Overlays/SceneLabels';
import { BodyHitbox } from '../Bodies/BodyHitbox';
import { SpacecraftMarker } from '../Bodies/Spacecraft/SpacecraftMarker';
import { SpacecraftModel } from '../Bodies/Spacecraft/SpacecraftModel';
import { spacecraftModelAsset } from '../Bodies/Spacecraft/spacecraftModelRegistry';
import type { KnownSpacecraft, LiveSpacecraftPositions } from '../Bodies/Spacecraft/knownSpacecraft';
import { knownSpacecraftId, knownSpacecraftPlacements, SPACECRAFT_VISUAL_SCALE } from '../Bodies/Spacecraft/knownSpacecraft';

/** Hitbox/label generosos para corpos pequenos, no mesmo espírito da camada de cometas. */
const HITBOX_RADIUS_FACTOR = 4;
const MIN_HITBOX_RADIUS = 0.06;
const SPACECRAFT_HITBOX_SEGMENTS: [number, number] = [16, 16];
const LABEL_OFFSET_FACTOR = 8;

type KnownSpacecraftLayerProps = {
    showLabels: boolean;
    /** Id da nave atualmente selecionada (formato knownSpacecraftId), ou null. */
    selectedId?: string | null;
    /** Régua AU da cena; default = LINEAR_AU_SCALE, a régua única. */
    auScale?: number;
    /** Posições ao vivo das naves (Horizons). Naves ausentes usam o fallback local. */
    livePositions?: LiveSpacecraftPositions;
    /**
     * Posição heliocêntrica EXATA da Terra (efeméride do frontend, UA). Habilita o caminho preciso
     * `Terra_exata + geoAU` e o fallback do James Webb ancorado na Terra (L2).
     */
    earthHelioAU?: { x: number; y: number; z: number } | null;
    /** Abre o card da nave clicada. */
    onSelect?: (craft: KnownSpacecraft) => void;
};

/**
 * Renderiza as naves famosas com o modelo real na régua dos planetas (Sol na origem), cada uma na
 * região real onde está. Usa a posição ao vivo do Horizons (livePositions) quando disponível, senão o
 * fallback heliocêntrico local.
 */
export function KnownSpacecraftLayer({ showLabels, selectedId, auScale, livePositions, earthHelioAU, onSelect }: KnownSpacecraftLayerProps) {
    const placements = knownSpacecraftPlacements(auScale, livePositions, earthHelioAU);
    const hasSelection = Boolean(selectedId);

    return (
        <group>
            {placements.map(({ craft, scenePosition }) => {
                const id = knownSpacecraftId(craft);
                const isSelected = id === selectedId;
                return (
                    <KnownSpacecraftBody
                        key={craft.horizonsId}
                        craft={craft}
                        position={scenePosition}
                        showLabel={showLabels}
                        dimmed={hasSelection && !isSelected}
                        selected={isSelected}
                        onSelect={onSelect ? () => onSelect(craft) : undefined}
                    />
                );
            })}
        </group>
    );
}

type KnownSpacecraftBodyProps = {
    craft: KnownSpacecraft;
    position: [number, number, number];
    showLabel: boolean;
    dimmed: boolean;
    selected: boolean;
    onSelect?: () => void;
};

function KnownSpacecraftBody({ craft, position, showLabel, dimmed, selected, onSelect }: KnownSpacecraftBodyProps) {
    const [hovered, setHovered] = useState(false);
    const opacity = dimmed && !hovered ? 0.5 : 1;
    const hitboxRadius = Math.max(SPACECRAFT_VISUAL_SCALE * HITBOX_RADIUS_FACTOR, MIN_HITBOX_RADIUS);
    const labelOffset: [number, number, number] = [0, Math.max(SPACECRAFT_VISUAL_SCALE * LABEL_OFFSET_FACTOR, 0.05), 0];
    // GLB real da NASA quando há (Voyager/Juno/Pioneer/New Horizons); senão o marcador estilizado.
    const model = spacecraftModelAsset(craft.horizonsId);

    return (
        <group position={position}>
            <group scale={SPACECRAFT_VISUAL_SCALE}>
                {model ? (
                    // Suspense: enquanto o GLB carrega, mostra o marcador estilizado (sem buraco na cena).
                    <Suspense fallback={<SpacecraftMarker emphasized={selected || hovered} opacity={opacity} />}>
                        <SpacecraftModel asset={model} opacity={opacity} />
                    </Suspense>
                ) : (
                    <SpacecraftMarker emphasized={selected || hovered} opacity={opacity} />
                )}
            </group>

            {!selected ? (
                <BodyHitbox
                    radius={hitboxRadius}
                    segments={SPACECRAFT_HITBOX_SEGMENTS}
                    onClick={() => onSelect?.()}
                    onHoverChange={setHovered}
                />
            ) : null}

            {(showLabel || hovered || selected) ? (
                <ResolvedScreenLabel
                    position={labelOffset}
                    labelId={`known-spacecraft:${knownSpacecraftId(craft)}`}
                    labelKind="asteroid"
                    emphasized={hovered || selected}
                    selected={selected}
                    hovered={hovered}
                    protectFromFocus={!hovered && !selected}
                    onClick={() => onSelect?.()}
                >
                    {craft.name}
                </ResolvedScreenLabel>
            ) : null}
        </group>
    );
}
