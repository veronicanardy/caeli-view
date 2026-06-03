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

    const { quaternion, position, shaftLine, headMesh } = useMemo(() => {
        const movementDirection = direction.clone().normalize();
        const quaternionValue = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            movementDirection,
        );
        const positionValue = tip.clone().add(movementDirection.multiplyScalar(DIRECTION_CONE_GEOMETRY.airGap));

        const shaftLength = DIRECTION_CONE_GEOMETRY.length - DIRECTION_CONE_GEOMETRY.headLength;
        const segments = 24;
        const base = new THREE.Color(color);

        const posArr = new Float32Array((segments + 1) * 3);
        const colArr = new Float32Array((segments + 1) * 4);
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            posArr[i * 3 + 1] = t * shaftLength;
            colArr[i * 4] = base.r;
            colArr[i * 4 + 1] = base.g;
            colArr[i * 4 + 2] = base.b;
            colArr[i * 4 + 3] = t * t * opacity * 0.85;
        }

        const shaftGeo = new THREE.BufferGeometry();
        shaftGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        shaftGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 4));
        const shaftMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
        const line = new THREE.Line(shaftGeo, shaftMat);
        line.renderOrder = 2;

        const headGeo = new THREE.CylinderGeometry(0, DIRECTION_CONE_GEOMETRY.headWidth * 0.42, DIRECTION_CONE_GEOMETRY.headLength, 10, 1);
        headGeo.translate(0, shaftLength + DIRECTION_CONE_GEOMETRY.headLength * 0.5, 0);
        const headMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity * 0.88, depthWrite: false });
        const cone = new THREE.Mesh(headGeo, headMat);
        cone.renderOrder = 2;

        return { quaternion: quaternionValue, position: positionValue, shaftLine: line, headMesh: cone };
    }, [direction, tip, color, opacity]);

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
            (shaftLine.geometry as THREE.BufferGeometry).dispose();
            (shaftLine.material as THREE.Material).dispose();
            (headMesh.geometry as THREE.BufferGeometry).dispose();
            (headMesh.material as THREE.Material).dispose();
        };
    }, [shaftLine, headMesh]);

    return (
        <group ref={markerRef} position={position} quaternion={quaternion}>
            <primitive object={shaftLine} />
            <primitive object={headMesh} />
        </group>
    );
}
