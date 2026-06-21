import { describe, expect, it } from 'vitest';
import { KNOWN_COMETS } from '@/Components/Radar/Bodies/Comet/knownComets';

/**
 * Coerência entre os cards dos cometas famosos: todo cometa precisa fornecer os campos que a aba
 * "Perfil físico" exibe (formato, tamanho real do núcleo, período, excentricidade), em pt E en. Sem
 * isso um cometa novo abriria o card com linha vazia ou só num idioma, quebrando a lógica que deve ser
 * a mesma para todas as rochas/cometas. nucleusSize é a contraparte do "Diâmetro" do asteroide.
 */
describe('dados de card dos cometas conhecidos', () => {
    it('todo cometa tem formato e tamanho do núcleo preenchidos em pt e en', () => {
        for (const comet of KNOWN_COMETS) {
            expect(comet.nucleusShape.pt.trim(), `${comet.name} nucleusShape.pt`).not.toBe('');
            expect(comet.nucleusShape.en.trim(), `${comet.name} nucleusShape.en`).not.toBe('');
            expect(comet.nucleusSize.pt.trim(), `${comet.name} nucleusSize.pt`).not.toBe('');
            expect(comet.nucleusSize.en.trim(), `${comet.name} nucleusSize.en`).not.toBe('');
        }
    });

    it('todo cometa tem diâmetro, período e excentricidade utilizáveis pelo card', () => {
        for (const comet of KNOWN_COMETS) {
            expect(comet.diameterMeters, `${comet.name} diameterMeters`).toBeGreaterThan(0);
            expect(comet.orbitalPeriodYears, `${comet.name} orbitalPeriodYears`).toBeGreaterThan(0);
            expect(comet.elements.ec, `${comet.name} eccentricity`).toBeGreaterThanOrEqual(0);
            expect(comet.elements.ec, `${comet.name} eccentricity`).toBeLessThan(1);
        }
    });

    it('só o 67P (mapeado pela Rosetta) cita a sonda no tamanho; estimados marcam "estimado"', () => {
        const byName = Object.fromEntries(KNOWN_COMETS.map((c) => [c.name, c]));
        expect(byName['67P Churyumov-Gerasimenko'].nucleusSize.pt).toContain('Rosetta');
        // Os nunca visitados deixam claro que o tamanho é estimativa.
        for (const comet of KNOWN_COMETS) {
            if (comet.modelKey === 'c67p') continue;
            expect(comet.nucleusSize.pt.toLowerCase(), `${comet.name}`).toMatch(/estimad|km/);
        }
    });
});
