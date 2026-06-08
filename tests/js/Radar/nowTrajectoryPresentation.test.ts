import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
    getMovementDirection,
    getTrajectoryOpacities,
    isPointOnDrawnPath,
    isTimeTickOnDrawnPath,
} from '@/Components/Radar/Trajectory/nowTrajectoryPresentation';
import type { TrajectoryPoint } from '@/types';

/**
 * `nowTrajectoryPresentation` decide direção visual e opacidades da trajetória 3D.
 * Erros aqui afetam o cone de direção e o gradiente — impacto visual direto.
 *
 * Ponto de atenção: `getMovementDirection` usa dois limiares distintos —
 * 1e-12 para o vetor de velocidade e 1e-8 para o fallback geométrico.
 */

// ─── getMovementDirection ─────────────────────────────────────────────────────

function makePoint(vx: number, vy: number, vz?: number): TrajectoryPoint {
    return { x: 0, y: 0, z: 0, distanceKm: null, timestamp: null, vx, vy, vz: vz ?? undefined } as TrajectoryPoint;
}

const V_UNIT_X = makePoint(1, 0, 0);

describe('getMovementDirection', () => {
    it('retorna null quando currentPoint é null e não há pontos passados', () => {
        expect(getMovementDirection(null, [])).toBeNull();
    });

    it('retorna null quando currentPoint é undefined e não há pontos passados', () => {
        expect(getMovementDirection(undefined, [])).toBeNull();
    });

    it('usa vetor de velocidade Horizons quando disponível', () => {
        const dir = getMovementDirection(V_UNIT_X, []);
        expect(dir).not.toBeNull();
        expect(dir!.x).toBeCloseTo(1, 6);
        expect(dir!.y).toBeCloseTo(0, 6);
    });

    it('retorna vetor normalizado para velocidade Horizons', () => {
        const dir = getMovementDirection(makePoint(3, 4, 0), []);
        expect(dir).not.toBeNull();
        expect(dir!.length()).toBeCloseTo(1, 6);
    });

    it('remapeia eixos corretamente: vx→x, vz→y, -vy→z', () => {
        // Velocidade pura em vy → deve virar -z na cena
        const dir = getMovementDirection(makePoint(0, 1, 0), []);
        expect(dir).not.toBeNull();
        expect(dir!.x).toBeCloseTo(0, 6);
        expect(dir!.z).toBeCloseTo(-1, 6);
    });

    it('cai para fallback geométrico quando velocidade é vetor zero', () => {
        const past = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];
        const dir = getMovementDirection(makePoint(0, 0, 0), past);
        expect(dir).not.toBeNull();
        expect(dir!.x).toBeCloseTo(1, 6);
    });

    it('retorna null quando velocidade é zero e há menos de 2 pontos passados', () => {
        expect(getMovementDirection(makePoint(0, 0, 0), [])).toBeNull();
        expect(getMovementDirection(makePoint(0, 0, 0), [new THREE.Vector3()])).toBeNull();
    });

    it('cai para fallback geométrico quando currentPoint é null mas há pontos passados', () => {
        const past = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)];
        const dir = getMovementDirection(null, past);
        expect(dir).not.toBeNull();
        expect(dir!.y).toBeCloseTo(1, 6);
    });

    it('retorna null quando os dois últimos pontos passados são coincidentes (degenerado)', () => {
        const same = new THREE.Vector3(5, 5, 5);
        const dir = getMovementDirection(null, [same, same.clone()]);
        expect(dir).toBeNull();
    });

    it('vetor de velocidade tem precedência sobre fallback geométrico', () => {
        const past = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0)];
        // velocidade aponta em x, pontos passados apontam em y
        const dir = getMovementDirection(V_UNIT_X, past);
        expect(dir!.x).toBeCloseTo(1, 6);
        expect(dir!.y).toBeCloseTo(0, 6);
    });
});

// ─── getTrajectoryOpacities ───────────────────────────────────────────────────

describe('getTrajectoryOpacities', () => {
    it('retorna opacidades máximas quando emphasized é true', () => {
        const { pastPeakOpacity, coneOpacity } = getTrajectoryOpacities(true, false);
        expect(pastPeakOpacity).toBe(0.55);
        expect(coneOpacity).toBe(1.0);
    });

    it('retorna opacidades mínimas quando dimmed é true', () => {
        const { pastPeakOpacity, coneOpacity } = getTrajectoryOpacities(false, true);
        expect(pastPeakOpacity).toBe(0.12);
        expect(coneOpacity).toBe(0.58);
    });

    it('retorna opacidades neutras quando nenhum flag está ativo', () => {
        const { pastPeakOpacity, coneOpacity } = getTrajectoryOpacities(false, false);
        expect(pastPeakOpacity).toBe(0.32);
        expect(coneOpacity).toBe(0.92);
    });

    it('emphasized tem precedência sobre dimmed', () => {
        const { pastPeakOpacity } = getTrajectoryOpacities(true, true);
        expect(pastPeakOpacity).toBe(0.55);
    });
});

// ─── isPointOnDrawnPath / isTimeTickOnDrawnPath ───────────────────────────────

describe('isPointOnDrawnPath', () => {
    it('retorna false quando point é null', () => {
        const past = [new THREE.Vector3(0, 0, 0)];
        expect(isPointOnDrawnPath(null, past)).toBe(false);
    });

    it('retorna false quando nenhum ponto do path está perto o suficiente', () => {
        const point = { vec: new THREE.Vector3(100, 0, 0) } as any;
        const past = [new THREE.Vector3(0, 0, 0)];
        expect(isPointOnDrawnPath(point, past)).toBe(false);
    });

    it('retorna true quando há um ponto do path dentro do threshold', () => {
        const point = { vec: new THREE.Vector3(0.001, 0, 0) } as any;
        const past = [new THREE.Vector3(0, 0, 0)];
        expect(isPointOnDrawnPath(point, past)).toBe(true);
    });
});

describe('isTimeTickOnDrawnPath', () => {
    it('retorna false quando nenhum ponto do path está perto', () => {
        const tick = new THREE.Vector3(100, 0, 0);
        const past = [new THREE.Vector3(0, 0, 0)];
        expect(isTimeTickOnDrawnPath(tick, past)).toBe(false);
    });

    it('retorna true quando tick está perto de um ponto do path', () => {
        const tick = new THREE.Vector3(0.001, 0, 0);
        const past = [new THREE.Vector3(0, 0, 0)];
        expect(isTimeTickOnDrawnPath(tick, past)).toBe(true);
    });
});
