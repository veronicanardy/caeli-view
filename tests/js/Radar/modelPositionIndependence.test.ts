/**
 * Garante a separação entre POSIÇÃO (ciência) e MODELO (aparência) do asteroide.
 *
 * A posição de um asteroide vem sempre da pipeline científica (currentPositionInScene),
 * que só lê o vetor de trajetória do Horizons. Trocar o modelo 3D — genérico, real ou
 * fallback — não pode mover o objeto. Estes testes travam essa independência:
 *
 *  - a escolha do modelo (asteroidRenderableModelFor) só depende da IDENTIDADE;
 *  - a posição (currentPositionInScene) só depende da TRAJETÓRIA;
 *  - asteroide conhecido usa modelo exclusivo; sem identidade, cai no genérico.
 */

import { describe, expect, it } from 'vitest';
import { asteroidRenderableModelFor } from '@/Components/Radar/Bodies/Asteroid/asteroidModelRegistry';
import { currentPositionInScene } from '@/lib/radar/trajectorySampling';
import { KM_PER_LD } from '@/lib/sceneEphemeris';
import type { ClosestNowObject } from '@/types';

/**
 * Constrói um objeto com uma trajetória mínima (currentPoint) e identidade configurável.
 * O ponto é geocêntrico eclíptico J2000 em km, como o Horizons entrega.
 */
function makeObject(opts: {
    name?: string;
    spkId?: string | null;
    permanentNumber?: string | null;
    point?: { x: number; y: number; z?: number };
}): ClosestNowObject {
    return {
        approach: {
            id: 'test',
            name: opts.name ?? 'Unknown',
            displayName: null,
            rawName: null,
            properName: null,
            designation: null,
            provisionalDesignation: null,
            detailIdentifier: null,
            aliases: [],
            permanentNumber: opts.permanentNumber ?? null,
            spkId: opts.spkId ?? null,
        },
        trajectory: opts.point
            ? { currentPoint: { x: opts.point.x, y: opts.point.y, z: opts.point.z ?? 0, timestamp: '2026-01-01T00:00:00Z' } }
            : null,
    } as unknown as ClosestNowObject;
}

describe('modelo e posição são independentes', () => {
    // Uma trajetória fixa, reutilizada com identidades diferentes.
    const point = { x: 3 * KM_PER_LD, y: 4 * KM_PER_LD, z: 0 };

    it('a posição é idêntica para o mesmo ponto, qualquer que seja o modelo escolhido', () => {
        const generic = makeObject({ name: '2025 XY1', point });
        const known = makeObject({ name: 'Eros', spkId: '433', point });

        // Modelos diferentes…
        expect(asteroidRenderableModelFor(generic).asset.key).toBe('generic');
        expect(asteroidRenderableModelFor(known).asset.key).toBe('eros');

        // …mas a posição calculada é exatamente a mesma (depende só da trajetória).
        const posGeneric = currentPositionInScene(generic);
        const posKnown = currentPositionInScene(known);
        expect(posGeneric).not.toBeNull();
        expect(posKnown).toEqual(posGeneric);
    });

    it('mudar a identidade (e portanto o modelo) não altera a posição', () => {
        const before = currentPositionInScene(makeObject({ name: 'anon', point }));
        const after = currentPositionInScene(makeObject({ name: 'Bennu', permanentNumber: '101955', point }));
        expect(after).toEqual(before);
    });

    it('asteroide conhecido usa modelo exclusivo quando disponível', () => {
        expect(asteroidRenderableModelFor(makeObject({ name: 'Vesta' })).asset.key).toBe('vesta');
        expect(asteroidRenderableModelFor(makeObject({ name: 'x', spkId: '25143' })).asset.key).toBe('itokawa');
    });

    it('asteroide sem identidade conhecida cai no modelo genérico (fallback)', () => {
        const r = asteroidRenderableModelFor(makeObject({ name: '2024 PT5', permanentNumber: '987654' }));
        expect(r.asset.key).toBe('generic');
        expect(r.asset.url).toBeTruthy(); // fallback sempre tem um GLB carregável
    });

    it('a escolha do modelo não depende da trajetória (com ou sem ponto, mesmo modelo)', () => {
        const withTraj = asteroidRenderableModelFor(makeObject({ name: 'Ceres', point }));
        const withoutTraj = asteroidRenderableModelFor(makeObject({ name: 'Ceres' }));
        expect(withTraj.asset.key).toBe(withoutTraj.asset.key);
        expect(withTraj.asset.key).toBe('ceres');
    });
});
