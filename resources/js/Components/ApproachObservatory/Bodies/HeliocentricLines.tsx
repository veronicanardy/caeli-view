import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { ORBIT_AU_SCALE } from '@/lib/sceneEphemeris';
import { sunEclipticDisplayPosition } from '@/lib/observatory/sunGeometry';

/**
 * 1 AU Earth-orbit reference ring drawn in the heliocentric scene, in the ecliptic plane. The
 * ring is built as a real THREE.Line with frustumCulled disabled so the camera can pull back far
 * past the ring without it vanishing.
 */
export function EarthOrbitRingHelio() {
    const lineObject = useMemo(() => {
        const segments = 192;
        const radius = ORBIT_AU_SCALE; // 1 AU
        const pts: number[] = [];
        for (let i = 0; i <= segments; i += 1) {
            const a = (i / segments) * Math.PI * 2;
            pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
        const material = new THREE.LineBasicMaterial({ color: '#ffcf6e', transparent: true, opacity: 0.3 });
        const line = new THREE.Line(geometry, material);
        line.frustumCulled = false;
        return line;
    }, []);
    useEffect(() => () => {
        lineObject.geometry.dispose();
        (lineObject.material as THREE.Material).dispose();
    }, [lineObject]);

    return (
        <group>
            <primitive object={lineObject} />
        </group>
    );
}

/**
 * Generic heliocentric orbit polyline drawn from a Float32Array of XYZ points. Used by
 * HeliocentricScene to render the asteroid's full Kepler ellipse with frustumCulled off.
 */
export function OrbitLineHelio({ points, color, opacity = 0.85 }: { points: Float32Array; color: string; opacity?: number }) {
    const lineObject = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
        const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
        const line = new THREE.Line(geometry, material);
        line.frustumCulled = false;
        return line;
    }, [points, color, opacity]);
    useEffect(() => () => {
        lineObject.geometry.dispose();
        (lineObject.material as THREE.Material).dispose();
    }, [lineObject]);

    return <primitive object={lineObject} />;
}

/**
 * Earth orbit reference drawn around the DISPLAYED Sun in the geocentric radar scene (at the
 * log-compressed SUN_DISPLAY_DL distance). Built in the ecliptic plane (scene XZ) so the ring
 * stays flat. Kept here because it conceptually belongs with the other "ring around a body" lines.
 */
export function SunOrbitGuide({
    sunDirection,
}: {
    sunDirection: [number, number, number];
}) {
    const orbit = useMemo(() => {
        const center = sunEclipticDisplayPosition(sunDirection);
        const radius = center.length();
        const earthDir = center.clone().multiplyScalar(-1).normalize();
        const tangent = new THREE.Vector3(-earthDir.z, 0, earthDir.x).normalize();
        const segments = 192;
        const pts: number[] = [];
        for (let i = 0; i <= segments; i += 1) {
            const a = (i / segments) * Math.PI * 2;
            const p = center.clone()
                .add(earthDir.clone().multiplyScalar(Math.cos(a) * radius))
                .add(tangent.clone().multiplyScalar(Math.sin(a) * radius));
            pts.push(p.x, p.y, p.z);
        }
        return { points: new Float32Array(pts) };
    }, [sunDirection]);

    const lineObject = useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(orbit.points, 3));
        const material = new THREE.LineBasicMaterial({ color: '#ffcf6e', transparent: true, opacity: 0.3 });
        const line = new THREE.Line(geometry, material);
        line.frustumCulled = false;
        return line;
    }, [orbit.points]);
    useEffect(() => () => {
        lineObject.geometry.dispose();
        (lineObject.material as THREE.Material).dispose();
    }, [lineObject]);

    return (
        <group>
            <primitive object={lineObject} />
        </group>
    );
}
