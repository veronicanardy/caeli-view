/**
 * Testes da geometria pura do tutorial (posicionamento de tooltip e spotlight).
 */

import { describe, expect, it } from 'vitest';
import {
    inflateRect,
    placeTooltip,
    rectsAlmostEqual,
    type TutorialRect,
} from '@/Components/Radar/Tutorial/radarTutorialGeometry';

const VIEWPORT = { width: 1280, height: 800 };
const TOOLTIP = { width: 320, height: 160 };

function place(target: TutorialRect | null, preferred?: 'top' | 'bottom' | 'left' | 'right') {
    return placeTooltip(target, TOOLTIP.width, TOOLTIP.height, VIEWPORT.width, VIEWPORT.height, preferred);
}

describe('placeTooltip', () => {
    it('centraliza quando não há alvo', () => {
        const placement = place(null);
        expect(placement.left).toBe((VIEWPORT.width - TOOLTIP.width) / 2);
        expect(placement.top).toBe((VIEWPORT.height - TOOLTIP.height) / 2);
        expect(placement.placedInside).toBe(false);
    });

    it('posiciona abaixo do alvo quando há espaço', () => {
        const target: TutorialRect = { left: 480, top: 100, width: 320, height: 40 };
        const placement = place(target, 'bottom');
        expect(placement.top).toBeGreaterThan(target.top + target.height);
        expect(placement.placedInside).toBe(false);
        // centralizado horizontalmente em relação ao alvo
        expect(placement.left + TOOLTIP.width / 2).toBeCloseTo(target.left + target.width / 2, 0);
    });

    it('inverte para cima quando não cabe abaixo', () => {
        const target: TutorialRect = { left: 480, top: 700, width: 320, height: 60 };
        const placement = place(target, 'bottom');
        expect(placement.top + TOOLTIP.height).toBeLessThanOrEqual(target.top);
    });

    it('entra dentro de alvos gigantes (cena 3D) encostado no topo', () => {
        const target: TutorialRect = { left: 0, top: 80, width: 1280, height: 700 };
        const placement = place(target, 'bottom');
        expect(placement.placedInside).toBe(true);
        expect(placement.top).toBe(target.top + 20);
        // centralizado horizontalmente dentro do alvo
        expect(placement.left + TOOLTIP.width / 2).toBeCloseTo(target.left + target.width / 2, 0);
    });

    it('nunca sai da viewport, mesmo com alvo encostado na borda', () => {
        const target: TutorialRect = { left: 1240, top: 10, width: 36, height: 36 };
        const placement = place(target, 'bottom');
        expect(placement.left).toBeGreaterThanOrEqual(0);
        expect(placement.top).toBeGreaterThanOrEqual(0);
        expect(placement.left + TOOLTIP.width).toBeLessThanOrEqual(VIEWPORT.width);
        expect(placement.top + TOOLTIP.height).toBeLessThanOrEqual(VIEWPORT.height);
    });
});

describe('inflateRect', () => {
    it('expande o retângulo pela folga pedida', () => {
        const rect = inflateRect({ left: 100, top: 100, width: 50, height: 50 }, 8, VIEWPORT.width, VIEWPORT.height);
        expect(rect).toEqual({ left: 92, top: 92, width: 66, height: 66 });
    });

    it('limita a expansão às bordas da viewport', () => {
        const rect = inflateRect({ left: 2, top: 2, width: 30, height: 30 }, 10, VIEWPORT.width, VIEWPORT.height);
        expect(rect.left).toBe(0);
        expect(rect.top).toBe(0);
        expect(rect.width).toBe(42);
    });
});

describe('rectsAlmostEqual', () => {
    it('trata null como igual apenas a null', () => {
        expect(rectsAlmostEqual(null, null)).toBe(true);
        expect(rectsAlmostEqual(null, { left: 0, top: 0, width: 1, height: 1 })).toBe(false);
    });

    it('ignora ruído menor que 1px e detecta mudanças reais', () => {
        const a: TutorialRect = { left: 10, top: 10, width: 100, height: 50 };
        expect(rectsAlmostEqual(a, { ...a, left: 10.4 })).toBe(true);
        expect(rectsAlmostEqual(a, { ...a, left: 12 })).toBe(false);
    });
});
