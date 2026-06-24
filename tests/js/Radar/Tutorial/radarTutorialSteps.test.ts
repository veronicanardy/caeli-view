/**
 * Testes das definições e helpers puros dos passos do tutorial do radar.
 */

import { describe, expect, it } from 'vitest';
import {
    fillLiveFacts,
    indexAfterGroup,
    RADAR_TUTORIAL_STEPS,
    splitBodyChips,
    stepCopy,
    stepSide,
    stepsForViewport,
    tutorialChapterLabel,
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

    it('a contemplação não restaura a cena sozinha: a restauração é ação do usuário no passo seguinte', () => {
        // Nenhum passo dispara clique automático ao avançar. Religar os nomes /
        // sair da tela cheia é o que o usuário faz no passo de restauração logo
        // depois, por clique no próprio botão. Sem isso, a contemplação pulava o
        // passo seguinte ao satisfazer a condição dele com um clique sintético.
        for (const step of RADAR_TUTORIAL_STEPS) {
            expect((step as { autoClickTarget?: unknown }).autoClickTarget, step.id).toBeUndefined();
        }

        const labelsOn = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'toolbar-labels-on')!;
        expect(labelsOn.advance).toEqual({ kind: 'click' });
        expect(labelsOn.targets).toEqual(['[data-tutorial="toggle-labels"]']);

        const fullscreenOff = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'toolbar-fullscreen-off')!;
        expect(fullscreenOff.advance).toEqual({ kind: 'click' });
        expect(fullscreenOff.targets).toEqual(['[data-tutorial="toggle-fullscreen"]']);
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

    it('apresenta a rocha na cena iluminada logo após a seleção, antes do card', () => {
        const ids = RADAR_TUTORIAL_STEPS.map((s) => s.id);
        // O passo de contemplação entra entre a seleção e a leitura do card.
        expect(ids.indexOf('meet-rock')).toBe(ids.indexOf('select-object') + 1);
        expect(ids.indexOf('read-card')).toBe(ids.indexOf('meet-rock') + 1);

        const meet = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'meet-rock')!;
        // Foca a cena inteira, sem escurecer o céu (vê o objeto real grande).
        expect(meet.targets).toEqual(['[data-tutorial="radar-canvas"]']);
        expect(meet.keepSceneBright).toBe(true);
        // Avança por botão (contemplação), depende de seleção e personaliza com o nome real.
        expect(meet.advance).toEqual({ kind: 'manual' });
        expect(meet.requiresSelection).toBe(true);
        expect(meet.bodyPt).toContain('{rockName}');
        expect(meet.bodyEn).toContain('{rockName}');
    });

    it('os passos de troca de aba avançam com um clique em aba não selecionada', () => {
        for (const id of ['card-tabs-to-physical', 'card-tabs-to-approach']) {
            const step = RADAR_TUTORIAL_STEPS.find((s) => s.id === id)!;
            expect(step.advance, id).toEqual({ kind: 'click', requireSelector: '[role="tab"][aria-selected="false"]' });
            expect(step.requiresSelection, id).toBe(true);
        }
    });

    it('o bloco do objeto é contíguo: pular a seleção salta direto para um passo sem seleção', () => {
        const steps = stepsForViewport(false);
        const start = steps.findIndex((s) => s.advance.kind === 'selection');
        expect(start).toBeGreaterThanOrEqual(0);
        // A partir da seleção, há uma sequência contígua de passos que dependem de
        // seleção (o "bloco do objeto"). Pular a seleção salta até o fim dele.
        let i = start + 1;
        while (i < steps.length && (steps[i].requiresSelection || steps[i].advance.kind === 'selection')) i += 1;
        // O destino do salto existe e NÃO depende de seleção (senão o loop voltaria).
        expect(i).toBeLessThan(steps.length);
        expect(steps[i].requiresSelection).not.toBe(true);
        expect(steps[i].advance.kind).not.toBe('selection');
        // Todos os passos do bloco saltado dependem de seleção (nenhum "vaza").
        expect(steps.slice(start, i).every((s) => s.advance.kind === 'selection' || s.requiresSelection)).toBe(true);
    });

    it('ensina a voltar pra perto após ver a trajetória, exigindo o clique na rocha', () => {
        const ids = RADAR_TUTORIAL_STEPS.map((s) => s.id);
        // O passo de voltar entra logo após a explicação da trajetória e antes da órbita.
        expect(ids.indexOf('trajectory-return')).toBe(ids.indexOf('trajectory-explain') + 1);
        expect(ids.indexOf('trajectory-return')).toBeLessThan(ids.indexOf('orbit-view'));

        const ret = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'trajectory-return')!;
        // Avança por re-seleção (clique na rocha já selecionada), não por botão.
        expect(ret.advance).toEqual({ kind: 'reselect-object' });
        // Exige o clique: passo de ação não tem rótulo de botão primário.
        expect(ret.primaryLabelPt).toBeUndefined();
        expect(ret.primaryLabelEn).toBeUndefined();
        // Depende de seleção (a rocha já está selecionada).
        expect(ret.requiresSelection).toBe(true);
        // Spotlight de furo único no item da rocha na lista (alvo estável); a label
        // na cena é fallback quando a lista está fechada.
        expect(ret.targets).toEqual([
            '[data-tutorial="selected-rock-list-item"]',
            '[data-tutorial="selected-rock-label"]',
        ]);
        // Vê a câmera voltar antes de seguir.
        expect(ret.settleWhileAdvancing).toBe(true);
    });

    it('a explicação da órbita não menciona a Terra (ela não aparece no modo orbital)', () => {
        const orbitExplain = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'orbit-explain')!;
        expect(orbitExplain.bodyPt).not.toContain('Terra');
        expect(orbitExplain.bodyEn).not.toContain('Earth');
    });
});

describe('tutorialChapterLabel', () => {
    it('todo passo pertence a um capítulo com label não vazio (PT e EN)', () => {
        for (const step of RADAR_TUTORIAL_STEPS) {
            expect(tutorialChapterLabel(step.id, false).length, step.id).toBeGreaterThan(0);
            expect(tutorialChapterLabel(step.id, true).length, step.id).toBeGreaterThan(0);
        }
    });

    it('agrupa os passos nas fases esperadas', () => {
        expect(tutorialChapterLabel('camera-zoom', false)).toBe('Câmera');
        expect(tutorialChapterLabel('filter-criterion', false)).toBe('Objetos');
        expect(tutorialChapterLabel('select-object', false)).toBe('O objeto');
        expect(tutorialChapterLabel('orbit-view', false)).toBe('A viagem');
        expect(tutorialChapterLabel('finale', false)).toBe('Reta final');
        expect(tutorialChapterLabel('camera-zoom', true)).toBe('Camera');
    });

    it('id desconhecido cai no capítulo de início, sem quebrar', () => {
        expect(tutorialChapterLabel('inexistente', false)).toBe('Início');
    });
});

describe('fillLiveFacts', () => {
    it('substitui nome e métrica reais no corpo do passo', () => {
        const body = 'É o {rockName}, uma rocha de verdade {rockMetric}.';
        const out = fillLiveFacts(body, { rockName: '2024 XY', rockMetric: 'a 380 mil km da Terra agora' }, false);
        expect(out).toBe('É o 2024 XY, uma rocha de verdade a 380 mil km da Terra agora.');
    });

    it('sem nome, cai num termo neutro em vez de quebrar', () => {
        expect(fillLiveFacts('Veja o {rockName}.', null, false)).toBe('Veja o esta rocha.');
        expect(fillLiveFacts('See {rockName}.', null, true)).toBe('See this rock.');
    });

    it('sem métrica, remove o placeholder e limpa espaços e vírgula órfã', () => {
        const out = fillLiveFacts('É o {rockName}, uma rocha de verdade {rockMetric}.', { rockName: 'Bennu' }, false);
        expect(out).toBe('É o Bennu, uma rocha de verdade.');
    });

    it('o passo de seleção usa os placeholders de fato real', () => {
        const select = RADAR_TUTORIAL_STEPS.find((s) => s.id === 'select-object')!;
        expect(select.bodyPt).toContain('{rockName}');
        expect(select.bodyPt).toContain('{rockMetric}');
        // stepCopy preenche os placeholders quando recebe os fatos.
        const copy = stepCopy(select, false, false, { rockName: 'Eros', rockMetric: 'a 12 milhões de km da Terra agora' });
        expect(copy.body).toContain('Eros');
        expect(copy.body).not.toContain('{rockName}');
        expect(copy.body).not.toContain('{rockMetric}');
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
