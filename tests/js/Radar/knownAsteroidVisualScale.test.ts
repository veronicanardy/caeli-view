/**
 * Trava o contrato da escala visual dos asteroides conhecidos (régua "famosos").
 *
 * Decisão de produto: o tamanho 3D dos conhecidos é PADRONIZADO com os planetas ilustrativos, e não
 * proporcional ao diâmetro real. Como o RealAsteroidModel normaliza o GLB para "maior eixo = 2"
 * (raio ≈ 1), a escala aplicada é o raio visual em DL, ancorado no raio de Marte (MARS.visualRadiusDl)
 * para que o corpo fique coerente com a cena em vez de gigante.
 */

import { describe, expect, it } from 'vitest';
import { knownAsteroidVisualScale } from '@/Components/Radar/Bodies/Asteroid/knownAsteroids';
import { MARS } from '@/lib/radar/planetData';

describe('knownAsteroidVisualScale', () => {
    it('usa o raio visual de Marte como tamanho padrão (coerente com os planetas ilustrativos)', () => {
        expect(knownAsteroidVisualScale()).toBe(MARS.visualRadiusDl);
    });

    it('é um raio visual pequeno, na faixa dos planetas ilustrativos (não gigante)', () => {
        const scale = knownAsteroidVisualScale();
        // Os planetas vão de ~0,028 (Mercúrio) a ~0,19 (Júpiter); o conhecido deve cair nessa faixa.
        expect(scale).toBeGreaterThan(0.02);
        expect(scale).toBeLessThan(0.2);
    });
});
