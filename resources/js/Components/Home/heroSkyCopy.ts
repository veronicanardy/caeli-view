/**
 * Responsabilidade: funções puras de copy do hero da Home.
 *
 * Transformam leituras do céu local (nuvens, seeing, planetas visíveis,
 * iluminação lunar) e dados de aproximação em frases curtas, bilíngues e
 * legíveis para os módulos do painel. Não acessam rede, DOM nem estado;
 * recebem tudo por parâmetro para permitir teste unitário direto.
 */

import type { VisibleObject } from '@/services/visibleObjectsService';

const GENERIC_SUMMARY_MARKERS = [
    'condições estimadas',
    'estimated observing',
    'aguardando',
    'reading local',
    'lendo condições',
];

/**
 * Detecta resumos genéricos/placeholder vindos do serviço de céu local,
 * que não devem ser exibidos como leitura real ao usuário.
 */
export function isGenericSummary(text: string): boolean {
    const lower = text.toLowerCase();
    return GENERIC_SUMMARY_MARKERS.some((m) => lower.includes(m));
}

/**
 * Monta a frase principal do módulo "Céu esta noite" a partir das condições
 * locais, priorizando: leitura indisponível, céu encoberto, parcialmente
 * nublado (citando planetas em brechas), céu limpo e, por fim, o resumo cru.
 */
export function buildObservationNote(
    skySummary: string,
    cloudCover: number | null,
    seeing: string | null,
    visiblePlanets: VisibleObject[],
    moonIllumination: number,
    en: boolean,
): string {
    if (cloudCover === null && isGenericSummary(skySummary)) {
        return en ? 'Reading local sky conditions…' : 'Lendo condições do céu local…';
    }
    if (cloudCover !== null && cloudCover >= 85) {
        const moonPct = Math.round(moonIllumination);
        const moonVisible = moonPct >= 20;
        const phase = moonPhaseLabel(moonIllumination, en);
        if (en) {
            return moonVisible
                ? `Heavy cloud cover. The ${phase} may show through gaps, but fainter objects will be hard to see.`
                : 'Heavy cloud cover. Conditions are unfavorable for observation tonight.';
        }
        return moonVisible
            ? `Céu encoberto. A ${phase} pode aparecer em brechas, mas objetos fracos tendem a ficar ocultos.`
            : 'Céu encoberto. Condições pouco favoráveis para observação esta noite.';
    }
    if (cloudCover !== null && cloudCover >= 50) {
        const planetNames = visiblePlanets.map((p) => en ? p.nameEn : p.namePt);
        if (en) {
            return planetNames.length > 0
                ? `Partly cloudy. The Moon and ${joinReadableList(planetNames, true)} may still be visible through breaks in the clouds.`
                : 'Partly cloudy sky. The Moon may still be visible, but most objects will be harder to observe.';
        }
        return planetNames.length > 0
            ? `Céu parcialmente nublado. A Lua e ${joinReadableList(planetNames, false)} ainda podem aparecer em brechas.`
            : 'Céu parcialmente nublado. A Lua pode aparecer em brechas, mas a maioria dos objetos ficará encoberta.';
    }
    if (cloudCover !== null && cloudCover < 50) {
        if (seeing) {
            const normalized = seeing.toLowerCase();
            const isGood = normalized.includes('ótimo') || normalized.includes('otimo');
            if (isGood) {
                return en
                    ? 'Clear skies with excellent seeing. Great conditions for deep-sky observation.'
                    : 'Céu limpo com excelente estabilidade atmosférica. Ótimas condições para observação.';
            }
        }
        return en
            ? 'Few clouds. Most objects should be visible tonight.'
            : 'Poucas nuvens. A maioria dos objetos deve estar visível esta noite.';
    }
    if (skySummary && !isGenericSummary(skySummary)) {
        return skySummary.charAt(0).toUpperCase() + skySummary.slice(1);
    }
    return en ? 'Reading local sky conditions…' : 'Lendo condições do céu local…';
}

/**
 * Converte cobertura de nuvens e seeing em um rótulo qualitativo curto de
 * visibilidade (boa, moderada, baixa, instável ou carregando).
 */
export function formatObservingVisibility(cloudCover: number | null, seeing: string | null, en: boolean): string {
    if (cloudCover === null) return en ? 'loading' : 'carregando';
    if (cloudCover >= 85) return en ? 'low' : 'baixa';
    if (cloudCover >= 50) return en ? 'moderate' : 'moderada';
    if (seeing) {
        const normalized = seeing.toLowerCase();
        if (normalized.includes('instável') || normalized.includes('instavel')) return en ? 'unstable' : 'instável';
    }
    return en ? 'good' : 'boa';
}

/**
 * Linha "planetas visíveis agora" do módulo de dados do céu. Prefixo curto
 * para não estourar a largura do card; a lista usa vírgulas e conjunção.
 */
export function formatVisiblePlanetsLine(names: string[], en: boolean): string {
    if (names.length === 0) {
        return en ? 'No bright planets above the horizon' : 'Sem planetas brilhantes no horizonte';
    }

    const list = joinReadableList(names, en);

    if (names.length === 1) {
        return en ? `Visible now: ${list}` : `Visível agora: ${list}`;
    }

    return en ? `Visible now: ${list}` : `Visíveis agora: ${list}`;
}

/**
 * Junta itens em lista legível com vírgulas e conjunção final ("A, B e C").
 */
export function joinReadableList(items: string[], en: boolean): string {
    if (items.length <= 1) {
        return items.join('');
    }

    const conjunction = en ? ' and ' : ' e ';
    return `${items.slice(0, -1).join(', ')}${conjunction}${items[items.length - 1]}`;
}

/**
 * Formata datas de aproximação vindas do JPL ("2026-Jun-01 03:26") ou em ISO
 * para o locale ativo, sempre em UTC. Entrada irreconhecível volta intacta.
 */
export function formatApproachDate(value: string, en: boolean): string {
    try {
        const normalized = value
            .replace(
                /^(\d{4})-([A-Za-z]{3})-(\d{2})\s*(.*)$/,
                (_, year, mon, day, rest) => {
                    const months: Record<string, string> = {
                        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
                        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
                    };
                    const time = rest ? rest.trim() : '00:00';
                    return `${year}-${months[mon] ?? '01'}-${day}T${time}:00`;
                },
            );
        const date = new Date(normalized);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat(en ? 'en' : 'pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'UTC',
        }).format(date);
    } catch {
        return value;
    }
}

/**
 * Rótulo da fase lunar a partir do percentual de iluminação (0 a 100),
 * com o percentual arredondado entre parênteses. O espaço antes do
 * percentual é não separável ( ) para "(9%)" nunca quebrar sozinho
 * em outra linha nos cards.
 */
export function moonPhaseLabel(illumination: number, en: boolean): string {
    const pct = Math.round(illumination);
    let phase: string;
    if (pct <= 2) {
        phase = en ? 'New Moon' : 'Lua nova';
    } else if (pct <= 48) {
        phase = en ? 'Crescent Moon' : 'Lua crescente';
    } else if (pct <= 52) {
        phase = en ? 'Quarter Moon' : 'Quarto de Lua';
    } else if (pct <= 97) {
        phase = en ? 'Gibbous Moon' : 'Lua gibosa';
    } else {
        phase = en ? 'Full Moon' : 'Lua cheia';
    }
    return `${phase} (${pct}%)`;
}
