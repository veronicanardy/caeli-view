import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BodyHitbox } from '../BodyHitbox';
import RealAsteroidModel from './RealAsteroidModel';
import ProceduralAsteroidRock from './ProceduralAsteroidRock';
import { asteroidRenderableModelFor } from './asteroidModelRegistry';

const ASTEROID_ROCK_SCALE = 0.051;
const DIMMED_OPACITY = 0.4;
const FULL_OPACITY = 1;
const HITBOX_RADIUS = 0.14;
const HITBOX_SEGMENTS = 16;
const LABEL_POSITION: [number, number, number] = [0, 0.16, 0];
const KEY_LIGHT_POSITION: [number, number, number] = [1.7, 0.5, 2.3];
const KEY_LIGHT_INTENSITY = 1.12;
const KEY_LIGHT_COLOR = '#fff2dd';
const FILL_LIGHT_POSITION: [number, number, number] = [-1.6, -0.3, -1.2];
const FILL_LIGHT_INTENSITY = 0.3;
const FILL_LIGHT_DISTANCE = 3.1;
const FILL_LIGHT_COLOR = '#7f93ab';
const RIM_LIGHT_POSITION: [number, number, number] = [-1.4, 0.9, 1.6];
const RIM_LIGHT_INTENSITY = 0.3;
const RIM_LIGHT_DISTANCE = 3.2;
const RIM_LIGHT_COLOR = '#b9cad8';
const AMBIENT_LIGHT_INTENSITY = 0.15;
const HEMI_LIGHT_INTENSITY = 0.26;
const HEMI_SKY_COLOR = '#8ea4bb';
const HEMI_GROUND_COLOR = '#312a23';
const ROTATION_Y_SPEED = 0.045;
const ROTATION_X_SPEED = 0.018;
const SELECTED_HALO_SCALE = 1.62;
const SELECTED_HALO_OPACITY = 0.055;
const SELECTED_HALO_COLOR = '#8de8f2';

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
    const rockRef = useRef<THREE.Group>(null);

    const renderModel = useMemo(() => asteroidRenderableModelFor(object), [object]);

    useFrame((_, delta) => {
        if (rockRef.current) {
            rockRef.current.rotation.y += delta * ROTATION_Y_SPEED;
            rockRef.current.rotation.x += delta * ROTATION_X_SPEED;
        }
    });

    const rockScale = ASTEROID_ROCK_SCALE;
    const opacity = dimmed ? DIMMED_OPACITY : FULL_OPACITY;
    const en = locale === 'en';

    return (
        <group position={position}>
            <ambientLight intensity={AMBIENT_LIGHT_INTENSITY} />
            <hemisphereLight
                intensity={HEMI_LIGHT_INTENSITY}
                color={HEMI_SKY_COLOR}
                groundColor={HEMI_GROUND_COLOR}
            />
            <directionalLight position={KEY_LIGHT_POSITION} intensity={KEY_LIGHT_INTENSITY} color={KEY_LIGHT_COLOR} />
            <pointLight position={FILL_LIGHT_POSITION} intensity={FILL_LIGHT_INTENSITY} distance={FILL_LIGHT_DISTANCE} color={FILL_LIGHT_COLOR} />
            <pointLight position={RIM_LIGHT_POSITION} intensity={RIM_LIGHT_INTENSITY} distance={RIM_LIGHT_DISTANCE} color={RIM_LIGHT_COLOR} />

            <group ref={rockRef} scale={rockScale}>
                {renderModel.kind === 'real' ? (
                    <RealAsteroidModel asset={renderModel.asset} opacity={opacity} />
                ) : (
                    <ProceduralAsteroidRock seed={object.approach.id} variant={renderModel.variant} opacity={opacity} />
                )}

                {isSelected ? (
                    <mesh scale={SELECTED_HALO_SCALE}>
                        <sphereGeometry args={[1, 32, 16]} />
                        <meshBasicMaterial
                            color={SELECTED_HALO_COLOR}
                            transparent
                            opacity={SELECTED_HALO_OPACITY}
                            depthWrite={false}
                            side={THREE.BackSide}
                        />
                    </mesh>
                ) : null}
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
