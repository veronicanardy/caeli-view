import { describe, expect, it } from 'vitest';
import {
    cometModelAsset,
    cometModelForObject,
} from '@/Components/Radar/Bodies/Comet/cometModelRegistry';
import { KNOWN_COMETS, knownCometId } from '@/Components/Radar/Bodies/Comet/knownComets';
import type { ClosestNowObject } from '@/types';

/**
 * `cometModelRegistry` escolhe o GLB do núcleo de cada cometa: 67P tem shape model real (c67p), os
 * demais reusam o genérico texturizado dos asteroides. cometModelForObject casa o objeto do feed pelo id.
 */

function makeObject(id: string, objectType: 'asteroid' | 'comet'): ClosestNowObject {
    return { approach: { id, objectType } } as unknown as ClosestNowObject;
}

describe('cometModelAsset', () => {
    it('67P usa o modelo real próprio; o genérico reusa o MESMO GLB dos asteroides', () => {
        expect(cometModelAsset('c67p').url).toContain('67p');
        // Unificado: cometa sem modelo próprio usa o genérico texturizado dos asteroides, garantindo
        // cor/textura idênticas à rocha (resolve o descasamento de cor que havia com um GLB sem textura).
        expect(cometModelAsset('generic-comet').url).toContain('Asteroid_2f_small');
    });

    it('cada cometa conhecido resolve para um asset com url de GLB', () => {
        for (const comet of KNOWN_COMETS) {
            const asset = cometModelAsset(comet.modelKey);
            expect(asset.url).toMatch(/\.glb$/);
        }
    });

    it('só o 67P aponta para o modelo real; os demais para o genérico', () => {
        const m = Object.fromEntries(KNOWN_COMETS.map((c) => [c.name, c.modelKey]));
        expect(m['67P Churyumov-Gerasimenko']).toBe('c67p');
        expect(m['Halley']).toBe('generic-comet');
        expect(m['Encke']).toBe('generic-comet');
    });
});

describe('cometModelForObject', () => {
    it('resolve um cometa do feed pelo id sintético para seu núcleo', () => {
        const halley = KNOWN_COMETS.find((c) => c.name === 'Halley')!;
        const obj = makeObject(knownCometId(halley), 'comet');
        // Halley reusa o genérico texturizado dos asteroides (unificado).
        expect(cometModelForObject(obj)?.url).toContain('Asteroid_2f_small');

        const c67p = KNOWN_COMETS.find((c) => c.designation === '67P')!;
        const obj67 = makeObject(knownCometId(c67p), 'comet');
        expect(cometModelForObject(obj67)?.url).toContain('67p');
    });

    it('devolve null para objeto que não é cometa, ou cometa desconhecido', () => {
        expect(cometModelForObject(makeObject('known:1', 'asteroid'))).toBeNull();
        expect(cometModelForObject(makeObject('2024 AB', 'asteroid'))).toBeNull();
        // objectType comet mas id que não casa nenhum conhecido
        expect(cometModelForObject(makeObject('comet:999P', 'comet'))).toBeNull();
    });
});
