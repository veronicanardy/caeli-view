import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * Renderiza um cone 3D apontando na direção de deslocamento.
 *
 * Recebe a direção já calculada por outra camada, sem calcular órbita,
 * velocidade real ou corrigir fallback de Horizons/CAD.
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
    const coneLength = 0.13;
    const coneRadius = 0.036;
    const airGapFromRock = 0.13;

    const { quaternion, position } = useMemo(() => {
        const normalizedDirection = direction.clone().normalize();
        const quaternionValue = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalizedDirection);
        const positionValue = tip.clone().add(normalizedDirection.multiplyScalar(airGapFromRock + coneLength * 0.5));

        return { quaternion: quaternionValue, position: positionValue };
    }, [airGapFromRock, coneLength, direction, tip]);

    return (
        <mesh position={position} quaternion={quaternion}>
            <coneGeometry args={[coneRadius, coneLength, 18]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
        </mesh>
    );
}
