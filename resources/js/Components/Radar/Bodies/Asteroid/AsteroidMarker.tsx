/**
 * Marcador visual de asteroide na cena 3D.
 *
 * Responsabilidade: posicionar modelo GLB real ou genérico, hitbox de interação
 * e rótulo de distância para um objeto próximo. Não decide ranking, seleção
 * global nem cálculo orbital.
 */

import { useMemo, useState } from 'react';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BodyHitbox } from '../BodyHitbox';
import RealAsteroidModel from './RealAsteroidModel';
import { asteroidRenderableModelFor } from './asteroidModelRegistry';

const ASTEROID_ROCK_SCALE = 0.026;
const DIMMED_OPACITY = 0.4;
const FULL_OPACITY = 1;
const HITBOX_RADIUS = 0.14;
const HITBOX_SEGMENTS = 16;
const LABEL_POSITION: [number, number, number] = [0, 0.09, 0];

/**
 * Propriedades usadas para renderizar um marcador de asteroide no radar 3D.
 */
type AsteroidMarkerProps = {
    object: ClosestNowObject;
    position: [number, number, number];
    nearbyClosestApproach: boolean;
    isSelected: boolean;
    dimmed: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    locale: 'pt-BR' | 'en';
    paletteColor: string;
    showLabels: boolean;
};

/**
 * Renderiza um marcador de asteroide na cena 3D do radar orbital.
 *
 * Responsabilidades:
 * - receber posição e estados de proximidade já preparados pela camada de cena;
 * - decidir entre modelo real conhecido ou rocha procedural genérica;
 * - aplicar uma rotação visual lenta para reforçar a percepção 3D;
 * - renderizar hitbox local, hover/seleção e rótulo.
 *
 * Observação científica:
 * este componente não calcula mecânica orbital nem amostra trajetória. Qualquer
 * validação física ou matemática deve acontecer na camada de trajetória/amostragem.
 */
export function AsteroidMarker({
    object,
    position,
    nearbyClosestApproach,
    isSelected,
    dimmed,
    onSelect,
    showLabel,
    protectLabelFromFocus,
    locale,
    paletteColor,
    showLabels,
}: AsteroidMarkerProps) {
    const [hovered, setHovered] = useState(false);
    const renderModel = useMemo(() => asteroidRenderableModelFor(object), [object]);

    const rockScale = ASTEROID_ROCK_SCALE;
    const opacity = dimmed ? DIMMED_OPACITY : FULL_OPACITY;
    const en = locale === 'en';

    return (
        <group position={position}>
            <group scale={rockScale} renderOrder={1}>
                <RealAsteroidModel asset={renderModel.asset} opacity={opacity} seed={object.approach.id} selected={isSelected} outlineColor={paletteColor} showOutline={showLabels} />
            </group>

            {!isSelected ? (
                <BodyHitbox
                    radius={HITBOX_RADIUS}
                    segments={[HITBOX_SEGMENTS, HITBOX_SEGMENTS]}
                    onClick={() => onSelect(object.approach)}
                    onHoverChange={setHovered}
                />
            ) : null}

            {/* Mostra label quando: (a) sempre visível por config, ou (b) hover — mesmo com labels suprimidos.
                Isso garante destaque visual em qualquer objectLimit sem poluir a cena em repouso. */}
            {(showLabel || hovered) ? (
                <ScreenLabel
                    position={LABEL_POSITION}
                    emphasized={isSelected || hovered}
                    protectFromFocus={protectLabelFromFocus}
                    allowSceneOverlap={isSelected}
                    onClick={isSelected ? undefined : () => onSelect(object.approach)}
                    title={isSelected ? undefined : `Focar ${object.approach.displayName ?? object.approach.name}`}
                >
                    <div className="font-semibold">
                        {object.approach.displayName ?? object.approach.name}
                    </div>

                    {!object.hasRealCurrentDistance ? (
                        <div
                            className="mt-1 rounded border border-yellow-400/30 bg-yellow-400/8 px-2 py-1 text-[11px] text-yellow-300/70"
                            title={en
                                ? 'Real-time position not available. Placed at recorded approach distance — angle has no physical meaning.'
                                : 'Posição em tempo real indisponível. Posicionado pela distância registrada da aproximação — o ângulo não tem significado físico.'}
                        >
                            {en ? '~ estimated position' : '~ posição estimada'}
                        </div>
                    ) : null}

                    {nearbyClosestApproach ? (
                        <div className="mt-1 rounded border border-signal-cyan/35 bg-signal-cyan/10 px-2 py-1 text-[12px] font-semibold text-signal-cyan">
                            {en ? 'Near closest approach' : 'Perto da máxima aproximação'}
                        </div>
                    ) : null}
                </ScreenLabel>
            ) : null}
        </group>
    );
}
