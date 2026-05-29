import * as THREE from 'three';
import { compressDistanceDl } from '@/lib/sceneEphemeris';
import { SceneLabel } from './SceneLabels';

// Anéis primários de DL desabilitados aqui; a referência de 1 DL pertence à órbita da Lua.
const RING_STOPS_DL: number[] = [];
const GUIDE_RING_STOPS_DL = [50];

/**
 * Anéis guia tênues além da Lua com seus rótulos de distância. O anel de 1 DL fica na linha de
 * órbita da Lua — apenas rótulos guia de distâncias maiores vivem aqui. Os anéis ficam no plano
 * eclíptico (a rotação do grupo posiciona a geometria no plano XZ).
 */
export function RingsLayer({ onEarthFocus, showLabels }: { onEarthFocus: () => void; showLabels: boolean }) {
    return (
        <group rotation={[Math.PI / 2, 0, 0]}>
            {/* Anéis internos opcionais (atualmente nenhum). */}
            {RING_STOPS_DL.map((ld) => (
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
            {/* Anéis guia tênues além de 1 DL para que asteroides distantes ainda tenham referência
                de distância, sem competir visualmente com a zona Terra-Lua. */}
            {GUIDE_RING_STOPS_DL.map((ld) => (
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
            {showLabels ? GUIDE_RING_STOPS_DL.map((ld) => (
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
