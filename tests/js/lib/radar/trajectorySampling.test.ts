import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, TrajectoryPoint } from '@/types';
import {
    clipPolylineByLength,
    collectTimeTicks,
    findClosestApproachPoint,
    hasRenderableHelioPosition,
    trajectoryFramePoints,
    type PointProjector,
} from '@/lib/radar/trajectorySampling';
import { KM_PER_LD } from '@/lib/sceneEphemeris';

/**
 * Projetor de teste: leva o ponto à cena preservando os eixos (sem escala). As funções de amostragem
 * exigem um projetor (a régua heliocêntrica é injetada em produção); aqui só precisamos de algo
 * determinístico que mantenha ordem e magnitude relativa, então a identidade basta.
 */
const project: PointProjector = (p) => new THREE.Vector3(p.x, p.y, p.z ?? 0);

function makePoint(over: Partial<TrajectoryPoint> = {}): TrajectoryPoint {
    return {
        timestamp: '2026-05-28T12:00:00Z',
        x: 0,
        y: 0,
        z: 0,
        vx: null,
        vy: null,
        vz: null,
        rangeKm: null,
        rangeRateKmS: null,
        distanceKm: 0,
        distanceLunar: 0,
        ...over,
    };
}

function makeTrajectory(over: Partial<AsteroidTrajectory> = {}): AsteroidTrajectory {
    return {
        objectId: 'test',
        objectName: 'Test',
        source: 'JPL Horizons',
        center: 'Earth',
        projection: '3D ecliptic J2000',
        closestApproachTime: null,
        points: [],
        pastPoints: [],
        futurePoints: [],
        currentPoint: null,
        currentDistanceKm: null,
        currentDistanceLD: null,
        referencePoint: null,
        motionState: 'unknown',
        orbitalElements: null,
        status: 'available',
        note: null,
        anchor: 'now',
        anchorTime: '2026-05-28T12:00:00Z',
        ...over,
    } as AsteroidTrajectory;
}

describe('clipPolylineByLength', () => {
    it('retorna a entrada sem alterações quando não é necessário cortar', () => {
        const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(2, 0, 0)];
        const kept = clipPolylineByLength(pts, 10);
        expect(kept).toHaveLength(3);
        expect(kept[2].x).toBeCloseTo(2, 9);
    });

    it('retorna ao menos o primeiro ponto quando a polilinha tem um único ponto', () => {
        const pts = [new THREE.Vector3(0, 0, 0)];
        const kept = clipPolylineByLength(pts, 5);
        expect(kept).toHaveLength(1);
    });

    it('insere um ponto final interpolado exatamente no comprimento solicitado', () => {
        const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)];
        const kept = clipPolylineByLength(pts, 3);
        expect(kept).toHaveLength(2);
        expect(kept[1].x).toBeCloseTo(3, 9);
        expect(kept[1].y).toBeCloseTo(0, 9);
        expect(kept[1].z).toBeCloseTo(0, 9);
    });

    it('ignora segmentos de comprimento zero sem entrar em loop infinito', () => {
        const pts = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0), // duplicate
            new THREE.Vector3(2, 0, 0),
        ];
        const kept = clipPolylineByLength(pts, 5);
        expect(kept.at(-1)?.x).toBeCloseTo(2, 9);
    });
});

describe('findClosestApproachPoint', () => {
    it('retorna null quando a trajetória não tem pontos', () => {
        expect(findClosestApproachPoint(makeTrajectory(), project)).toBeNull();
    });

    it('encontra o mínimo entre passado, atual e futuro', () => {
        const trajectory = makeTrajectory({
            pastPoints: [makePoint({ distanceKm: 5e6, timestamp: '2026-05-27T00:00:00Z' })],
            currentPoint: makePoint({ distanceKm: 1e6, timestamp: '2026-05-28T12:00:00Z' }),
            futurePoints: [makePoint({ distanceKm: 3e6, timestamp: '2026-05-29T00:00:00Z' })],
        });
        const best = findClosestApproachPoint(trajectory, project);
        expect(best).not.toBeNull();
        expect(best!.distanceKm).toBeCloseTo(1e6, 6);
        expect(best!.timestamp).toBe('2026-05-28T12:00:00Z');
    });

    it('faz fallback para a norma euclidiana quando distanceKm está ausente', () => {
        const trajectory = makeTrajectory({
            pastPoints: [makePoint({ x: 3, y: 4, z: 0, distanceKm: undefined as unknown as number })],
        });
        const best = findClosestApproachPoint(trajectory, project);
        expect(best!.distanceKm).toBeCloseTo(5, 9);
    });
});

describe('collectTimeTicks', () => {
    it('retorna vazio quando não há tempo âncora em currentPoint', () => {
        expect(collectTimeTicks(makeTrajectory(), project)).toEqual([]);
    });

    it('retorna marcas para amostras dentro de 6h dos alvos -24h e -48h', () => {
        const HOUR = 3_600_000;
        const now = new Date('2026-05-28T12:00:00Z').getTime();
        const at = (offsetHours: number) => new Date(now + offsetHours * HOUR).toISOString();

        // collectTimeTicks busca apenas no passado: -24h, -48h, -72h, -7d, -30d.
        // Labels usam hífen normal (U+002D), não sinal de menos matemático.
        const trajectory = makeTrajectory({
            currentPoint: makePoint({ timestamp: at(0) }),
            pastPoints: [
                makePoint({ timestamp: at(-24) }),
                makePoint({ timestamp: at(-48) }),
            ],
            futurePoints: [],
        });

        const ticks = collectTimeTicks(trajectory, project);
        expect(ticks.map((t) => t.label)).toEqual(['-24h', '-48h']);
    });

    it('ignora marcas quando nenhuma amostra está a até 6h do alvo', () => {
        const HOUR = 3_600_000;
        const now = new Date('2026-05-28T12:00:00Z').getTime();
        const at = (offsetHours: number) => new Date(now + offsetHours * HOUR).toISOString();

        const trajectory = makeTrajectory({
            currentPoint: makePoint({ timestamp: at(0) }),
            // Only an explicit "now" sample, no neighbours. None of the target ticks should appear.
            pastPoints: [],
            futurePoints: [],
        });
        // The currentPoint itself is included in `all`, but it's 24h+ away from every target.
        const ticks = collectTimeTicks(trajectory, project);
        expect(ticks).toEqual([]);
    });
});


// ─── trajectoryFramePoints ────────────────────────────────────────────────────

describe('trajectoryFramePoints', () => {
    const HOUR = 3_600_000;
    const now = new Date('2026-05-28T12:00:00Z').getTime();
    const at = (offsetHours: number) => new Date(now + offsetHours * HOUR).toISOString();

    it('mantém amostras até 78h atrás e descarta as mais antigas', () => {
        const trajectory = makeTrajectory({
            currentPoint: makePoint({ timestamp: at(0), x: 0 }),
            pastPoints: [
                makePoint({ timestamp: at(-100), x: 5 * KM_PER_LD }),
                makePoint({ timestamp: at(-72), x: 3 * KM_PER_LD }),
                makePoint({ timestamp: at(-24), x: 1 * KM_PER_LD }),
            ],
        });
        const points = trajectoryFramePoints(trajectory, 78, project);
        // -100h cai fora; -72h, -24h e o ponto atual permanecem, em ordem cronológica.
        expect(points).toHaveLength(3);
        expect(points[0].x).toBeGreaterThan(points[1].x);
        expect(points[2].x).toBeCloseTo(0, 9);
    });

    it('sem timestamp legível no currentPoint, mantém todas as amostras', () => {
        const trajectory = makeTrajectory({
            currentPoint: makePoint({ timestamp: 'invalida', x: 0 }),
            pastPoints: [
                makePoint({ timestamp: at(-300), x: 9 * KM_PER_LD }),
                makePoint({ timestamp: at(-24), x: 1 * KM_PER_LD }),
            ],
        });
        expect(trajectoryFramePoints(trajectory, 78, project)).toHaveLength(3);
    });

    it('amostra sem timestamp legível entra no trecho (não esconde trajetória real)', () => {
        const trajectory = makeTrajectory({
            currentPoint: makePoint({ timestamp: at(0), x: 0 }),
            pastPoints: [
                makePoint({ timestamp: 'sem-data', x: 2 * KM_PER_LD }),
                makePoint({ timestamp: at(-24), x: 1 * KM_PER_LD }),
            ],
        });
        expect(trajectoryFramePoints(trajectory, 78, project)).toHaveLength(3);
    });

    it('sem currentPoint, retorna apenas o passado dentro da janela', () => {
        const trajectory = makeTrajectory({
            currentPoint: null,
            pastPoints: [makePoint({ timestamp: at(-24), x: KM_PER_LD })],
        });
        const points = trajectoryFramePoints(trajectory, 78, project);
        expect(points).toHaveLength(1);
    });
});

describe('hasRenderableHelioPosition (limite por tipo)', () => {
    const objectWith = (
        trajectory: AsteroidTrajectory | null,
        objectType: 'asteroid' | 'comet' = 'asteroid',
    ): ClosestNowObject =>
        ({ approach: { id: 'x', objectType }, trajectory } as unknown as ClosestNowObject);

    it('asteroide: true dentro do limite (~5 UA)', () => {
        const obj = objectWith(makeTrajectory({ currentPoint: makePoint({ x: 100_000_000 }) }));
        expect(hasRenderableHelioPosition(obj)).toBe(true);
    });

    it('asteroide: false além de 750M km (vetor provavelmente corrompido)', () => {
        const obj = objectWith(makeTrajectory({ currentPoint: makePoint({ x: 1_000_000_000 }) }));
        expect(hasRenderableHelioPosition(obj)).toBe(false);
    });

    it('cometa: true a bilhões de km (afélio de Halley é distância legítima)', () => {
        // ~5,4 bilhões de km: Halley perto do afélio. Para cometa o limite é muito maior.
        const obj = objectWith(makeTrajectory({ currentPoint: makePoint({ x: 5_400_000_000 }) }), 'comet');
        expect(hasRenderableHelioPosition(obj)).toBe(true);
    });

    it('cometa: false só num absurdo bem além do afélio (> 8 bilhões de km)', () => {
        const obj = objectWith(makeTrajectory({ currentPoint: makePoint({ x: 9_000_000_000 }) }), 'comet');
        expect(hasRenderableHelioPosition(obj)).toBe(false);
    });

    it('é false sem trajetória ou sem ponto atual', () => {
        expect(hasRenderableHelioPosition(objectWith(null))).toBe(false);
        expect(hasRenderableHelioPosition(objectWith(makeTrajectory({ currentPoint: null })))).toBe(false);
    });
});
