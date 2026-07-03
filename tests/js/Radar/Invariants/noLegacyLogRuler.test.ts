/**
 * Invariante anti-legado: a régua LOG geocêntrica antiga não pode voltar ao código.
 *
 * O radar teve, no passado, uma régua logarítmica geocêntrica (`?log`) ao lado da linear. Ela foi
 * REMOVIDA por completo: hoje a régua linear heliocêntrica em UA é a única (ver os READMEs do radar).
 * Os símbolos daquela época (`compressSceneVector`, o corte global de labels de rocha por zoom, a
 * faixa `RadarDataQualityCard`/`radarData`) não devem reaparecer no código por engano numa refatoração.
 *
 * Este teste varre o FONTE de `lib/radar` e `Components/Radar` (apenas .ts/.tsx, sem comentários) e
 * falha se qualquer símbolo proibido voltar a ser usado como código. READMEs e comentários ficam de
 * fora de propósito: eles MENCIONAM o legado por motivos históricos ("a régua log foi removida"), o
 * que é correto e deve continuar permitido.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOTS = [
    path.resolve(process.cwd(), 'resources/js/lib/radar'),
    path.resolve(process.cwd(), 'resources/js/Components/Radar'),
];

/**
 * Símbolos da régua log antiga e dos cortes removidos. Se algum voltar a aparecer no código (não em
 * comentário), a decisão de "régua linear única" foi quebrada sem querer.
 *
 * `ORBIT_AU_SCALE` e `LINEAR_SCALE_FACTOR` eram aliases deprecados da migração para a régua única
 * (valiam LINEAR_AU_SCALE e 1); a migração terminou e eles foram removidos, então qualquer volta é
 * ressurreição acidental do vocabulário antigo.
 */
const FORBIDDEN_SYMBOLS = [
    'compressSceneVector',
    'useHideAsteroidLabelsMode',
    'RadarDataQualityCard',
    'ORBIT_AU_SCALE',
    'LINEAR_SCALE_FACTOR',
];

function collectSourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...collectSourceFiles(full));
        } else if (/\.tsx?$/.test(entry.name)) {
            out.push(full);
        }
    }
    return out;
}

/** Remove comentários de bloco e de linha para não acusar menções históricas legítimas. */
function stripComments(source: string): string {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
}

describe('régua linear única: o legado log não volta ao código', () => {
    const files = ROOTS.flatMap(collectSourceFiles);

    it('encontra arquivos-fonte para varrer (guarda contra caminho quebrado)', () => {
        expect(files.length).toBeGreaterThan(50);
    });

    for (const symbol of FORBIDDEN_SYMBOLS) {
        it(`nenhum arquivo de código usa "${symbol}"`, () => {
            const offenders = files.filter((file) =>
                stripComments(readFileSync(file, 'utf8')).includes(symbol),
            );
            expect(offenders).toEqual([]);
        });
    }
});
