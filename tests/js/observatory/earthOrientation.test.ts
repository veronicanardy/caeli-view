import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    EARTH_OBLIQUITY_RAD,
    EARTH_POLAR_AXIS_SCENE,
    geoToModelDir,
    orientEarth,
    orientMoonTidal,
} from '@/lib/observatory/earthOrientation';

describe('geoToModelDir', () => {
    it('maps Greenwich (0°, 0°) to model +X', () => {
        const v = geoToModelDir(0, 0);
        expect(v.x).toBeCloseTo(1, 12);
        expect(v.y).toBeCloseTo(0, 12);
        expect(v.z).toBeCloseTo(0, 12);
    });

    it('maps the north pole to model +Y', () => {
        const v = geoToModelDir(90, 0);
        expect(v.x).toBeCloseTo(0, 12);
        expect(v.y).toBeCloseTo(1, 12);
        expect(v.z).toBeCloseTo(0, 12);
    });

    it('maps 90°E to model −Z (matches the equirectangular UV convention)', () => {
        const v = geoToModelDir(0, 90);
        expect(v.x).toBeCloseTo(0, 12);
        expect(v.y).toBeCloseTo(0, 12);
        expect(v.z).toBeCloseTo(-1, 12);
    });

    it('maps 90°W to model +Z', () => {
        const v = geoToModelDir(0, -90);
        expect(v.x).toBeCloseTo(0, 12);
        expect(v.y).toBeCloseTo(0, 12);
        expect(v.z).toBeCloseTo(1, 12);
    });

    it('always returns a unit vector', () => {
        for (const [lat, lon] of [[12, 34], [-78, 5], [23.5, -120]] as const) {
            expect(geoToModelDir(lat, lon).length()).toBeCloseTo(1, 12);
        }
    });
});

describe('EARTH_POLAR_AXIS_SCENE', () => {
    it('is a unit vector tilted 23.44° from scene +Y towards scene −Z', () => {
        expect(EARTH_POLAR_AXIS_SCENE.length()).toBeCloseTo(1, 12);
        expect(EARTH_POLAR_AXIS_SCENE.y).toBeCloseTo(Math.cos(EARTH_OBLIQUITY_RAD), 12);
        expect(EARTH_POLAR_AXIS_SCENE.z).toBeCloseTo(-Math.sin(EARTH_OBLIQUITY_RAD), 12);
    });
});

describe('orientEarth', () => {
    /** Apply the group's quaternion to a model-space vector and return the world-space result. */
    function applyToModelVector(group: THREE.Group, model: THREE.Vector3): THREE.Vector3 {
        return model.clone().applyQuaternion(group.quaternion);
    }

    it('puts the model north pole on the inertial polar axis (preserves the 23.44° tilt)', () => {
        const group = new THREE.Group();
        orientEarth(group, [1, 0, 0], 0, 0);
        const worldPole = applyToModelVector(group, new THREE.Vector3(0, 1, 0));
        expect(worldPole.x).toBeCloseTo(EARTH_POLAR_AXIS_SCENE.x, 6);
        expect(worldPole.y).toBeCloseTo(EARTH_POLAR_AXIS_SCENE.y, 6);
        expect(worldPole.z).toBeCloseTo(EARTH_POLAR_AXIS_SCENE.z, 6);
    });

    it('puts the subsolar geographic point on the Sun direction', () => {
        const group = new THREE.Group();
        // Sun straight along +X; subsolar (lat=0, lon=0) is the model +X point.
        orientEarth(group, [1, 0, 0], 0, 0);
        const subsolarModel = geoToModelDir(0, 0);
        const worldSubsolar = applyToModelVector(group, subsolarModel);
        // Subsolar must align with the Sun direction in world space.
        expect(worldSubsolar.x).toBeCloseTo(1, 5);
        expect(worldSubsolar.y).toBeCloseTo(0, 5);
        expect(worldSubsolar.z).toBeCloseTo(0, 5);
    });

    it('handles arbitrary Sun direction + subsolar pair without collapsing the obliquity', () => {
        const group = new THREE.Group();
        const sunDir: [number, number, number] = [0.6, 0.1, -0.79];
        const len = Math.hypot(...sunDir);
        const unit: [number, number, number] = [sunDir[0] / len, sunDir[1] / len, sunDir[2] / len];
        // June-ish solstice: subsolar at +23.44°. Pick an arbitrary longitude.
        orientEarth(group, unit, 23.4393, 120);
        const worldPole = applyToModelVector(group, new THREE.Vector3(0, 1, 0));
        // North pole must still land on the inertial polar axis — independent of the Sun direction.
        expect(worldPole.distanceTo(EARTH_POLAR_AXIS_SCENE)).toBeLessThan(1e-5);
    });
});

describe('orientMoonTidal', () => {
    it('rotates the lunar near-side (model +X) to face Earth at the origin', () => {
        const mesh = new THREE.Mesh();
        const moonPos: [number, number, number] = [3, 0, 0];
        orientMoonTidal(mesh, moonPos);
        // After rotation, model +X (near side) should point AT Earth, i.e. towards −X in world space
        // (because Earth is at the origin and the Moon sits at +3 along X).
        const nearSideWorld = new THREE.Vector3(1, 0, 0).applyQuaternion(mesh.quaternion);
        expect(nearSideWorld.x).toBeCloseTo(-1, 6);
        expect(nearSideWorld.y).toBeCloseTo(0, 6);
        expect(nearSideWorld.z).toBeCloseTo(0, 6);
    });

    it('keeps the lunar north pole close to scene +Y', () => {
        const mesh = new THREE.Mesh();
        orientMoonTidal(mesh, [2.5, 0.3, 1.1]);
        const northWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.quaternion);
        // Allow the small tilt that comes from the Gram-Schmidt projection; just check the Y
        // component dominates.
        expect(northWorld.y).toBeGreaterThan(0.95);
    });

    it('does nothing when the Moon sits at the scene origin (degenerate)', () => {
        const mesh = new THREE.Mesh();
        const initial = mesh.quaternion.clone();
        orientMoonTidal(mesh, [0, 0, 0]);
        expect(mesh.quaternion.equals(initial)).toBe(true);
    });
});
