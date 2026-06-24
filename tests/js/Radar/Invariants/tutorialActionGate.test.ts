/**
 * Invariante de robustez do tutorial: toda ação de SELEÇÃO/FOCO do radar passa
 * pelo gate `runTutorialAction` antes de executar.
 *
 * O bloqueio do "usuário curioso" durante o tutorial não é por região (o overlay
 * é `pointer-events: none`, o clique físico chega na cena), é por AÇÃO: a ação só
 * acontece se `isActionAllowed(passo, ação)` permitir. Esse gate vive em
 * `runTutorialAction` no orquestrador (`DailyOrbitalRadar3D`), e cada ação real
 * (selecionar objeto na lista E na cena 3D, focar Sol/Terra/Lua/planeta, órbita,
 * reset, labels, fullscreen, card, guia) é embrulhada por ele.
 *
 * O risco é estrutural: um componente novo (ou uma refatoração) ligar um handler
 * CRU (`selectObject`, `focusBody`, `focusSun`, `focusPlanet`) direto numa prop
 * de filho, sem o wrapper `*ForTutorial`, abriria uma brecha silenciosa que nada
 * no build pegaria. Este teste lê o FONTE do orquestrador e trava isso:
 *
 *  1. o gate de fato barra a ação negada (checa permissão ANTES de `fn()`);
 *  2. as props de seleção/foco entregues aos filhos usam os wrappers gated;
 *  3. os handlers crus nunca vazam direto como prop para um filho.
 *
 * Se a estrutura do orquestrador mudar de forma que invalide as âncoras abaixo,
 * o teste falha pedindo para reavaliar o gate, em vez de passar achando que está
 * tudo protegido.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ORCHESTRATOR = path.resolve(
    process.cwd(),
    'resources/js/Components/Radar/DailyOrbitalRadar3D.tsx',
);

/** Remove comentários para não casar âncoras dentro de texto explicativo. */
function stripComments(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
}

const source = stripComments(readFileSync(ORCHESTRATOR, 'utf8'));

/**
 * Handlers CRUS de ação do radar, desestruturados de `useRadar3DFocusActions`.
 * Eles NÃO podem ser entregues direto a um filho: a versão gated correspondente
 * (`*ForTutorial`, que passa por `runTutorialAction`) é a única que pode descer.
 */
const RAW_ACTION_HANDLERS = ['selectObject', 'focusBody', 'focusSun', 'focusPlanet'];

/** Props pelas quais a seleção/foco descem para a cena 3D e os painéis. */
const GATED_PROP_BINDINGS = [
    'onSelect={selectObjectForTutorial}',
    'onSelectObject={selectObjectForTutorial}',
    'onFocusBody={focusBodyForTutorial}',
    'onFocusSun={focusSunForTutorial}',
    'onFocusPlanet={focusPlanetForTutorial}',
];

describe('gate do tutorial: toda ação de seleção/foco passa por runTutorialAction', () => {
    it('o orquestrador foi encontrado (guarda contra caminho quebrado)', () => {
        expect(source.length).toBeGreaterThan(2000);
    });

    it('runTutorialAction barra a ação NEGADA antes de executá-la', () => {
        // Âncora estrutural do gate: checa a permissão e dá return ANTES de fn().
        // Sem isso, "ação não permitida" ainda rodaria o efeito.
        const guard = /if \(!\(tutorial\?\.isActionAllowed\(action, payload\) \?\? true\)\) return;\s*fn\(\);/;
        expect(source).toMatch(guard);
    });

    it('runTutorialAction só registra o avanço para um clique real do usuário', () => {
        // Clique sintetizado pelo tutorial executa o efeito mas não avança o passo.
        expect(source).toContain('if (isProgrammaticTutorialClick()) return;');
        expect(source).toContain('tutorial?.completeStep(action, payload);');
    });

    it('as props de seleção/foco usam os wrappers gated, nunca os handlers crus', () => {
        for (const binding of GATED_PROP_BINDINGS) {
            expect(source, binding).toContain(binding);
        }
    });

    it('nenhum handler cru de seleção/foco vaza direto como prop para um filho', () => {
        // Ex.: `onSelect={selectObject}`, `onFocusBody={focusBody}`. A única forma
        // legítima de o handler cru aparecer é DENTRO de um runTutorialAction(...).
        const leaks: string[] = [];
        for (const handler of RAW_ACTION_HANDLERS) {
            // Prop JSX ligada diretamente ao handler cru: `algumaProp={handler}`.
            const directBinding = new RegExp(`=\\{${handler}\\}`);
            if (directBinding.test(source)) leaks.push(`={${handler}}`);
        }
        expect(leaks).toEqual([]);
    });

    it('os wrappers gated embrulham o handler cru no runTutorialAction certo', () => {
        // Cada ação real é declarada via runTutorialAction com a TutorialAction correta.
        expect(source).toMatch(/selectObjectForTutorial[\s\S]*?runTutorialAction\('select-object'/);
        expect(source).toMatch(/focusBodyForTutorial[\s\S]*?runTutorialAction\('focus-body'/);
        expect(source).toMatch(/focusSunForTutorial[\s\S]*?runTutorialAction\('focus-sun'/);
        expect(source).toMatch(/focusPlanetForTutorial[\s\S]*?runTutorialAction\('focus-planet'/);
    });
});
