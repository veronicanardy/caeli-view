/**
 * Cone/fita de direção da trajetória.
 *
 * Responsabilidade: renderizar o indicador visual de deslocamento com escala
 * adaptada à distância da câmera. Recebe vetor de direção já resolvido.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DIRECTION_CONE_GEOMETRY, DIRECTION_CONE_SCALE } from './trajectoryConstants';

/**
 * Indicador orbital de movimento.
 *
 * Usa uma pequena fita translúcida com ponta em chevron: mais acabado que uma
 * linha pura, mas ainda leve e técnico o bastante para a linguagem do radar.
 */
export function DirectionCone({
    tip,
    direction,
    color,
    opacity,
}: {
    tip: THREE.Vector3;
    direction: THREE.Vector3;
    color: string;
    opacity: number;
}) {
    const markerRef = useRef<THREE.Group>(null);
    const camera = useThree((state) => state.camera);
    const worldPositionRef = useRef(new THREE.Vector3());

    const { quaternion, position, ribbonGeometry, linePositions } = useMemo(() => {
        const movementDirection = direction.clone().normalize();
        const quaternionValue = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            movementDirection,
        );
        const positionValue = tip.clone().add(movementDirection.multiplyScalar(DIRECTION_CONE_GEOMETRY.airGap));
        const ribbon = buildVectorRibbonGeometry();
        const lines = new Float32Array([
            0, 0, 0.001,
            0, DIRECTION_CONE_GEOMETRY.length, 0.001,

            -DIRECTION_CONE_GEOMETRY.headWidth * 0.5, DIRECTION_CONE_GEOMETRY.length - DIRECTION_CONE_GEOMETRY.headLength, 0.001,
            0, DIRECTION_CONE_GEOMETRY.length, 0.001,

            DIRECTION_CONE_GEOMETRY.headWidth * 0.5, DIRECTION_CONE_GEOMETRY.length - DIRECTION_CONE_GEOMETRY.headLength, 0.001,
            0, DIRECTION_CONE_GEOMETRY.length, 0.001,
        ]);

        return {
            quaternion: quaternionValue,
            position: positionValue,
            ribbonGeometry: ribbon,
            linePositions: lines,
        };
    }, [direction, tip]);

    useFrame(() => {
        if (!markerRef.current) return;

        const worldPosition = markerRef.current.getWorldPosition(worldPositionRef.current);
        const cameraDistance = camera.position.distanceTo(worldPosition);
        const dynamicScale = THREE.MathUtils.clamp(
            0.9 + cameraDistance * DIRECTION_CONE_SCALE.distanceFactor,
            DIRECTION_CONE_SCALE.min,
            DIRECTION_CONE_SCALE.max,
        );

        markerRef.current.scale.setScalar(dynamicScale);
    });

    useEffect(() => {
        return () => {
            ribbonGeometry.dispose();
        };
    }, [ribbonGeometry]);

    return (
        <group ref={markerRef} position={position} quaternion={quaternion}>
            <mesh geometry={ribbonGeometry}>
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={opacity * 0.22}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            <lineSegments>
                <bufferGeometry attach="geometry">
                    <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color={color} transparent opacity={opacity * 0.78} depthWrite={false} />
            </lineSegments>
        </group>
    );
}

function buildVectorRibbonGeometry(): THREE.BufferGeometry {
    const shaftEnd = DIRECTION_CONE_GEOMETRY.length - DIRECTION_CONE_GEOMETRY.headLength * 0.72;
    const halfWidth = DIRECTION_CONE_GEOMETRY.width * 0.5;
    const headY = DIRECTION_CONE_GEOMETRY.length - DIRECTION_CONE_GEOMETRY.headLength;
    const positions = new Float32Array([
        -halfWidth, 0, 0,
        halfWidth, 0, 0,
        -halfWidth * 0.75, shaftEnd, 0,

        halfWidth, 0, 0,
        halfWidth * 0.75, shaftEnd, 0,
        -halfWidth * 0.75, shaftEnd, 0,

        -DIRECTION_CONE_GEOMETRY.headWidth * 0.5, headY, 0,
        0, DIRECTION_CONE_GEOMETRY.length, 0,
        -halfWidth * 0.35, shaftEnd, 0,

        DIRECTION_CONE_GEOMETRY.headWidth * 0.5, headY, 0,
        halfWidth * 0.35, shaftEnd, 0,
        0, DIRECTION_CONE_GEOMETRY.length, 0,
    ]);
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();

    return geometry;
}
