/**
 * Conteúdo editorial das naves do radar (Resumo + abertura da Missão + marcos).
 *
 * Responsabilidade: guardar, por nave (id sintético spacecraft:<horizonsId>), o texto de contexto rico
 * do Resumo (no espírito do contextPt/En dos planetas em bodyData.ts), uma frase de abertura da Missão
 * que dá sentido à linha do tempo, e a própria linha do tempo de marcos (passados e previsões futuras)
 * exibida na aba Missão. Função pura de consulta. Sem cálculo de posição, efeméride ou órbita: só texto
 * curado, bilíngue.
 *
 * As três abas da nave (Resumo · Missão · História) dividem o trabalho, NÃO se repetem: o Resumo diz
 * quem é a nave hoje e por que importa; a Missão abre com `missionIntro` e detalha o "o quê e quando"
 * nos marcos; a História (em famousLore.ts) traz fatos curiosos que não cabem nos marcos. Ao editar
 * uma das três, evite reaproveitar os mesmos fatos das outras.
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
    /** Frase de abertura da Missão: dá sentido à linha do tempo antes dos marcos. */
    missionIntroPt: string;
    missionIntroEn: string;
    /** Marcos em ordem cronológica (passado → futuro). */
    milestones: SpacecraftMilestone[];
};

/** Conteúdo por id sintético da nave (spacecraft:<horizonsId>), casando com knownSpacecraftId. */
const SPACECRAFT_CONTENT: Record<string, SpacecraftContent> = {
    // Voyager 1 (-31)
    'spacecraft:-31': {
        contextPt: 'O objeto construído por pessoas mais distante da Terra, e ainda em funcionamento. Viaja há quase meio século e hoje está tão longe que um sinal de rádio, na velocidade da luz, leva mais de 22 horas para chegar até aqui. A Missão conta o caminho que ela percorreu; a História, o que ela carrega.',
        contextEn: 'The most distant human-made object from Earth, and still working. It has been travelling for almost half a century and is now so far away that a radio signal, at the speed of light, takes more than 22 hours to reach us. The Mission tab traces the path it took; the History tab, what it carries.',
        missionIntroPt: 'Uma viagem só de ida pelo Sistema Solar e além: cada planeta gigante serviu de trampolim gravitacional para o próximo, até a nave escapar de vez rumo às estrelas.',
        missionIntroEn: 'A one-way trip through the Solar System and beyond: each giant planet served as a gravitational slingshot toward the next, until the probe broke free for good toward the stars.',
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
        contextPt: 'A única nave que visitou os quatro planetas gigantes: Júpiter, Saturno, Urano e Netuno. Suas imagens de Urano e Netuno, feitas nos anos 1980, ainda são quase tudo que vimos de perto desses dois mundos: nenhuma outra sonda voltou lá desde então. Segue ativa, a mais de 130 vezes a distância da Terra ao Sol.',
        contextEn: 'The only spacecraft to visit all four giant planets: Jupiter, Saturn, Uranus and Neptune. Its images of Uranus and Neptune, taken in the 1980s, are still almost everything we have seen up close of those two worlds: no other probe has been back since. It remains active, over 130 times the Earth–Sun distance away.',
        missionIntroPt: 'Uma única janela rara, que se abre a cada 176 anos, alinhou os quatro gigantes de um jeito que permitiu visitar todos numa só viagem. A Voyager 2 foi a nave que aproveitou esse alinhamento.',
        missionIntroEn: 'A rare window, opening once every 176 years, lined up the four giants so that a single trip could visit them all. Voyager 2 was the spacecraft that seized that alignment.',
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
        contextPt: 'A nave que abriu o caminho para o Sistema Solar exterior, provando que dava para atravessar o cinturão de asteroides sem ser destruída. Hoje segue muda: o último sinal fraco chegou em 2003 e desde então ela viaja em silêncio, levada pela própria velocidade rumo às estrelas. A História conta o que ela carrega para quem possa encontrá-la.',
        contextEn: 'The spacecraft that opened the way to the outer Solar System, proving the asteroid belt could be crossed without being destroyed. Today it is silent: its last faint signal arrived in 2003, and since then it drifts in silence, carried by its own speed toward the stars. The History tab tells what it carries for whoever might find it.',
        missionIntroPt: 'Tudo aqui foi uma primeira vez. A Pioneer 10 era a exploradora que ia adiante para descobrir se o caminho era seguro, abrindo a rota que as Voyager seguiriam depois.',
        missionIntroEn: 'Everything here was a first. Pioneer 10 was the scout that went ahead to find out whether the path was safe, opening the route the Voyagers would later follow.',
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
        contextPt: 'A sonda mais rápida já lançada, que deu a Plutão o seu primeiro retrato de perto. Quando partiu, Plutão ainda era o nono planeta; chegou lá nove anos depois, já reclassificado como planeta anão. Hoje viaja para fora do Sistema Solar, ainda enviando dados das regiões mais distantes que já exploramos.',
        contextEn: 'The fastest probe ever launched, the one that gave Pluto its first close-up portrait. When it set off, Pluto was still the ninth planet; it arrived nine years later, by then reclassified as a dwarf planet. Today it travels out of the Solar System, still returning data from the most distant regions we have ever explored.',
        missionIntroPt: 'Uma corrida de uma década para um único encontro. Tudo foi planejado em torno de poucas horas de sobrevoo de Plutão, depois das quais a nave seguiu adiante e ganhou um segundo alvo de brinde.',
        missionIntroEn: 'A decade-long race toward a single encounter. Everything was planned around a few hours of Pluto flyby, after which the probe pressed on and earned a bonus second target.',
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
        contextPt: 'A sonda que estuda Júpiter por dentro, das nuvens ao núcleo. É movida a energia solar, algo raríssimo tão longe do Sol, com três grandes painéis abertos como pás. Diferente das visitantes de passagem, fica em órbita do gigante e volta a mergulhar nele de tempos em tempos, mapeando o que há sob as nuvens.',
        contextEn: 'The spacecraft studying Jupiter from within, from the clouds to the core. It runs on solar power, exceedingly rare this far from the Sun, with three large panels spread like blades. Unlike the probes that just flew past, it stays in orbit around the giant and dives back into it again and again, mapping what lies beneath the clouds.',
        missionIntroPt: 'Um equilíbrio delicado: cada órbita é desenhada para roçar as nuvens e fugir depressa dos cinturões de radiação de Júpiter, que destruiriam a eletrônica da nave se ela ficasse perto tempo demais.',
        missionIntroEn: 'A delicate balance: each orbit is designed to graze the clouds and flee quickly from Jupiter’s radiation belts, which would destroy the probe’s electronics if it lingered too close.',
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

/** Frase de abertura da Missão, no locale, ou null se não houver. */
export function spacecraftMissionIntro(id: string, locale: 'pt-BR' | 'en'): string | null {
    const content = SPACECRAFT_CONTENT[id];
    if (!content) return null;
    return locale === 'en' ? content.missionIntroEn : content.missionIntroPt;
}

/** Marcos da nave (timeline da Missão), ou lista vazia se não houver. */
export function spacecraftMilestones(id: string): SpacecraftMilestone[] {
    return SPACECRAFT_CONTENT[id]?.milestones ?? [];
}
