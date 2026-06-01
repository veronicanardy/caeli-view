import * as THREE from 'three';
import { compressDistanceDl } from '@/lib/sceneEphemeris';
import { SceneLabel } from './SceneLabels';

/**
 * Camada de guias circulares 3D da cena.
 *
 * Os arrays de aneis podem permanecer vazios de proposito quando a referencia
 * principal estiver no radar SVG ou em outros guias visuais. Mantenha este
 * componente como ponto de extensao visual, sem mover calculo orbital para ca.
 */

// Aneis primarios de DL desabilitados aqui; a referencia de 1 DL pertence a orbita da Lua.
const SCENE_RING_STOPS_DL: number[] = [];
const SCENE_GUIDE_RING_STOPS_DL: number[] = [];

export function SceneRingsLayer({ onEarthFocus, showLabels }: { onEarthFocus: () => void; showLabels: boolean }) {
    return (
        <group rotation={[Math.PI / 2, 0, 0]}>
            {SCENE_RING_STOPS_DL.map((ld) => (
                <mesh key={ld}>
                    <ringGeometry
                        args={[
                            compressDistanceDl(ld) - 0.006,
                            compressDistanceDl(ld) + 0.006,
                            128,
                        ]}
                    />
                    <meshBasicMaterial
                        color="#ffffff"
                        transparent
                        opacity={0.2}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
            {SCENE_GUIDE_RING_STOPS_DL.map((ld) => (
                <mesh key={`guide-${ld}`}>
                    <ringGeometry
                        args={[
                            compressDistanceDl(ld) - 0.01,
                            compressDistanceDl(ld) + 0.01,
                            160,
                        ]}
                    />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.05} side={THREE.DoubleSide} />
                </mesh>
            ))}
            {showLabels ? SCENE_GUIDE_RING_STOPS_DL.map((ld) => (
                <SceneLabel
                    key={`glabel-${ld}`}
                    position={[
                        Math.cos(Math.PI * 0.85) * compressDistanceDl(ld),
                        Math.sin(Math.PI * 0.85) * compressDistanceDl(ld),
                        0,
                    ]}
                    tier="ring"
                    onClick={onEarthFocus}
                    title="Focar na Terra"
                >
                    {ld} DL
                </SceneLabel>
            )) : null}
        </group>
    );
}
