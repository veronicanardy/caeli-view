/**
 * História dos objetos famosos do radar (5 asteroides + 4 cometas).
 *
 * Responsabilidade: guardar o texto da aba "História" de cada objeto famoso, em PT e EN, indexado
 * pelo id sintético (known:<numero> para asteroides, comet:<designacao> para cometas). Função pura
 * de consulta (famousLoreFor): dado o id e o locale, devolve o parágrafo ou null quando o objeto não
 * tem história cadastrada (todo asteroide comum do feed, por exemplo).
 *
 * O card só exibe a aba História quando esta consulta retorna texto, então asteroides comuns seguem
 * com as 3 abas de sempre (Resumo, Perfil físico, Aproximação).
 */

type Lore = { pt: string; en: string };

/**
 * Texto histórico por id sintético. Asteroides usam known:<numero> (casa com knownAsteroidId);
 * cometas usam comet:<designacao> (casa com knownCometId). Sem travessões nos textos do produto.
 */
const FAMOUS_LORE: Record<string, Lore> = {
    // ─── Asteroides ───
    'known:1': {
        pt: 'Ceres é o maior corpo do cinturão de asteroides e o único classificado como planeta anão. Descoberto em 1801 por Giuseppe Piazzi, foi o primeiro asteroide conhecido. A sonda Dawn da NASA orbitou Ceres entre 2015 e 2018 e revelou manchas brilhantes de sal na cratera Occator, sinais de água que um dia escapou do subsolo.',
        en: 'Ceres is the largest body in the asteroid belt and the only one classified as a dwarf planet. Discovered in 1801 by Giuseppe Piazzi, it was the first asteroid ever found. NASA’s Dawn spacecraft orbited Ceres from 2015 to 2018 and revealed bright salt deposits in Occator crater, traces of water that once escaped from below the surface.',
    },
    'known:4': {
        pt: 'Vesta é o segundo maior corpo do cinturão e a fonte de muitos meteoritos que caem na Terra, os HED. A sonda Dawn o visitou em 2011 e 2012, mapeando uma cratera gigante no polo sul, Rheasilvia, aberta por um impacto que espalhou fragmentos por todo o Sistema Solar. É brilhante o bastante para ser visto a olho nu em céus escuros.',
        en: 'Vesta is the second largest body in the belt and the source of many meteorites that fall to Earth, the HEDs. The Dawn spacecraft visited it in 2011 and 2012, mapping a giant crater at its south pole, Rheasilvia, carved by an impact that scattered fragments across the Solar System. It is bright enough to be seen with the naked eye under dark skies.',
    },
    'known:433': {
        pt: 'Eros foi o primeiro asteroide a receber uma sonda em órbita e o primeiro a ter um pouso. Em 2000 a missão NEAR Shoemaker da NASA orbitou este asteroide próximo da Terra por um ano e, em 2001, pousou suavemente em sua superfície alongada, mesmo sem ter sido projetada para isso. Eros tem o formato de um amendoim de 34 km de comprimento.',
        en: 'Eros was the first asteroid to be orbited by a spacecraft and the first to be landed on. In 2000, NASA’s NEAR Shoemaker mission orbited this near-Earth asteroid for a year and, in 2001, gently touched down on its elongated surface, even though it was never designed to land. Eros is shaped like a peanut about 34 km long.',
    },
    'known:101955': {
        pt: 'Bennu é um asteroide rico em carbono e um dos mais estudados de perto. A missão OSIRIS-REx da NASA chegou em 2018, coletou uma amostra da superfície em 2020 e a trouxe para a Terra em 2023. As rochas reveladas guardam moléculas orgânicas e vestígios de água, pistas sobre os ingredientes que deram origem aos planetas.',
        en: 'Bennu is a carbon-rich asteroid and one of the most closely studied. NASA’s OSIRIS-REx mission arrived in 2018, collected a surface sample in 2020 and brought it back to Earth in 2023. The returned rocks hold organic molecules and traces of water, clues about the ingredients that gave rise to the planets.',
    },
    'known:25143': {
        pt: 'Itokawa foi o primeiro asteroide do qual uma amostra retornou à Terra. A sonda japonesa Hayabusa pousou nele em 2005 e, apesar de várias falhas, conseguiu trazer grãos minúsculos da superfície em 2010. As partículas confirmaram que este pequeno corpo é uma pilha de escombros, fragmentos mantidos juntos por gravidade fraca.',
        en: 'Itokawa was the first asteroid to have a sample returned to Earth. Japan’s Hayabusa probe landed on it in 2005 and, despite many failures, managed to bring back tiny surface grains in 2010. The particles confirmed that this small body is a rubble pile, fragments held together by weak gravity.',
    },

    // ─── Cometas ───
    'comet:1P': {
        pt: 'O cometa Halley é o mais famoso de todos e o único cometa de período curto visível a olho nu, voltando a cada 75 ou 76 anos. Edmond Halley previu seu retorno em 1758, confirmando que cometas seguem órbitas regulares. Em 1986, a sonda Giotto da ESA voou perto de seu núcleo. A próxima passagem pela Terra será em 2061.',
        en: 'Comet Halley is the most famous of all and the only short-period comet visible to the naked eye, returning every 75 to 76 years. Edmond Halley predicted its return in 1758, confirming that comets follow regular orbits. In 1986, ESA’s Giotto probe flew close to its nucleus. Its next pass by Earth will be in 2061.',
    },
    'comet:2P': {
        pt: 'O cometa Encke tem o período mais curto entre os cometas conhecidos, pouco mais de 3 anos, então passa pelo interior do Sistema Solar com frequência. É a origem da chuva de meteoros Táuridas, vista todo ano em outubro e novembro. Seu núcleo já perdeu grande parte do gelo em milhares de passagens próximas ao Sol.',
        en: 'Comet Encke has the shortest period of any known comet, a little over 3 years, so it sweeps through the inner Solar System often. It is the source of the Taurid meteor shower, seen every year in October and November. Its nucleus has lost much of its ice over thousands of close passes by the Sun.',
    },
    'comet:67P': {
        pt: 'O cometa 67P Churyumov-Gerasimenko foi palco da missão Rosetta da ESA, a primeira a orbitar um cometa e a pousar nele. Em 2014 o módulo Philae tocou sua superfície de dois lóbulos, em formato de pato de borracha. Rosetta acompanhou o cometa por dois anos enquanto ele se aquecia perto do Sol, mostrando jatos de gás e poeira nascendo do gelo.',
        en: 'Comet 67P Churyumov-Gerasimenko was the stage for ESA’s Rosetta mission, the first to orbit a comet and land on one. In 2014 the Philae module touched down on its two-lobed, rubber-duck-shaped surface. Rosetta followed the comet for two years as it warmed near the Sun, revealing jets of gas and dust born from the ice.',
    },
    'comet:C/2020 F3': {
        pt: 'O cometa NEOWISE foi o grande cometa de 2020, o mais brilhante visível do hemisfério norte em décadas. Descoberto em março daquele ano pelo telescópio espacial NEOWISE, exibiu duas caudas e foi visto a olho nu por semanas em julho. Sua órbita é tão alongada que só voltará a se aproximar do Sol daqui a cerca de 6800 anos.',
        en: 'Comet NEOWISE was the great comet of 2020, the brightest visible from the northern hemisphere in decades. Discovered in March that year by the NEOWISE space telescope, it showed two tails and was seen with the naked eye for weeks in July. Its orbit is so elongated that it will not return near the Sun for about 6,800 years.',
    },
};

/**
 * História de um objeto famoso pelo id sintético, no locale pedido, ou null quando não há texto
 * cadastrado (objetos comuns do feed). O card usa o null para decidir se mostra a aba História.
 */
export function famousLoreFor(id: string | null | undefined, locale: 'pt-BR' | 'en'): string | null {
    if (!id) return null;
    const lore = FAMOUS_LORE[id];
    if (!lore) return null;
    return locale === 'en' ? lore.en : lore.pt;
}
