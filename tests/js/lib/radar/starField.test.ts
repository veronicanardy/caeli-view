import { describe, expect, it } from 'vitest';
import { buildStarField, STAR_COUNT } from '@/lib/radar/starField';

// ─── Campo estelar ─────────────────────────────────────────────────────────────
// O campo é puramente decorativo, mas a sensação de PROFUNDIDADE depende de algumas
// propriedades concretas: determinismo (mesmo seed → mesmo campo), buffers no tamanho
// certo, raios em faixa de profundidade, e estrelas com tamanhos/opacidades VARIADOS
// (uma casca uniforme não tem profundidade). Esses testes travam essas propriedades.

describe('buildStarField', () => {
    it('é determinístico para o mesmo seed', () => {
        const a = buildStarField(42);
        const b = buildStarField(42);
        expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
        expect(Array.from(a.sizes)).toEqual(Array.from(b.sizes));
        expect(Array.from(a.opacities)).toEqual(Array.from(b.opacities));
    });

    it('seeds diferentes produzem campos diferentes', () => {
        const a = buildStarField(42);
        const b = buildStarField(7);
        expect(Array.from(a.positions)).not.toEqual(Array.from(b.positions));
    });

    it('preenche todos os buffers no tamanho esperado', () => {
        const { positions, colors, sizes, opacities } = buildStarField();
        expect(positions).toHaveLength(STAR_COUNT * 3);
        expect(colors).toHaveLength(STAR_COUNT * 3);
        expect(sizes).toHaveLength(STAR_COUNT);
        expect(opacities).toHaveLength(STAR_COUNT);
    });

    it('mantém todas as estrelas dentro da casca de profundidade (raio finito e em faixa)', () => {
        const { positions } = buildStarField();
        for (let i = 0; i < positions.length; i += 3) {
            const r = Math.hypot(positions[i], positions[i + 1], positions[i + 2]);
            expect(Number.isFinite(r)).toBe(true);
            // rNear mínimo ~300, rNear+rSpan máximo ~950.
            expect(r).toBeGreaterThan(250);
            expect(r).toBeLessThan(1000);
        }
    });

    it('gera tamanhos e opacidades VARIADOS (profundidade, não casca uniforme)', () => {
        const { sizes, opacities } = buildStarField();
        const uniqueSizes = new Set(Array.from(sizes).map((v) => v.toFixed(3)));
        const uniqueOpacities = new Set(Array.from(opacities).map((v) => v.toFixed(3)));
        // Várias camadas + jitter por estrela: dezenas de valores distintos, não um só.
        expect(uniqueSizes.size).toBeGreaterThan(10);
        expect(uniqueOpacities.size).toBeGreaterThan(10);
    });

    it('opacidades ficam em [0..1] e tamanhos são positivos', () => {
        const { sizes, opacities } = buildStarField();
        for (let i = 0; i < sizes.length; i++) {
            expect(sizes[i]).toBeGreaterThan(0);
            expect(opacities[i]).toBeGreaterThan(0);
            expect(opacities[i]).toBeLessThanOrEqual(1);
        }
    });
});
