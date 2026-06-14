/**
 * Testes das definições e helpers puros dos passos do tutorial do radar.
 */

import { describe, expect, it } from 'vitest';
import {
    indexAfterGroup,
    RADAR_TUTORIAL_STEPS,
    splitBodyChips,
    stepCopy,
    stepSide,
    stepsForViewport,
} from '@/Components/Radar/Tutorial/radarTutorialSteps';

describe('RADAR_TUTORIAL_STEPS', () => {
    it('tem ids únicos', () => {
        const ids = RADAR_TUTORIAL_STEPS.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('começa com boas-vindas e termina com o passo final', () => {
        expect(RADAR_TUTORIAL_STEPS[0].id).toBe('welcome');
        expect(RADAR_TUTORIAL_STEPS[RADAR_TUTORIAL_STEPS.length - 1].id).toBe('finale');
    });

    it('todo passo tem textos PT e EN não vazios', () => {
        for (const step of RADAR_TUTORIAL_STEPS) {
            expect(step.titlePt.length, step.id).toBeGreaterThan(0);
            expect(step.titleEn.length, step.id).toBeGreaterThan(0);
            expect(step.bodyPt.length, step.id).toBeGreaterThan(0);
            expect(step.bodyEn.length, step.id).toBeGreaterThan(0);
        }
    });

    it('não usa travessão em nenhum texto de produto', () => {
        for (const step of RADAR_TUTORIAL_STEPS) {
            const texts = [
                step.titlePt, step.titleEn, step.bodyPt, step.bodyEn,
                step.bodyMobilePt, step.bodyMobileEn,
                step.primaryLabelPt, step.primaryLabelEn,
                step.secondaryLabelPt, step.secondaryLabelEn,
            ];
            for (const text of texts) {
                if (text) expect(text, step.id).not.toContain('—');
            }
        }
    });

    it('passos manuais têm rótulo de botão primário', () => {
        for (const step of RADAR_TUTORIAL_STEPS) {
            if (step.advance.kind === 'manual') {
                expect(step.primaryLabelPt, step.id).toBeTruthy();
                expect(step.primaryLabelEn, step.id).toBeTruthy();
            }
        }
    });

    it('passos de clique têm pelo menos um alvo', () => {
        for (const step of RADAR_TUTORIAL_STEPS) {
            if (step.advance.kind === 'click') {
                expect(step.targets.length, step.id).toBeGreaterThan(0);
            }
        }
    });

    it('passos opcionais com grupo são contíguos ao grupo orbit', () => {
        const orbitIndexes = RADAR_TUTORIAL_STEPS
            .map((s, i) => (s.skipGroup === 'orbit' ? i : -1))
            .filter((i) => i >= 0);
        expect(orbitIndexes.length).toBe(3);
        expect(orbitIndexes[2] - orbitIndexes[0]).toBe(2);
    });

    it('ensina a câmera logo após a cena, na ordem teclado, zoom e rotação', () => {
        const ids = RADAR_TUTORIAL_STEPS.map((s) => s.id);
        const scene = ids.indexOf('scene');
        expect(ids.indexOf('camera-keyboard')).toBe(scene + 1);
        expect(ids.indexOf('camera-zoom')).toBe(scene + 2);
        expect(ids.indexOf('camera-rotate')).toBe(scene + 3);
        expect(ids.indexOf('camera-rotate')).toBeLessThan(ids.indexOf('filter-criterion'));
    });

    it('após as referências: reset, dica de clique na cena, toolbar com contemplações e o guia por último', () => {
        const ids = RADAR_TUTORIAL_STEPS.map((s) => s.id);
        const tail = [
            'reset-view',
            'scene-click-hint',
            'toolbar-labels-off',
            'labels-view',
            'toolbar-labels-on',
            'toolbar-fullscreen-on',
            'fullscreen-view',
            'toolbar-fullscreen-off',
            'radar-guide',
            'guide-invitation',
            'finale',
        ];
        expect(ids.slice(ids.length - tail.length)).toEqual(tail);
        // O bloco de referências fica entre o retorno da órbita e o reset de vista.
        expect(ids.indexOf('orbit-return')).toBeLessThan(ids.indexOf('references-bodies'));
        expect(ids.indexOf('references-planets-arrival')).toBeLessThan(ids.indexOf('reset-view'));
    });

    it('os passos de contemplação destacam a cena inteira, sem escurecer o céu', () => {
        for (const id of ['labels-view', 'fullscreen-view']) {
            const step = RADAR_TUTORIAL_STEPS.find((s) => s.id === id)!;
            expect(step.targets, id).toEqual(['[data-tutorial="radar-canvas"]']);
            expect(step.advance.kind, id).toBe('manual');
        }
    });

    it('referências em dois blocos: corpos (Sol/Terra/Lua) com chegada e depois planetas com chegada', () => {
        const bodies = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'references-bodies')!;
        expect(bodies.advance).toEqual({ kind: 'click', requireSelector: '[data-tutorial="reference-body"]' });
        expect(bodies.settleWhileAdvancing).toBe(true);

        const planets = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'references-planets')!;
        expect(planets.advance).toEqual({ kind: 'click', requireSelector: '[data-tutorial="planet-option"]' });
        expect(planets.settleWhileAdvancing).toBe(true);

        // Cada bloco tem um passo de chegada logo após o clique, no mesmo skipGroup.
        const ids = RADAR_TUTORIAL_STEPS.map((s) => s.id);
        expect(ids.indexOf('references-bodies-arrival')).toBe(ids.indexOf('references-bodies') + 1);
        expect(ids.indexOf('references-planets')).toBe(ids.indexOf('references-bodies-arrival') + 1);
        expect(ids.indexOf('references-planets-arrival')).toBe(ids.indexOf('references-planets') + 1);
    });

    it('a seleção devolve a câmera ao ponto de partida e espera a viagem dela', () => {
        const select = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'select-object')!;
        expect(select.resetViewOnEnter).toBe(true);
        expect(select.settleWhileAdvancing).toBe(true);
        // O passo fala só da lista: a cena não é alvo de spotlight aqui.
        expect(select.targets.some((t) => t.includes('radar-canvas'))).toBe(false);
    });

    it('os passos de troca de aba avançam com um clique em aba não selecionada', () => {
        for (const id of ['card-tabs-to-physical', 'card-tabs-to-approach']) {
            const step = RADAR_TUTORIAL_STEPS.find((s) => s.id === id)!;
            expect(step.advance, id).toEqual({ kind: 'click', requireSelector: '[role="tab"][aria-selected="false"]' });
            expect(step.requiresSelection, id).toBe(true);
        }
    });

    it('a explicação da órbita não menciona a Terra (ela não aparece no modo orbital)', () => {
        const orbitExplain = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'orbit-explain')!;
        expect(orbitExplain.bodyPt).not.toContain('Terra');
        expect(orbitExplain.bodyEn).not.toContain('Earth');
    });
});

describe('splitBodyChips', () => {
    it('separa texto e chips, com chips nos índices ímpares', () => {
        expect(splitBodyChips('Escolha [[Sol]] ou [[Lua]].')).toEqual(['Escolha ', 'Sol', ' ou ', 'Lua', '.']);
    });

    it('texto sem marcador vira um único segmento', () => {
        expect(splitBodyChips('Sem chips aqui.')).toEqual(['Sem chips aqui.']);
    });
});

describe('stepsForViewport', () => {
    it('desktop inclui o passo de teclado', () => {
        expect(stepsForViewport(false).some((s) => s.id === 'camera-keyboard')).toBe(true);
    });

    it('mobile exclui o passo de teclado', () => {
        expect(stepsForViewport(true).some((s) => s.id === 'camera-keyboard')).toBe(false);
    });

    it('mantém boas-vindas e final nas duas audiências', () => {
        for (const isMobile of [false, true]) {
            const steps = stepsForViewport(isMobile);
            expect(steps[0].id).toBe('welcome');
            expect(steps[steps.length - 1].id).toBe('finale');
        }
    });
});

describe('indexAfterGroup', () => {
    it('sem grupo, retorna o próximo índice', () => {
        const steps = stepsForViewport(false);
        const welcome = steps.findIndex((s) => s.id === 'welcome');
        expect(indexAfterGroup(steps, welcome)).toBe(welcome + 1);
    });

    it('a partir do primeiro passo do grupo orbit, salta o grupo inteiro', () => {
        const steps = stepsForViewport(false);
        const orbitView = steps.findIndex((s) => s.id === 'orbit-view');
        const after = indexAfterGroup(steps, orbitView);
        // O passo seguinte pertence a outro grupo (referências), nunca ao orbit.
        expect(steps[after].skipGroup).not.toBe('orbit');
        expect(steps.slice(orbitView, after).every((s) => s.skipGroup === 'orbit')).toBe(true);
    });
});

describe('stepCopy', () => {
    it('resolve PT por padrão e EN quando pedido', () => {
        const welcome = RADAR_TUTORIAL_STEPS[0];
        expect(stepCopy(welcome, false, false).title).toBe(welcome.titlePt);
        expect(stepCopy(welcome, true, false).title).toBe(welcome.titleEn);
    });

    it('usa o corpo mobile quando existe e o viewport é mobile', () => {
        const zoom = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'camera-zoom')!;
        expect(stepCopy(zoom, false, true).body).toBe(zoom.bodyMobilePt);
        expect(stepCopy(zoom, false, false).body).toBe(zoom.bodyPt);
    });

    it('cai no corpo desktop quando não há variante mobile', () => {
        const scene = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'scene')!;
        expect(stepCopy(scene, false, true).body).toBe(scene.bodyPt);
    });
});

describe('stepSide', () => {
    it('usa sideMobile no mobile quando definido', () => {
        const readCard = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'read-card')!;
        expect(stepSide(readCard, true)).toBe('top');
        expect(stepSide(readCard, false)).toBe('right');
    });

    it('padrão é bottom quando nada foi definido', () => {
        const welcome = RADAR_TUTORIAL_STEPS[0];
        expect(stepSide(welcome, false)).toBe('bottom');
    });
});
