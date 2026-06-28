import { describe, expect, it } from 'vitest';
import { spacecraftContext, spacecraftMilestones } from '@/Components/Radar/Panels/spacecraftData';

describe('spacecraftData', () => {
    it('dá contexto rico bilíngue para cada nave conhecida', () => {
        const pt = spacecraftContext('spacecraft:-31', 'pt-BR');
        const en = spacecraftContext('spacecraft:-31', 'en');
        expect(pt).toBeTruthy();
        expect(en).toBeTruthy();
        expect(pt).not.toEqual(en);
    });

    it('devolve null para id sem conteúdo cadastrado', () => {
        expect(spacecraftContext('spacecraft:-999', 'pt-BR')).toBeNull();
        expect(spacecraftMilestones('spacecraft:-999')).toEqual([]);
    });

    it('cada nave tem marcos, com pelo menos uma previsão futura', () => {
        for (const id of ['spacecraft:-31', 'spacecraft:-32', 'spacecraft:-23', 'spacecraft:-98', 'spacecraft:-61']) {
            const ms = spacecraftMilestones(id);
            expect(ms.length).toBeGreaterThan(0);
            expect(ms.some((m) => m.future)).toBe(true);
        }
    });

    it('marcos têm rótulo de ano e texto nos dois idiomas', () => {
        for (const m of spacecraftMilestones('spacecraft:-98')) {
            expect(m.year).toBeTruthy();
            expect(m.pt).toBeTruthy();
            expect(m.en).toBeTruthy();
        }
    });
});
