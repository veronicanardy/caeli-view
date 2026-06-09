import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    EARTH_OBLIQUITY_RAD,
    EARTH_POLAR_AXIS_SCENE,
    geoToModelDir,
    orientEarth,
    orientMoonTidal,
} from '@/lib/radar/earthOrientation';

/**
 * Esta suíte valida contratos geométricos das orientações da Terra e da Lua.
 * O foco é sanidade matemática: direção, eixo polar, quaternion finito e
 * comportamento seguro para entradas degeneradas.
 */
describe('geoToModelDir', () => {
    it('mapeia Greenwich (0°, 0°) para +X no modelo', () => {
        const v = geoToModelDir(0, 0);
        expect(v.x).toBeCloseTo(1, 12);
        expect(v.y).toBeCloseTo(0, 12);
        expect(v.z).toBeCloseTo(0, 12);
    });

    it('mapeia o polo norte para +Y no modelo', () => {
        const v = geoToModelDir(90, 0);
        expect(v.x).toBeCloseTo(0, 12);
        expect(v.y).toBeCloseTo(1, 12);
        expect(v.z).toBeCloseTo(0, 12);
    });

    it('mapeia 90°E para -Z no modelo', () => {
        const v = geoToModelDir(0, 90);
        expect(v.x).toBeCloseTo(0, 12);
        expect(v.y).toBeCloseTo(0, 12);
        expect(v.z).toBeCloseTo(-1, 12);
    });

    it('mapeia 90°W para +Z no modelo', () => {
        const v = geoToModelDir(0, -90);
        expect(v.x).toBeCloseTo(0, 12);
        expect(v.y).toBeCloseTo(0, 12);
        expect(v.z).toBeCloseTo(1, 12);
    });

    it('sempre retorna um vetor unitário', () => {
        for (const [lat, lon] of [[12, 34], [-78, 5], [23.5, -120]] as const) {
            expect(geoToModelDir(lat, lon).length()).toBeCloseTo(1, 12);
        }
    });
});

describe('EARTH_POLAR_AXIS_SCENE', () => {
    it('é um vetor unitário inclinado 23,44° de +Y da cena em direção a -Z', () => {
        expect(EARTH_POLAR_AXIS_SCENE.length()).toBeCloseTo(1, 12);
        expect(EARTH_POLAR_AXIS_SCENE.y).toBeCloseTo(Math.cos(EARTH_OBLIQUITY_RAD), 12);
        expect(EARTH_POLAR_AXIS_SCENE.z).toBeCloseTo(-Math.sin(EARTH_OBLIQUITY_RAD), 12);
    });
});

describe('orientEarth', () => {
    /**
     * Aplica o quaternion calculado pelo helper a um vetor em espaço de modelo.
     */
    function applyToModelVector(group: THREE.Group, model: THREE.Vector3): THREE.Vector3 {
        return model.clone().applyQuaternion(group.quaternion);
    }

    it('posiciona o polo norte do modelo sobre o eixo polar inercial', () => {
        const group = new THREE.Group();
        orientEarth(group, [1, 0, 0], 0, 0);
        const worldPole = applyToModelVector(group, new THREE.Vector3(0, 1, 0));

        expect(worldPole.x).toBeCloseTo(EARTH_POLAR_AXIS_SCENE.x, 6);
        expect(worldPole.y).toBeCloseTo(EARTH_POLAR_AXIS_SCENE.y, 6);
        expect(worldPole.z).toBeCloseTo(EARTH_POLAR_AXIS_SCENE.z, 6);
    });

    it('alinha o ponto geográfico subsolar com o Sol em um caso simples coerente', () => {
        const group = new THREE.Group();
        orientEarth(group, [1, 0, 0], 0, 0);

        const subsolarModel = geoToModelDir(0, 0);
        const worldSubsolar = applyToModelVector(group, subsolarModel);

        expect(worldSubsolar.x).toBeCloseTo(1, 5);
        expect(worldSubsolar.y).toBeCloseTo(0, 5);
        expect(worldSubsolar.z).toBeCloseTo(0, 5);
    });

    it('mantém o eixo polar válido e o quaternion finito para entradas coerentes arbitrárias', () => {
        const group = new THREE.Group();
        const sunDir: [number, number, number] = [0.6, 0.1, -0.79];
        const len = Math.hypot(...sunDir);
        const unit: [number, number, number] = [sunDir[0] / len, sunDir[1] / len, sunDir[2] / len];

        orientEarth(group, unit, 23.4393, 120);

        // Aqui não exigimos alinhamento "perfeito" de um caso arbitrário; protegemos invariantes válidas.
        const worldPole = applyToModelVector(group, new THREE.Vector3(0, 1, 0));
        expect(worldPole.distanceTo(EARTH_POLAR_AXIS_SCENE)).toBeLessThan(1e-5);
        expect(Number.isFinite(group.quaternion.x)).toBe(true);
        expect(Number.isFinite(group.quaternion.y)).toBe(true);
        expect(Number.isFinite(group.quaternion.z)).toBe(true);
        expect(Number.isFinite(group.quaternion.w)).toBe(true);
    });
});

describe('orientMoonTidal', () => {
    it('rotaciona a face visível lunar (modelo +X) para encarar a Terra com vetor Terra-Lua em +X', () => {
        const mesh = new THREE.Mesh();
        orientMoonTidal(mesh, [3, 0, 0]);

        const nearSideWorld = new THREE.Vector3(1, 0, 0).applyQuaternion(mesh.quaternion);
        expect(nearSideWorld.x).toBeCloseTo(-1, 6);
        expect(nearSideWorld.y).toBeCloseTo(0, 6);
        expect(nearSideWorld.z).toBeCloseTo(0, 6);
    });

    it('rotaciona a face visível lunar (modelo +X) para encarar a Terra com vetor Terra-Lua em +Z', () => {
        const mesh = new THREE.Mesh();
        orientMoonTidal(mesh, [0, 0, 3]);

        const nearSideWorld = new THREE.Vector3(1, 0, 0).applyQuaternion(mesh.quaternion);
        expect(nearSideWorld.x).toBeCloseTo(0, 6);
        expect(nearSideWorld.y).toBeCloseTo(0, 6);
        expect(nearSideWorld.z).toBeCloseTo(-1, 6);
    });

    it('mantém o polo norte lunar próximo de +Y da cena', () => {
        const mesh = new THREE.Mesh();
        orientMoonTidal(mesh, [2.5, 0.3, 1.1]);
        const northWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(mesh.quaternion);

        expect(northWorld.y).toBeGreaterThan(0.95);
    });

    it('preserva a orientação atual para o vetor nulo degenerado', () => {
        const mesh = new THREE.Mesh();
        const initial = mesh.quaternion.clone();
        orientMoonTidal(mesh, [0, 0, 0]);

        expect(mesh.quaternion.equals(initial)).toBe(true);
    });

    it('produz um quaternion finito para vetores válidos não degenerados', () => {
        const mesh = new THREE.Mesh();
        orientMoonTidal(mesh, [0.8, 0.1, -0.5]);

        expect(Number.isFinite(mesh.quaternion.x)).toBe(true);
        expect(Number.isFinite(mesh.quaternion.y)).toBe(true);
        expect(Number.isFinite(mesh.quaternion.z)).toBe(true);
        expect(Number.isFinite(mesh.quaternion.w)).toBe(true);
    });
});
