/**
 * Testes da decisão de auto-início e do parsing do estado persistido do tutorial.
 */

import { describe, expect, it } from 'vitest';
import {
    parseStoredTutorialState,
    RADAR_TUTORIAL_VERSION,
    shouldAutoStartTutorial,
} from '@/Components/Radar/Tutorial/radarTutorialStorage';

describe('parseStoredTutorialState', () => {
    it('retorna null para entrada vazia ou JSON inválido', () => {
        expect(parseStoredTutorialState(null)).toBeNull();
        expect(parseStoredTutorialState('')).toBeNull();
        expect(parseStoredTutorialState('{nope')).toBeNull();
    });

    it('retorna null para formatos inesperados', () => {
        expect(parseStoredTutorialState('"completed"')).toBeNull();
        expect(parseStoredTutorialState('{"status":"done","version":1}')).toBeNull();
        expect(parseStoredTutorialState('{"status":"completed","version":"1"}')).toBeNull();
        expect(parseStoredTutorialState('{"status":"completed"}')).toBeNull();
    });

    it('aceita registros válidos e normaliza updatedAt ausente', () => {
        expect(parseStoredTutorialState('{"status":"completed","version":1,"updatedAt":"2026-06-11T00:00:00Z"}')).toEqual({
            status: 'completed',
            version: 1,
            updatedAt: '2026-06-11T00:00:00Z',
        });
        expect(parseStoredTutorialState('{"status":"skipped","version":2}')).toEqual({
            status: 'skipped',
            version: 2,
            updatedAt: '',
        });
    });
});

describe('shouldAutoStartTutorial', () => {
    it('abre na primeira visita (sem registro)', () => {
        expect(shouldAutoStartTutorial(null)).toBe(true);
    });

    it('não abre quando concluído ou pulado na versão vigente', () => {
        expect(shouldAutoStartTutorial({ status: 'completed', version: RADAR_TUTORIAL_VERSION, updatedAt: '' })).toBe(false);
        expect(shouldAutoStartTutorial({ status: 'skipped', version: RADAR_TUTORIAL_VERSION, updatedAt: '' })).toBe(false);
    });

    it('reabre quando o registro é de versão anterior, mesmo concluído', () => {
        expect(shouldAutoStartTutorial({ status: 'completed', version: RADAR_TUTORIAL_VERSION - 1, updatedAt: '' })).toBe(true);
        expect(shouldAutoStartTutorial({ status: 'skipped', version: 0, updatedAt: '' })).toBe(true);
    });

    it('não reabre para registros de versão futura', () => {
        expect(shouldAutoStartTutorial({ status: 'completed', version: RADAR_TUTORIAL_VERSION + 1, updatedAt: '' })).toBe(false);
    });
});
