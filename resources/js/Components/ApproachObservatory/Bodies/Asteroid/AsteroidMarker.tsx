import { useMemo, useState } from 'react';
import * as THREE from 'three';
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
const LABEL_POSITION: [number, number, number] = [0, 0.16, 0];
/* Aura interna — volume suave que dá respiro atmosférico sem virar disco. */
const INNER_AURA_OPACITY = 0.045;
const INNER_AURA_COLOR = '#5dc8d8';
/* Rim light aderente — borda luminosa próxima à silhueta do asteroide. */
const RIM_LIGHT_OPACITY = 0.10;
const RIM_LIGHT_COLOR = '#7ee8fa';

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
}: AsteroidMarkerProps) {
    const [hovered, setHovered] = useState(false);
    const renderModel = useMemo(() => asteroidRenderableModelFor(object), [object]);
    /* Geometrias de halo: aura interna próxima + rim light aderente, sem discos grandes. */
    const innerAuraGeometry = useMemo(() => new THREE.SphereGeometry(ASTEROID_ROCK_SCALE * 1.28, 32, 16), []);
    const rimGeometry = useMemo(() => new THREE.SphereGeometry(ASTEROID_ROCK_SCALE * 1.55, 32, 16), []);

    const rockScale = ASTEROID_ROCK_SCALE;
    const opacity = dimmed ? DIMMED_OPACITY : FULL_OPACITY;
    const en = locale === 'en';

    return (
        <group position={position}>
            <group scale={rockScale} renderOrder={1}>
                <RealAsteroidModel asset={renderModel.asset} opacity={opacity} seed={object.approach.id} selected={isSelected} />
            </group>

            {isSelected ? (
                <>
                    {/* Rim light aderente: borda luminosa próxima à silhueta, separa do fundo. */}
                    <mesh geometry={rimGeometry}>
                        <meshBasicMaterial
                            color={RIM_LIGHT_COLOR}
                            transparent
                            opacity={RIM_LIGHT_OPACITY}
                            depthWrite={false}
                            side={THREE.BackSide}
                        />
                    </mesh>
                    {/* Aura interna: névoa de foco suave, sem formar disco visível. */}
                    <mesh geometry={innerAuraGeometry}>
                        <meshBasicMaterial
                            color={INNER_AURA_COLOR}
                            transparent
                            opacity={INNER_AURA_OPACITY}
                            depthWrite={false}
                            side={THREE.BackSide}
                        />
                    </mesh>
                </>
            ) : null}

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
