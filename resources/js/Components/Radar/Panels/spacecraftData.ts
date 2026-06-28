/**
 * Conteúdo editorial das naves do radar (contexto do Resumo + marcos da Missão).
 *
 * Responsabilidade: guardar, por nave (id sintético spacecraft:<horizonsId>), o texto de contexto rico
 * do Resumo (no espírito do contextPt/En dos planetas em bodyData.ts) e a linha do tempo de marcos
 * (passados e previsões futuras) exibida na aba Missão. Função pura de consulta. Sem cálculo de posição,
 * efeméride ou órbita: só texto curado, bilíngue.
 *
 * Os marcos têm `year` (rótulo, pode ser texto como "2025–2030") e `future: true` quando é previsão.
 * A aba Missão os mostra como timeline; o card decide a ordem (passado em cima, futuro embaixo).
 */

export type SpacecraftMilestone = {
    /** Rótulo do ano/período (ex.: '1977', '2012', '2025–2030'). */
    year: string;
    /** O que aconteceu (ou acontecerá), curto, em PT e EN. */
    pt: string;
    en: string;
    /** Marca previsão futura: o card a destaca como "futuro/estimado". */
    future?: boolean;
};

export type SpacecraftContent = {
    /** Contexto do Resumo, rico e humano, como o dos planetas. */
    contextPt: string;
    contextEn: string;
    /** Marcos em ordem cronológica (passado → futuro). */
    milestones: SpacecraftMilestone[];
};

/** Conteúdo por id sintético da nave (spacecraft:<horizonsId>), casando com knownSpacecraftId. */
const SPACECRAFT_CONTENT: Record<string, SpacecraftContent> = {
    // Voyager 1 (-31)
    'spacecraft:-31': {
        contextPt: 'O objeto construído por pessoas mais distante da Terra. Depois de revelar os vulcões de Io e os detalhes dos anéis de Saturno, seguiu para fora do Sistema Solar e, em 2012, foi a primeira sonda a cruzar para o espaço interestelar. Leva o Disco de Ouro, com sons e imagens da Terra, e ainda conversa conosco, mesmo que cada sinal leve mais de 22 horas para chegar.',
        contextEn: 'The most distant human-made object from Earth. After revealing the volcanoes of Io and the fine structure of Saturn’s rings, it headed out of the Solar System and, in 2012, became the first probe to cross into interstellar space. It carries the Golden Record, with sounds and images of Earth, and still talks to us, even though each signal takes more than 22 hours to arrive.',
        milestones: [
            { year: '1977', pt: 'Lançada pela NASA rumo aos planetas gigantes.', en: 'Launched by NASA toward the giant planets.' },
            { year: '1979', pt: 'Sobrevoa Júpiter e descobre vulcões ativos na lua Io.', en: 'Flies by Jupiter and discovers active volcanoes on the moon Io.' },
            { year: '1980', pt: 'Sobrevoa Saturno e estuda seus anéis e a lua Titã de perto.', en: 'Flies by Saturn, studying its rings and the moon Titan up close.' },
            { year: '1990', pt: 'Tira a foto do "Ponto Azul Pálido": a Terra vista a 6 bilhões de km.', en: 'Takes the “Pale Blue Dot” photo: Earth seen from 6 billion km.' },
            { year: '2012', pt: 'Primeira nave a cruzar para o espaço interestelar.', en: 'First spacecraft to cross into interstellar space.' },
            { year: '~2025–2030', pt: 'Os instrumentos vão sendo desligados aos poucos conforme a energia acaba.', en: 'Instruments are switched off one by one as power runs out.', future: true },
            { year: '~40000', pt: 'Passará a cerca de 1,6 ano-luz da estrela Gliese 445.', en: 'Will pass about 1.6 light-years from the star Gliese 445.', future: true },
        ],
    },
    // Voyager 2 (-32)
    'spacecraft:-32': {
        contextPt: 'A única sonda a visitar os quatro planetas gigantes: Júpiter, Saturno, Urano e Netuno. Suas imagens de Urano e Netuno, dos anos 1980, ainda são quase tudo que vimos de perto desses dois mundos. Em 2018 também alcançou o espaço interestelar, por um caminho diferente do da irmã, e segue transmitindo a mais de 130 vezes a distância da Terra ao Sol.',
        contextEn: 'The only probe to visit all four giant planets: Jupiter, Saturn, Uranus and Neptune. Its images of Uranus and Neptune, from the 1980s, are still almost everything we have seen up close of those two worlds. In 2018 it too reached interstellar space, by a different path from its sister, and keeps transmitting from over 130 times the Earth–Sun distance.',
        milestones: [
            { year: '1977', pt: 'Lançada pela NASA, poucas semanas antes da Voyager 1.', en: 'Launched by NASA, a few weeks before Voyager 1.' },
            { year: '1979', pt: 'Sobrevoa Júpiter.', en: 'Flies by Jupiter.' },
            { year: '1981', pt: 'Sobrevoa Saturno.', en: 'Flies by Saturn.' },
            { year: '1986', pt: 'Único sobrevoo próximo de Urano já feito.', en: 'The only close flyby of Uranus ever made.' },
            { year: '1989', pt: 'Único sobrevoo próximo de Netuno já feito.', en: 'The only close flyby of Neptune ever made.' },
            { year: '2018', pt: 'Alcança o espaço interestelar.', en: 'Reaches interstellar space.' },
            { year: '~2025–2030', pt: 'Instrumentos vão sendo desligados conforme a energia diminui.', en: 'Instruments are turned off as power dwindles.', future: true },
        ],
    },
    // Pioneer 10 (-23)
    'spacecraft:-23': {
        contextPt: 'A nave que abriu o caminho para o Sistema Solar exterior. Foi a primeira a atravessar o cinturão de asteroides e a primeira a passar perto de Júpiter, enviando as primeiras imagens próximas do planeta gigante. Leva uma placa gravada com a figura de um casal humano e a posição da Terra. O último sinal fraco chegou em 2003; desde então ela segue muda, levada pela própria velocidade rumo às estrelas.',
        contextEn: 'The spacecraft that opened the way to the outer Solar System. It was the first to cross the asteroid belt and the first to fly past Jupiter, sending back the first close images of the giant planet. It carries a plaque engraved with a human couple and Earth’s location. Its last faint signal arrived in 2003; since then it drifts silent, carried by its own speed toward the stars.',
        milestones: [
            { year: '1972', pt: 'Lançada pela NASA, a primeira sonda ao Sistema Solar exterior.', en: 'Launched by NASA, the first probe to the outer Solar System.' },
            { year: '1973', pt: 'Primeira nave a passar perto de Júpiter.', en: 'First spacecraft to fly past Jupiter.' },
            { year: '1983', pt: 'Cruza a órbita de Netuno, então o planeta mais distante.', en: 'Crosses the orbit of Neptune, then the farthest planet.' },
            { year: '2003', pt: 'Último sinal recebido; a missão se encerra em silêncio.', en: 'Last signal received; the mission ends in silence.' },
            { year: '~2 milhões de anos', pt: 'Deve passar perto da estrela Aldebarã.', en: 'Expected to pass near the star Aldebaran.', future: true },
        ],
    },
    // New Horizons (-98)
    'spacecraft:-98': {
        contextPt: 'A sonda mais rápida já lançada, a caminho de Plutão. Em 2015 fez o primeiro sobrevoo próximo de Plutão e suas luas, revelando montanhas de gelo e uma grande planície em forma de coração num mundo que se imaginava morto. Depois foi mais fundo no cinturão de Kuiper e visitou Arrokoth, o objeto mais distante já explorado de perto.',
        contextEn: 'The fastest probe ever launched, bound for Pluto. In 2015 it made the first close flyby of Pluto and its moons, revealing ice mountains and a large heart-shaped plain on a world once thought dead. It then went deeper into the Kuiper Belt and visited Arrokoth, the most distant object ever explored up close.',
        milestones: [
            { year: '2006', pt: 'Lançada pela NASA como a sonda mais rápida já enviada.', en: 'Launched by NASA as the fastest probe ever sent.' },
            { year: '2007', pt: 'Usa a gravidade de Júpiter para ganhar velocidade.', en: 'Uses Jupiter’s gravity for a speed boost.' },
            { year: '2015', pt: 'Primeiro sobrevoo próximo de Plutão e suas luas.', en: 'First close flyby of Pluto and its moons.' },
            { year: '2019', pt: 'Sobrevoa Arrokoth, o objeto mais distante já explorado.', en: 'Flies by Arrokoth, the most distant object ever explored.' },
            { year: '~2029', pt: 'Deve cruzar a fronteira para o espaço interestelar.', en: 'Expected to cross into interstellar space.', future: true },
        ],
    },
    // Juno (-61)
    'spacecraft:-61': {
        contextPt: 'A sonda que estuda Júpiter por dentro. Em vez de uma órbita regular, mergulha em arcos longos que passam perto das nuvens e fogem dos cinturões de radiação intensa do planeta. Mediu o campo magnético, sondou o que há sob as nuvens e fez retratos impressionantes dos ciclones nos polos. É movida a energia solar, algo raro tão longe do Sol, com três grandes painéis abertos como pás.',
        contextEn: 'The spacecraft studying Jupiter from within. Instead of a regular orbit, it dives in long arcs that skim close to the clouds and escape the planet’s intense radiation belts. It has measured the magnetic field, probed what lies beneath the clouds and taken striking portraits of the cyclones at the poles. It runs on solar power, rare this far from the Sun, with three large panels spread like blades.',
        milestones: [
            { year: '2011', pt: 'Lançada pela NASA rumo a Júpiter.', en: 'Launched by NASA toward Jupiter.' },
            { year: '2016', pt: 'Entra em órbita de Júpiter e começa os mergulhos.', en: 'Enters orbit around Jupiter and begins its dives.' },
            { year: '2021', pt: 'Missão estendida: passa a sobrevoar também as luas Ganimedes, Europa e Io.', en: 'Extended mission: begins flybys of the moons Ganymede, Europa and Io.' },
            { year: '~2025', pt: 'Fim previsto da missão, com mergulho final na atmosfera de Júpiter.', en: 'Planned end of mission, with a final plunge into Jupiter’s atmosphere.', future: true },
        ],
    },
};

/** Contexto rico do Resumo da nave, no locale, ou null se não houver. */
export function spacecraftContext(id: string, locale: 'pt-BR' | 'en'): string | null {
    const content = SPACECRAFT_CONTENT[id];
    if (!content) return null;
    return locale === 'en' ? content.contextEn : content.contextPt;
}

/** Marcos da nave (timeline da Missão), ou lista vazia se não houver. */
export function spacecraftMilestones(id: string): SpacecraftMilestone[] {
    return SPACECRAFT_CONTENT[id]?.milestones ?? [];
}
