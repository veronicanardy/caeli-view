import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import {
    closestApproachNearPosition,
    currentPositionInScene,
} from '@/lib/observatory/trajectorySampling';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import RealAsteroidModel from './RealAsteroidModel';
import ProceduralAsteroidRock from './ProceduralAsteroidRock';
import { asteroidRenderableModelFor } from './asteroidModelRegistry';

const ASTEROID_ROCK_SCALE = 0.045;
const DIMMED_OPACITY = 0.4;
const FULL_OPACITY = 1;
const HITBOX_RADIUS = 0.14;
const HITBOX_SEGMENTS = 16;
const LABEL_POSITION: [number, number, number] = [0, 0.16, 0];
const LIGHT_POSITION: [number, number, number] = [1.5, 1.2, 1.8];
const LIGHT_INTENSITY = 0.18;
const LIGHT_DISTANCE = 2.4;
const LIGHT_COLOR = '#f2f7ff';
const ROTATION_Y_SPEED = 0.045;
const ROTATION_X_SPEED = 0.018;

/**
 * Propriedades usadas para renderizar um marcador de asteroide no radar 3D.
 */
type AsteroidMarkerProps = {
    object: ClosestNowObject;
    palette: { future: string; current: string; past: string };
    isSelected: boolean;
    dimmed: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    compactLabel: boolean;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    locale: 'pt-BR' | 'en';
};

/**
 * Renderiza um marcador de asteroide na cena 3D do radar orbital.
 *
 * Responsabilidades:
 * - obter a posição atual do objeto no sistema de coordenadas da cena;
 * - decidir entre modelo real conhecido ou rocha procedural genérica;
 * - aplicar uma rotação visual lenta para reforçar a percepção 3D;
 * - criar uma área invisível de clique/hover maior que o objeto;
 * - exibir, quando permitido, um rótulo em tela com nome e distância.
 *
 * Observação científica:
 * este componente não calcula mecânica orbital. Ele consome coordenadas de
 * cena já preparadas por `currentPositionInScene`. Qualquer validação física
 * ou matemática deve acontecer na camada de trajetória/amostragem, não aqui.
 */
export function AsteroidMarker({
    object,
    palette: _palette,
    isSelected,
    dimmed,
    onSelect,
    compactLabel: _compactLabel,
    showLabel,
    protectLabelFromFocus,
    locale,
}: AsteroidMarkerProps) {
    const position = currentPositionInScene(object);
    const [hovered, setHovered] = useState(false);
    const rockRef = useRef<THREE.Group>(null);

    useEffect(() => {
        return () => {
            document.body.style.cursor = '';
        };
    }, []);

    const renderModel = useMemo(() => asteroidRenderableModelFor(object), [object]);

    useFrame((_, delta) => {
        if (rockRef.current) {
            rockRef.current.rotation.y += delta * ROTATION_Y_SPEED;
            rockRef.current.rotation.x += delta * ROTATION_X_SPEED;
        }
    });

    if (!position) return null;

    const rockScale = ASTEROID_ROCK_SCALE;
    const opacity = dimmed ? DIMMED_OPACITY : FULL_OPACITY;
    const nearbyClosestApproach = closestApproachNearPosition(
        object.trajectory,
        new THREE.Vector3(...position),
    );
    const en = locale === 'en';

    return (
        <group position={position}>
            <group ref={rockRef} scale={rockScale}>
                <pointLight position={LIGHT_POSITION} intensity={LIGHT_INTENSITY} distance={LIGHT_DISTANCE} color={LIGHT_COLOR} />
                {renderModel.kind === 'real' ? (
                    <RealAsteroidModel asset={renderModel.asset} opacity={opacity} />
                ) : (
                    <ProceduralAsteroidRock seed={object.approach.id} variant={renderModel.variant} opacity={opacity} />
                )}
            </group>

            {!isSelected ? (
                <mesh
                    onPointerOver={(e) => {
                        e.stopPropagation();
                        setHovered(true);
                        document.body.style.cursor = 'pointer';
                    }}
                    onPointerOut={() => {
                        setHovered(false);
                        document.body.style.cursor = '';
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(object.approach);
                    }}
                >
                    <sphereGeometry args={[HITBOX_RADIUS, HITBOX_SEGMENTS, HITBOX_SEGMENTS]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
            ) : null}

            {showLabel ? (
                <ScreenLabel
                    position={LABEL_POSITION}
                    emphasized={isSelected || hovered}
                    protectFromFocus={protectLabelFromFocus}
                    onClick={isSelected ? undefined : () => onSelect(object.approach)}
                    title={isSelected ? undefined : `Focar ${object.approach.displayName ?? object.approach.name}`}
                >
                    <div className="font-semibold">
                        {object.approach.displayName ?? object.approach.name}
                    </div>

                    {nearbyClosestApproach ? (
                        <div className="mt-1 rounded border border-signal-cyan/35 bg-signal-cyan/10 px-2 py-1 text-[12px] font-semibold text-signal-cyan">
                            {en ? 'Closest approach now' : 'Máxima aproximação hoje'}
                        </div>
                    ) : null}
                </ScreenLabel>
            ) : null}
        </group>
    );
}