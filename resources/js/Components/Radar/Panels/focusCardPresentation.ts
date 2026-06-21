/**
 * Helpers de apresentação do `FocusCard`.
 *
 * Responsabilidade: montar textos, badges e leituras visuais a partir de dados
 * já recebidos. Não chama APIs, não calcula órbita e não decide ranking.
 */

import type { AsteroidTrajectory, HorizonsFailureKind, SmallBodyObjectType, UnifiedApproach } from '@/types';

/**
 * Nomes semânticos de ícones retornados pelos helpers. O componente que renderiza
 * (UnifiedFocusCard) mapeia cada nome para um ícone lucide; emojis renderizam de
 * forma inconsistente entre sistemas e são lidos em voz alta por leitores de tela.
 */
export type RiskIcon = 'alert' | 'check';
export type StatusBadgeIcon = 'zap' | 'clock' | 'minus' | 'circle';

export function objectTypeEyebrow(
    objectType: SmallBodyObjectType,
    en: boolean,
): { label: string; dotColor: string } {
    if (objectType === 'comet') {
        return {
            label: en ? 'Comet · NEO' : 'Cometa · NEO',
            dotColor: '#f8c76b',
        };
    }
    return {
        label: en ? 'Asteroid · NEO' : 'Asteroide · NEO',
        dotColor: '#54d6d6',
    };
}

export function riskAssessment(a: UnifiedApproach, en: boolean): { icon: RiskIcon; title: string; subtitle: string; className: string } {
    if (a.hazardFlag) {
        return {
            icon: 'alert',
            title: en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL',
            subtitle: en ? 'Classified “potentially hazardous”, closely monitored, not on impact course.' : 'Classificado “potencialmente perigoso”, monitorado de perto, sem rota de impacto conhecida.',
            className: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
        };
    }
    return {
        icon: 'check',
        title: en ? 'No impact risk' : 'Sem risco de impacto',
        subtitle: en ? 'A routine close pass, not flagged as hazardous.' : 'Passagem próxima rotineira, não sinalizada como perigosa.',
        className: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
    };
}

/**
 * Marco de comparação concreto. `pt`/`en`: a forma "como X" (singular). `multPt`/`multEn`: como
 * expressar N vezes esse marco de forma natural — recebe o N já formatado. Ter as duas formas deixa
 * a comparação SEMPRE concreta e nomeada, sem cair em "maior que"/"quase" (vagos): quando o objeto
 * bate de perto vira "como X"; quando supera, vira "como 3 X" / "~3× a velocidade do som".
 */
type CompareMark = {
    /** Valor do marco na unidade da grandeza (km/h para velocidade, m para tamanho). */
    v: number;
    pt: string;
    en: string;
    multPt: (n: number) => string;
    multEn: (n: number) => string;
};

/**
 * Marcos de velocidade (km/h), do mais lento ao mais rápido. Mais granulares de propósito, para que
 * qualquer velocidade caia perto de um marco concreto. O múltiplo é a forma natural de cada um
 * ("3 aviões a jato", "~3× a velocidade do som").
 */
// Os nomes singulares NÃO levam artigo inicial ("Estação Espacial em órbita", não "a Estação…"):
// aparecem sozinhos no card como um rótulo. Os múltiplos "~N×" mantêm o artigo embutido, porque ali
// a frase é corrida ("~2× a velocidade de escape").
const SPEED_MARKS: CompareMark[] = [
    { v: 100,    pt: 'carro na estrada',              en: 'a car on the highway',     multPt: (n) => `${n} carros na estrada`,        multEn: (n) => `${n} highway cars` },
    { v: 300,    pt: 'trem-bala',                     en: 'a bullet train',           multPt: (n) => `${n} trens-bala`,               multEn: (n) => `${n} bullet trains` },
    { v: 900,    pt: 'avião a jato',                  en: 'a passenger jet',          multPt: (n) => `${n} aviões a jato`,            multEn: (n) => `${n} passenger jets` },
    { v: 1_235,  pt: 'velocidade do som',             en: 'the speed of sound',       multPt: (n) => `~${n}× a velocidade do som`,    multEn: (n) => `~${n}× the speed of sound` },
    { v: 3_700,  pt: 'bala de fuzil',                 en: 'a rifle bullet',           multPt: (n) => `${n} balas de fuzil`,           multEn: (n) => `${n} rifle bullets` },
    { v: 6_100,  pt: 'bala de canhão de tanque',      en: 'a tank cannon shell',      multPt: (n) => `${n} balas de canhão de tanque`, multEn: (n) => `${n} tank cannon shells` },
    { v: 28_000, pt: 'Estação Espacial em órbita',    en: 'the Space Station in orbit', multPt: (n) => `~${n}× a Estação Espacial em órbita`, multEn: (n) => `~${n}× the Space Station in orbit` },
    { v: 40_270, pt: 'velocidade de escape da Terra', en: "Earth's escape velocity", multPt: (n) => `~${n}× a velocidade de escape da Terra`, multEn: (n) => `~${n}× Earth's escape velocity` },
];

/**
 * Tolerância para dizer "como X" (singular). Dentro de [SINGLE_LOW, SINGLE_HIGH] o valor está perto o
 * bastante de um marco para a frase "como X" ser fiel. Fora disso, NÃO usamos "maior/menor/quase"
 * (vagos): expressamos como MÚLTIPLO concreto do marco logo abaixo ("como 3 ônibus", "~3× a
 * velocidade do som"), que carrega a proporção no próprio número.
 */
const SINGLE_LOW = 0.72;
const SINGLE_HIGH = 1.4;

/**
 * Compara um valor com uma lista de marcos concretos e devolve a frase, SEMPRE com imagem nomeada e
 * sem qualificadores vagos ("quase", "maior", "mais rápido") nem o conector "como". Regra:
 *  - perto de um marco (0,72×–1,4×): o nome do marco ("um avião a jato").
 *  - acima: múltiplo arredondado do marco logo abaixo ("3 aviões a jato" / "~3× a velocidade do som").
 *  - abaixo do menor marco: o nome do menor (não inventa fração estranha).
 */
function describeAgainstMarks(value: number, marks: CompareMark[], en: boolean): string {
    const smallest = marks[0];
    if (value < smallest.v * SINGLE_LOW) {
        return en ? smallest.en : smallest.pt;
    }

    // Marco de proporção mais próxima (escala log, que é como percebemos diferença de tamanho/velocidade).
    const nearest = marks.reduce((best, m) =>
        Math.abs(Math.log(value / m.v)) < Math.abs(Math.log(value / best.v)) ? m : best,
    );
    const r = value / nearest.v;
    if (r >= SINGLE_LOW && r <= SINGLE_HIGH) {
        return en ? nearest.en : nearest.pt;
    }

    // Fora da janela do singular: múltiplo concreto do marco logo ABAIXO (sempre ≥ 2× aqui).
    // O template do múltiplo já é a FRASE COMPLETA ("3 ônibus enfileirados", "~2× a velocidade de
    // escape") — o helper não prefixa nada aqui.
    let below = marks[0];
    for (const m of marks) { if (value >= m.v) below = m; else break; }
    const n = Math.max(2, Math.round(value / below.v));
    return en ? below.multEn(n) : below.multPt(n);
}

/**
 * Comparação concreta da velocidade relativa (km/h): sempre uma imagem nomeada ("como um avião a
 * jato", "como 3 balas de fuzil", "~3× a velocidade de escape da Terra"), nunca "maior/quase". É só
 * a comparação: o km/h já aparece no Resumo.
 */
export function velocityComparison(kph: number | null, en: boolean): string | null {
    if (kph == null || !isFinite(kph) || kph <= 0) return null;
    return describeAgainstMarks(kph, SPEED_MARKS, en);
}

/**
 * Porte QUALITATIVO do corpo (faixa de tamanho), não a comparação literal. O resumo usa isto para
 * classificar ("pequena", "do porte de um prédio") sem repetir "do tamanho de uma girafa", que já está
 * na linha "Tamanho comparável a". Faixas em metros (maior dimensão).
 */
function sizeClass(meters: number, en: boolean): string {
    if (meters < 25)     return en ? 'tiny' : 'minúscula';
    if (meters < 150)    return en ? 'small' : 'pequena';
    if (meters < 1_000)  return en ? 'building-sized' : 'do porte de um prédio';
    if (meters < 20_000) return en ? 'mountain-sized' : 'do porte de uma montanha';
    return en ? 'colossal' : 'colossal';
}

/**
 * Mini-resumo do Resumo: duas frases que enquadram o corpo, sem ecoar o que o resto do card já diz. Não
 * repete as comparações literais (tamanho/velocidade comparáveis vivem no Perfil físico) nem o que tem
 * bloco próprio aqui (distância, risco). A 1ª frase classifica o PORTE em faixa qualitativa e dá o
 * CARÁTER da passagem (tipo + velocidade); a 2ª acrescenta a NATUREZA do corpo (de onde vem) e que
 * passagens assim são rotineiras — contexto educativo que não está em nenhuma aba.
 *
 * Monta com o que houver: sem tamanho, abre só pelo tipo; sem velocidade, omite a parte de movimento.
 * Devolve null se não há nem porte nem velocidade pra dizer algo concreto.
 */
export function smartSummary(
    input: { objectType: SmallBodyObjectType; sizeMeters: number | null; velocityKph: number | null },
    en: boolean,
): string | null {
    const isComet = input.objectType === 'comet';
    const hasSize = input.sizeMeters != null && input.sizeMeters > 0;
    const kph = input.velocityKph;
    const hasSpeed = kph != null && isFinite(kph) && kph > 0;

    if (!hasSize && !hasSpeed) return null;

    // Sujeito: porte qualitativo + substantivo do corpo. "uma rocha pequena", "um cometa do porte de um
    // prédio". Sem porte, abre só pelo tipo ("um cometa").
    const noun = isComet ? (en ? 'comet' : 'cometa') : (en ? 'rock' : 'rocha');
    const article = en ? 'a' : (isComet ? 'um' : 'uma');
    const subject = hasSize
        ? (en
            ? `${article} ${sizeClass(input.sizeMeters as number, true)} ${noun}`
            : `${article} ${noun} ${sizeClass(input.sizeMeters as number, false)}`)
        : `${article} ${noun}`;

    // Caráter da passagem: o tipo do corpo dita a natureza (o cometa "dá uma volta ao redor do Sol", a
    // rocha "passa pela vizinhança da Terra"); a velocidade, em faixa qualitativa (não a comparação
    // literal), entra como advérbio do verbo — sem o pleonasmo de "passando... cruzando".
    const fast = hasSpeed && (kph as number) >= 25_000;
    const speedAdv = !hasSpeed ? '' : en ? (fast ? ' at tremendous speed' : ' at high speed') : (fast ? ' em altíssima velocidade' : ' em alta velocidade');
    const nature = isComet
        ? (en ? `looping around the Sun${speedAdv}` : `dando uma volta ao redor do Sol${speedAdv}`)
        : (en ? `cutting through Earth’s neighborhood${speedAdv}` : `passando pela vizinhança da Terra${speedAdv}`);

    // 2ª frase: natureza do corpo (de onde vem) + que passagens assim são rotineiras. Conteúdo
    // educativo que não aparece em nenhuma aba; substitui a antiga muleta "as outras abas...".
    const tail = isComet
        ? (en
            ? 'It’s a ball of ice and dust that grows a tail near the Sun; passes like this are routine and rarely noticed.'
            : 'É uma bola de gelo e poeira que ganha cauda perto do Sol; passagens assim são rotina e quase nunca notadas.')
        : (en
            ? 'It’s billions of years old, from the dawn of the Solar System; passes like this are routine and rarely noticed.'
            : 'Tem bilhões de anos, das origens do Sistema Solar; passagens assim são rotina e quase nunca notadas.');

    // Costura: sujeito (capitalizado) + natureza com o ritmo embutido.
    const head = subject.charAt(0).toUpperCase() + subject.slice(1);
    return `${head} ${nature}. ${tail}`;
}

/**
 * Contexto de uma linha para a classe orbital, a partir da sigla do SBDB. Sem isto, "APO" ou "Apollo"
 * não diz nada a quem não é astrônomo. Cobre as classes de NEO mais comuns; devolve null para o resto
 * (o card cai na descrição/sigla que já tinha).
 */
/** Nome localizado da família orbital (o VALOR exibido). O backend só traz a descrição em inglês, então
 *  o PT vem daqui. Cai na sigla quando a classe não está no mapa. */
export function orbitClassLabel(orbitClass: string | null | undefined, en: boolean): string | null {
    if (!orbitClass) return null;
    const key = orbitClass.toUpperCase();
    const labels: Record<string, { pt: string; en: string }> = {
        APO: { pt: 'Apollo', en: 'Apollo' },
        ATE: { pt: 'Aten', en: 'Aten' },
        AMO: { pt: 'Amor', en: 'Amor' },
        IEO: { pt: 'Atira', en: 'Atira' },
        MCA: { pt: 'Cruzador de Marte', en: 'Mars-crosser' },
        IMB: { pt: 'Cinturão principal interno', en: 'Inner main belt' },
        MBA: { pt: 'Cinturão principal', en: 'Main belt' },
        OMB: { pt: 'Cinturão principal externo', en: 'Outer main belt' },
    };
    const hit = labels[key] ?? Object.entries(labels).find(([k]) => key.startsWith(k))?.[1];
    return hit ? (en ? hit.en : hit.pt) : orbitClass;
}

/** Explicação da família orbital para o tooltip. Frase própria em PT/EN (não a do backend, que é EN). */
export function orbitClassContext(orbitClass: string | null | undefined, en: boolean): string | null {
    if (!orbitClass) return null;
    const key = orbitClass.toUpperCase();
    const map: Record<string, { pt: string; en: string }> = {
        APO: { pt: 'Asteroide cuja órbita é maior que a da Terra e cruza a nossa por fora.', en: 'An asteroid whose orbit is larger than Earth’s and crosses ours from outside.' },
        ATE: { pt: 'Asteroide cuja órbita é menor que a da Terra e cruza a nossa por dentro.', en: 'An asteroid whose orbit is smaller than Earth’s and crosses ours from inside.' },
        AMO: { pt: 'Asteroide que se aproxima da Terra, mas não chega a cruzar a nossa órbita.', en: 'An asteroid that approaches Earth but does not actually cross our orbit.' },
        IEO: { pt: 'Asteroide cuja órbita fica inteiramente dentro da órbita da Terra.', en: 'An asteroid whose orbit lies entirely inside Earth’s.' },
        MCA: { pt: 'Asteroide cuja órbita cruza a de Marte.', en: 'An asteroid whose orbit crosses Mars’s.' },
        IMB: { pt: 'Asteroide na parte interna do cinturão principal, entre Marte e Júpiter.', en: 'An asteroid in the inner part of the main belt, between Mars and Jupiter.' },
        MBA: { pt: 'Asteroide do cinturão principal, entre as órbitas de Marte e Júpiter.', en: 'A main-belt asteroid, between the orbits of Mars and Jupiter.' },
        OMB: { pt: 'Asteroide na parte externa do cinturão principal, entre Marte e Júpiter.', en: 'An asteroid in the outer part of the main belt, between Mars and Jupiter.' },
    };
    const hit = map[key] ?? Object.entries(map).find(([k]) => key.startsWith(k))?.[1];
    return hit ? (en ? hit.en : hit.pt) : null;
}

/**
 * Marcos de tamanho de DIMENSÃO FIXA e conhecida (maior dimensão, em metros), do menor ao maior.
 * Granularidade alta de propósito, para que qualquer corpo caia perto de um marco concreto. O
 * múltiplo é uma imagem natural ("3 ônibus enfileirados", "2 Torres Eiffel empilhadas"), nunca
 * "maior que" (vago). Cada altura/comprimento é o eixo MAIOR da referência.
 */
const SIZE_MARKS: CompareMark[] = [
    { v: 1.7,  pt: 'uma pessoa',           en: 'a person',          multPt: (n) => `${n} pessoas enfileiradas`,        multEn: (n) => `${n} people in a row` },
    { v: 4,    pt: 'um carro',             en: 'a car',             multPt: (n) => `${n} carros enfileirados`,         multEn: (n) => `${n} cars in a row` },
    { v: 8,    pt: 'uma girafa',           en: 'a giraffe',         multPt: (n) => `${n} girafas empilhadas`,          multEn: (n) => `${n} giraffes stacked up` },
    { v: 12,   pt: 'um ônibus',            en: 'a bus',             multPt: (n) => `${n} ônibus enfileirados`,         multEn: (n) => `${n} buses in a row` },
    { v: 24,   pt: 'uma quadra de tênis',  en: 'a tennis court',    multPt: (n) => `${n} quadras de tênis`,            multEn: (n) => `${n} tennis courts` },
    { v: 50,   pt: 'uma piscina olímpica', en: 'an Olympic pool',   multPt: (n) => `${n} piscinas olímpicas`,          multEn: (n) => `${n} Olympic pools` },
    { v: 70,   pt: 'um Boeing 747',        en: 'a Boeing 747',      multPt: (n) => `${n} Boeings 747`,                 multEn: (n) => `${n} Boeing 747s` },
    { v: 105,  pt: 'um campo de futebol',  en: 'a football pitch',  multPt: (n) => `${n} campos de futebol`,           multEn: (n) => `${n} football pitches` },
    { v: 157,  pt: 'Estátua da Liberdade', en: 'the Statue of Liberty', multPt: (n) => `${n} Estátuas da Liberdade`,   multEn: (n) => `${n} Statues of Liberty` },
    { v: 330,  pt: 'Torre Eiffel',         en: 'the Eiffel Tower',  multPt: (n) => `${n} Torres Eiffel`,               multEn: (n) => `${n} Eiffel Towers` },
    { v: 540,  pt: 'Torre de Tóquio',      en: 'the Tokyo Tower',   multPt: (n) => `${n} Torres de Tóquio`,            multEn: (n) => `${n} Tokyo Towers` },
    { v: 830,  pt: 'Burj Khalifa, o prédio mais alto do mundo', en: 'the Burj Khalifa, the tallest building on Earth', multPt: (n) => `${n} Burj Khalifas`, multEn: (n) => `${n} Burj Khalifas` },
];

/**
 * Comparação de tamanho concreta a partir da maior dimensão do corpo (metros). Sempre uma imagem
 * nomeada ("como um ônibus", "como 3 ônibus enfileirados"), nunca "maior/quase" (vagos).
 *
 * Até ~1 km usa SIZE_MARKS. Acima de 1 km usa múltiplos do Cristo Redentor (faixa de km) e, mais
 * acima, escala geográfica (cidade, país), porque já não cabe em prédio nenhum.
 */
export function sizeComparison(meters: number | null, en: boolean): string {
    if (!meters || meters <= 0) return '—';

    // SÓ a comparação, sem a medida em metros: o diâmetro já aparece na linha de cima do card. Aqui o
    // usuário só quer a IMAGEM do tamanho (com o que se parece), não o número de novo.

    // Até ~1 km: marco concreto mais próximo, ou múltiplo concreto quando cai entre marcos.
    if (meters <= 1_000) {
        return describeAgainstMarks(meters, SIZE_MARKS, en);
    }

    // 1–10 km: múltiplos do Cristo Redentor enfileirado (38 m), referência que todo brasileiro tem.
    if (meters <= 10_000) {
        const n = Math.max(2, Math.round(meters / 38));
        return en
            ? `${n} Christ the Redeemer statues in a row`
            : `${n} Cristos Redentores enfileirados`;
    }

    // Dezenas a milhares de km: referências GEOGRÁFICAS concretas (uma cidade/país nomeado), nunca
    // "um país pequeno" genérico. Cada faixa cita um lugar cuja extensão é ~o tamanho do corpo.
    // Ex.: Vesta ~525 km ≈ comprimento de Portugal; Ceres ~939 km ≈ comprimento da Itália.
    if (meters <= 90_000)    return en ? 'the length of greater São Paulo' : 'o comprimento da Grande São Paulo';
    if (meters <= 300_000)   return en ? 'about the length of Jamaica' : 'mais ou menos o comprimento da Jamaica';
    if (meters <= 650_000)   return en ? 'about the length of Portugal' : 'mais ou menos o comprimento de Portugal';
    if (meters <= 1_300_000) return en ? 'about the length of Italy' : 'mais ou menos o comprimento da Itália';
    return en ? 'wider than France end to end' : 'mais larga que a França de ponta a ponta';
}

/**
 * Tooltip do albedo: agora que vive num balão (não numa subline apertada), explica o CONCEITO e dá a
 * leitura. Albedo é o quanto a superfície reflete (0 = carvão, 1 = neve). Texto: o que é + esta leitura.
 */
export function albedoExplanation(albedo: number | null, en: boolean): string | null {
    if (albedo == null) return null;
    const pct = Math.round(albedo * 100);
    const tone = albedo <= 0.1 ? (en ? 'very dark, like coal' : 'bem escura, tipo carvão')
        : albedo <= 0.25 ? (en ? 'dark and rocky' : 'escura e rochosa')
        : albedo <= 0.5 ? (en ? 'fairly bright' : 'clara')
        : (en ? 'very bright, almost like ice' : 'muito clara, quase como gelo');
    return en
        ? `How much of the Sun's light the surface reflects (0 = coal, 1 = snow). This one reflects ${pct}%: ${tone}.`
        : `O quanto da luz do Sol a superfície reflete (0 = carvão, 1 = neve). Esta reflete ${pct}%: ${tone}.`;
}

/**
 * Tooltip do período de rotação: explica que é o "dia" do corpo (uma volta sobre si mesmo) e quanto
 * dura, em horas e minutos. Agora num balão, então pode dizer o que o número significa, não só o valor.
 */
export function rotationExplanation(hours: number | null, en: boolean): string | null {
    if (hours == null || hours <= 0) return null;
    const whole = Math.floor(hours);
    const minutes = Math.round((hours - whole) * 60);
    const hm = minutes > 0 ? `${whole}h${String(minutes).padStart(2, '0')}` : `${whole}h`;
    return en
        ? `How long it takes to spin once on its axis — its "day". Here, one day lasts about ${hm}.`
        : `Quanto tempo leva pra dar uma volta sobre si mesmo, o "dia" dele. Aqui, um dia dura cerca de ${hm}.`;
}

export function trajectoryStatusBadge(
    trajectory: AsteroidTrajectory | null | undefined,
    en: boolean,
): { icon: StatusBadgeIcon; text: string; className: string } | null {
    if (trajectory?.status === 'available') {
        return null;
    }

    const kind: HorizonsFailureKind | null | undefined = trajectory?.horizonsFailureKind;

    if (kind === 'horizons_transient') {
        return {
            icon: 'zap',
            text: en
                ? 'Horizons temporarily unavailable, symbolic distance only.'
                : 'Horizons temporariamente indisponível, apenas distância simbólica.',
            className: 'border-amber-400/30 bg-amber-500/10 text-amber-200/80',
        };
    }

    if (kind === 'no_ephemeris') {
        return {
            icon: 'clock',
            text: en
                ? 'Newly found, no defined trajectory yet. The distance shown is the one recorded for the approach, not its live position.'
                : 'Encontrado recentemente, ainda sem trajetória definida. A distância mostrada é a registrada para a aproximação, não a posição ao vivo.',
            className: 'border-sky-400/30 bg-sky-500/10 text-sky-200/80',
        };
    }

    if (kind === 'no_orbital_data') {
        return {
            icon: 'minus',
            text: en
                ? 'No Horizons identifier available for this object.'
                : 'Sem identificador Horizons disponível para este objeto.',
            className: 'border-white/15 bg-white/5 text-white/50',
        };
    }

    if (trajectory === null || trajectory === undefined) {
        return null;
    }

    return {
        icon: 'circle',
        text: en ? 'Symbolic placement, approach distance only.' : 'Posição simbólica, apenas distância da aproximação.',
        className: 'border-white/15 bg-white/5 text-white/50',
    };
}

export function motionLabel(
    state: AsteroidTrajectory['motionState'] | undefined,
    en: boolean,
): { text: string; className: string } | null {
    switch (state) {
        case 'approaching':
            return { text: en ? 'Approaching' : 'Aproximando', className: 'text-white/80' };
        case 'receding':
            return { text: en ? 'Receding' : 'Afastando', className: 'text-white/80' };
        case 'near_closest':
            return { text: en ? 'Near closest approach' : 'Perto da máxima aproximação', className: 'text-sky-200' };
        default:
            return null;
    }
}
