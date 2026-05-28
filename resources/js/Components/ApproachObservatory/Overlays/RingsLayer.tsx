import * as THREE from 'three';
import { compressDistanceDl } from '@/lib/sceneEphemeris';
import { SceneLabel } from './SceneLabels';

// Primary DL rings are disabled here; the local 1 DL cue belongs to the Moon orbit itself.
const RING_STOPS_DL: number[] = [];
const GUIDE_RING_STOPS_DL = [50];

/**
 * Faint guide rings beyond the Moon plus their distance labels. The 1 DL ring lives on the Moon
 * orbit line itself — only broader guide labels live here. Rings lie in the ecliptic plane
 * (group rotation rotates the geometry into XZ).
 */
export function RingsLayer({ onEarthFocus, showLabels }: { onEarthFocus: () => void; showLabels: boolean }) {
    return (
        <group rotation={[Math.PI / 2, 0, 0]}>
            {/* Optional inner rings (currently none). */}
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
            {/* Faint guide rings beyond 1 DL so distant asteroids still have a distance cue,
                without competing visually with the Earth-Moon zone. */}
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
