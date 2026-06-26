/**
 * Garante que famousLoreFor cobre todos os famosos (5 asteroides + 3 cometas + 5 naves) em PT e EN,
 * devolve null para objetos sem lore (asteroide comum do feed) e respeita o estilo do produto (sem
 * travessão).
 */

import { describe, expect, it } from 'vitest';
import { famousLoreFor } from '@/Components/Radar/Panels/famousLore';
import { KNOWN_ASTEROIDS, knownAsteroidId } from '@/Components/Radar/Bodies/Asteroid/knownAsteroids';
import { KNOWN_COMETS, knownCometId } from '@/Components/Radar/Bodies/Comet/knownComets';
import { KNOWN_SPACECRAFT, knownSpacecraftId } from '@/Components/Radar/Bodies/Spacecraft/knownSpacecraft';

describe('famousLoreFor', () => {
    it('tem história PT e EN para cada asteroide famoso', () => {
        for (const known of KNOWN_ASTEROIDS) {
            const id = knownAsteroidId(known);
            expect(famousLoreFor(id, 'pt-BR')).toBeTruthy();
            expect(famousLoreFor(id, 'en')).toBeTruthy();
        }
    });

    it('tem história PT e EN para cada cometa famoso', () => {
        for (const comet of KNOWN_COMETS) {
            const id = knownCometId(comet);
            expect(famousLoreFor(id, 'pt-BR')).toBeTruthy();
            expect(famousLoreFor(id, 'en')).toBeTruthy();
        }
    });

    it('tem história PT e EN para cada nave famosa', () => {
        for (const craft of KNOWN_SPACECRAFT) {
            const id = knownSpacecraftId(craft);
            expect(famousLoreFor(id, 'pt-BR')).toBeTruthy();
            expect(famousLoreFor(id, 'en')).toBeTruthy();
        }
    });

    it('PT e EN são textos distintos para o mesmo objeto', () => {
        const id = knownCometId(KNOWN_COMETS[0]);
        expect(famousLoreFor(id, 'pt-BR')).not.toBe(famousLoreFor(id, 'en'));
    });

    it('devolve null para objetos sem lore e para id ausente', () => {
        expect(famousLoreFor('2024 AB', 'pt-BR')).toBeNull();
        expect(famousLoreFor('known:999', 'en')).toBeNull();
        expect(famousLoreFor(null, 'pt-BR')).toBeNull();
        expect(famousLoreFor(undefined, 'en')).toBeNull();
    });

    it('não usa travessão (—) nos textos do produto', () => {
        const ids = [
            ...KNOWN_ASTEROIDS.map(knownAsteroidId),
            ...KNOWN_COMETS.map(knownCometId),
            ...KNOWN_SPACECRAFT.map(knownSpacecraftId),
        ];
        for (const id of ids) {
            expect(famousLoreFor(id, 'pt-BR')).not.toContain('—');
            expect(famousLoreFor(id, 'en')).not.toContain('—');
        }
    });
});
