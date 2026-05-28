import { useMemo } from 'react';
import * as THREE from 'three';

/**
 * The Moon's orbit, drawn as a circle in the Moon's REAL orbital plane (from position × velocity,
 * supplied as `orbitNormal`) — not an arbitrary tilt. The Moon visibly sits ON this 1 DL line.
 *
 * Radius = the Moon's geocentric distance in scene units (post log compression). The first basis
 * vector is the Moon's own position, so the rendered line passes exactly through the rendered Moon.
 */
export function MoonOrbit({
    moonPos,
    orbitNormal,
}: {
    moonPos: [number, number, number];
    orbitNormal: [number, number, number];
}) {
    const orbit = useMemo(() => {
        const m = new THREE.Vector3(...moonPos);
        const radius = m.length() || 1;
        if (radius < 1e-6) return null;

        const a = m.clone().normalize();
        let n = new THREE.Vector3(...orbitNormal).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        n = n.sub(a.clone().multiplyScalar(n.dot(a)));
        if (n.lengthSq() < 1e-6) {
            n = up.sub(a.clone().multiplyScalar(up.dot(a)));
        }
        n.normalize();
        const b = new THREE.Vector3().crossVectors(n, a).normalize();

        const segments = 128;
        const pts: number[] = [];
        for (let i = 0; i <= segments; i += 1) {
            const ang = (i / segments) * Math.PI * 2;
            const p = a.clone().multiplyScalar(Math.cos(ang) * radius).add(b.clone().multiplyScalar(Math.sin(ang) * radius));
            pts.push(p.x, p.y, p.z);
        }
        const labelAngle = Math.PI * 0.16;
        const label = a.clone()
            .multiplyScalar(Math.cos(labelAngle) * radius)
            .add(b.clone().multiplyScalar(Math.sin(labelAngle) * radius));

        return { points: new Float32Array(pts), label: [label.x, label.y, label.z] as [number, number, number] };
    }, [moonPos, orbitNormal]);

    if (!orbit) return null;
    return (
        <group>
            <line>
                <bufferGeometry attach="geometry">
                    <bufferAttribute attach="attributes-position" args={[orbit.points, 3]} />
                </bufferGeometry>
                <lineBasicMaterial color="#cbd5e1" transparent opacity={0.3} />
            </line>
        </group>
    );
}
