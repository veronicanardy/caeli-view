import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const VECTOR_LENGTH = 0.086;
const VECTOR_WIDTH = 0.0042;
const VECTOR_HEAD_LENGTH = 0.026;
const VECTOR_HEAD_WIDTH = 0.018;
const VECTOR_AIR_GAP = 0.064;
const VECTOR_MIN_SCALE = 0.94;
const VECTOR_MAX_SCALE = 1.28;
const VECTOR_DISTANCE_SCALE = 0.028;

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
        const positionValue = tip.clone().add(movementDirection.multiplyScalar(VECTOR_AIR_GAP));
        const ribbon = buildVectorRibbonGeometry();
        const lines = new Float32Array([
            0, 0, 0.001,
            0, VECTOR_LENGTH, 0.001,

            -VECTOR_HEAD_WIDTH * 0.5, VECTOR_LENGTH - VECTOR_HEAD_LENGTH, 0.001,
            0, VECTOR_LENGTH, 0.001,

            VECTOR_HEAD_WIDTH * 0.5, VECTOR_LENGTH - VECTOR_HEAD_LENGTH, 0.001,
            0, VECTOR_LENGTH, 0.001,
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
            0.9 + cameraDistance * VECTOR_DISTANCE_SCALE,
            VECTOR_MIN_SCALE,
            VECTOR_MAX_SCALE,
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
    const shaftEnd = VECTOR_LENGTH - VECTOR_HEAD_LENGTH * 0.72;
    const halfWidth = VECTOR_WIDTH * 0.5;
    const headY = VECTOR_LENGTH - VECTOR_HEAD_LENGTH;
    const positions = new Float32Array([
        -halfWidth, 0, 0,
        halfWidth, 0, 0,
        -halfWidth * 0.75, shaftEnd, 0,

        halfWidth, 0, 0,
        halfWidth * 0.75, shaftEnd, 0,
        -halfWidth * 0.75, shaftEnd, 0,

        -VECTOR_HEAD_WIDTH * 0.5, headY, 0,
        0, VECTOR_LENGTH, 0,
        -halfWidth * 0.35, shaftEnd, 0,

        VECTOR_HEAD_WIDTH * 0.5, headY, 0,
        halfWidth * 0.35, shaftEnd, 0,
        0, VECTOR_LENGTH, 0,
    ]);
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();

    return geometry;
}
