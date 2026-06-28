/**
 * História dos objetos famosos do radar (5 asteroides + 3 cometas + 5 naves).
 *
 * Responsabilidade: guardar o texto da aba "História" de cada objeto famoso, em PT e EN, indexado
 * pelo id sintético (known:<numero> para asteroides, comet:<designacao> para cometas,
 * spacecraft:<horizonsId> para naves). Função pura de consulta (famousLoreFor): dado o id e o locale,
 * devolve o parágrafo ou null quando o objeto não tem história cadastrada (todo asteroide comum do
 * feed, por exemplo).
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
        pt: 'Ceres é o maior corpo do cinturão de asteroides e o único do cinturão classificado como planeta anão, a mesma categoria de Plutão. Foi o primeiro asteroide descoberto, em 1801, por Giuseppe Piazzi, e por décadas foi tratado como planeta antes de ser reclassificado. A sonda Dawn da NASA o orbitou entre 2015 e 2018 e revelou manchas brilhantes de sal na cratera Occator, sinais de água que um dia escapou do subsolo.',
        en: 'Ceres is the largest body in the asteroid belt and the only belt object classified as a dwarf planet, the same category as Pluto. It was the first asteroid ever discovered, in 1801, by Giuseppe Piazzi, and for decades it was treated as a planet before being reclassified. NASA’s Dawn spacecraft orbited it from 2015 to 2018 and revealed bright salt deposits in Occator crater, traces of water that once escaped from below the surface.',
    },
    'known:4': {
        pt: 'Vesta é o segundo maior corpo do cinturão de asteroides, descoberto em 1807 por Heinrich Olbers. É a fonte de muitos meteoritos que caem na Terra, os HED, e é brilhante o bastante para ser visto a olho nu em céus escuros, o único asteroide com esse brilho. A sonda Dawn da NASA o visitou em 2011 e 2012, mapeando Rheasilvia, uma cratera gigante no polo sul aberta por um impacto que espalhou fragmentos por todo o Sistema Solar.',
        en: 'Vesta is the second largest body in the asteroid belt, discovered in 1807 by Heinrich Olbers. It is the source of many meteorites that fall to Earth, the HEDs, and is bright enough to be seen with the naked eye under dark skies, the only asteroid that bright. NASA’s Dawn spacecraft visited it in 2011 and 2012, mapping Rheasilvia, a giant crater at its south pole carved by an impact that scattered fragments across the Solar System.',
    },
    'known:433': {
        pt: 'Eros foi o primeiro asteroide próximo da Terra a ser descoberto, em 1898, e mais tarde o primeiro a receber uma sonda em órbita e a ter um pouso. Em 2000 a missão NEAR Shoemaker da NASA orbitou este asteroide por um ano e, em 2001, pousou suavemente em sua superfície alongada, mesmo sem ter sido projetada para isso. Eros tem o formato de um amendoim de 34 km de comprimento.',
        en: 'Eros was the first near-Earth asteroid ever discovered, in 1898, and later the first to be orbited by a spacecraft and the first to be landed on. In 2000, NASA’s NEAR Shoemaker mission orbited it for a year and, in 2001, gently touched down on its elongated surface, even though it was never designed to land. Eros is shaped like a peanut about 34 km long.',
    },
    'known:101955': {
        pt: 'Bennu é um asteroide rico em carbono, descoberto em 1999, e um dos mais estudados de perto. A missão OSIRIS-REx da NASA chegou em 2018, coletou uma amostra da superfície em 2020 e a trouxe para a Terra em 2023. As rochas reveladas guardam moléculas orgânicas e vestígios de água, pistas sobre os ingredientes que deram origem aos planetas. É também um dos asteroides com maior chance conhecida de se aproximar muito da Terra nos próximos séculos.',
        en: 'Bennu is a carbon-rich asteroid, discovered in 1999, and one of the most closely studied. NASA’s OSIRIS-REx mission arrived in 2018, collected a surface sample in 2020 and brought it back to Earth in 2023. The returned rocks hold organic molecules and traces of water, clues about the ingredients that gave rise to the planets. It is also one of the asteroids with the highest known chance of a very close pass by Earth over the coming centuries.',
    },
    'known:25143': {
        pt: 'Itokawa foi o primeiro asteroide do qual uma amostra retornou à Terra. Descoberto em 1998, recebeu a sonda japonesa Hayabusa, que pousou nele em 2005 e, apesar de várias falhas, conseguiu trazer grãos minúsculos da superfície em 2010. As partículas confirmaram que este pequeno corpo é uma pilha de escombros, fragmentos mantidos juntos por gravidade fraca, e não uma rocha sólida.',
        en: 'Itokawa was the first asteroid to have a sample returned to Earth. Discovered in 1998, it was the target of Japan’s Hayabusa probe, which landed on it in 2005 and, despite many failures, managed to bring back tiny surface grains in 2010. The particles confirmed that this small body is a rubble pile, fragments held together by weak gravity rather than a solid rock.',
    },

    // ─── Cometas ───
    'comet:1P': {
        pt: 'O cometa Halley é o mais famoso de todos e o único cometa de período curto visível a olho nu, voltando a cada 75 ou 76 anos. É observado há mais de dois mil anos, mas foi Edmond Halley quem, em 1705, percebeu que avistamentos antigos eram do mesmo cometa e previu seu retorno em 1758, confirmando que cometas seguem órbitas regulares. Em 1986, a sonda Giotto da ESA voou perto de seu núcleo. A próxima passagem perto do Sol será em 2061.',
        en: 'Comet Halley is the most famous of all and the only short-period comet visible to the naked eye, returning every 75 to 76 years. It has been recorded for over two thousand years, but it was Edmond Halley who, in 1705, realised that several old sightings were the same comet and predicted its return in 1758, confirming that comets follow regular orbits. In 1986, ESA’s Giotto probe flew close to its nucleus. Its next pass near the Sun will be in 2061.',
    },
    'comet:2P': {
        pt: 'O cometa Encke tem o período mais curto entre os cometas conhecidos, pouco mais de 3 anos, então passa pelo interior do Sistema Solar com frequência. Foi avistado pela primeira vez em 1786, mas leva o nome de Johann Encke, que calculou sua órbita e previu o retorno em 1819, o segundo cometa a ter o retorno previsto, depois do Halley. É a origem da chuva de meteoros Táuridas, vista todo ano em outubro e novembro, e seu núcleo já perdeu grande parte do gelo em milhares de passagens próximas ao Sol.',
        en: 'Comet Encke has the shortest period of any known comet, a little over 3 years, so it sweeps through the inner Solar System often. It was first spotted in 1786 but is named after Johann Encke, who computed its orbit and predicted its 1819 return, making it the second comet to have its return predicted, after Halley. It is the source of the Taurid meteor shower, seen every year in October and November, and its nucleus has lost much of its ice over thousands of close passes by the Sun.',
    },
    'comet:67P': {
        pt: 'O cometa 67P Churyumov-Gerasimenko foi descoberto em 1969 pelos astrônomos soviéticos Klim Churyumov e Svetlana Gerasimenko, que lhe deram o nome. Foi palco da missão Rosetta da ESA, a primeira a orbitar um cometa e a pousar nele. Em 2014 o módulo Philae tocou sua superfície de dois lóbulos, em formato de pato de borracha. Rosetta acompanhou o cometa por dois anos enquanto ele se aquecia perto do Sol, mostrando jatos de gás e poeira nascendo do gelo.',
        en: 'Comet 67P Churyumov-Gerasimenko was discovered in 1969 by the Soviet astronomers Klim Churyumov and Svetlana Gerasimenko, who gave it its name. It was the stage for ESA’s Rosetta mission, the first to orbit a comet and land on one. In 2014 the Philae module touched down on its two-lobed, rubber-duck-shaped surface. Rosetta followed the comet for two years as it warmed near the Sun, revealing jets of gas and dust born from the ice.',
    },

    // ─── Naves e missões ───
    // A História da nave NÃO repete o Resumo nem a linha do tempo da Missão (em spacecraftData.ts):
    // traz fatos curiosos e pouco conhecidos, o lado humano e surpreendente que os marcos não cabem.
    'spacecraft:-31': {
        pt: 'A bordo vai o Disco de Ouro, um disco de cobre banhado a ouro com saudações em 55 idiomas, música de Bach a Chuck Berry e o som de um beijo, pensado para durar um bilhão de anos. O computador que pilota a nave tem menos memória que um chaveiro eletrônico moderno, e mesmo assim os engenheiros ainda enviam atualizações de software para corrigir a sonda à distância. Quando a energia acabar, ela continuará viajando para sempre, sem nunca mais dar notícia.',
        en: 'On board rides the Golden Record, a gold-plated copper disc with greetings in 55 languages, music from Bach to Chuck Berry and the sound of a kiss, meant to last a billion years. The computer flying the probe has less memory than a modern key fob, yet engineers still send software updates to fix the spacecraft from afar. When the power runs out, it will keep travelling forever, never to be heard from again.',
    },
    'spacecraft:-32': {
        pt: 'Por décadas a Voyager 2 transmitiu por uma única antena no mundo capaz de alcançá-la, a gigante de 70 metros em Camberra, na Austrália, no hemisfério sul por causa da rota da nave. Em 2020 essa antena saiu para reparos por quase um ano e a Terra ficou sem poder enviar comandos, só ouvindo. A sonda também carrega um Disco de Ouro com instruções gravadas de como tocá-lo, caso alguém, algum dia, o encontre.',
        en: 'For decades Voyager 2 has been reached by a single antenna on Earth able to talk to it, the 70-metre giant in Canberra, Australia, in the southern hemisphere because of the probe’s path. In 2020 that antenna went offline for repairs for nearly a year, and Earth could only listen, unable to send commands. The probe also carries a Golden Record with engraved instructions for how to play it, should anyone, someday, find it.',
    },
    'spacecraft:-23': {
        pt: 'A Pioneer 10 levava uma placa de alumínio dourado com a figura de um homem e uma mulher e um mapa apontando de onde ela veio, a primeira mensagem deliberada da humanidade ao espaço, desenhada por Carl Sagan e Frank Drake em poucas semanas. Por anos foi o objeto mais distante feito por pessoas, até a Voyager 1 ultrapassá-la. Hoje deriva muda na direção da estrela Aldebarã, que só alcançará daqui a cerca de dois milhões de anos.',
        en: 'Pioneer 10 carried a gold-anodised aluminium plaque showing a man and a woman and a map of where it came from, humanity’s first deliberate message to space, designed by Carl Sagan and Frank Drake in just a few weeks. For years it was the most distant human-made object, until Voyager 1 overtook it. Today it drifts silent toward the star Aldebaran, which it will reach only in about two million years.',
    },
    'spacecraft:-98': {
        pt: 'A New Horizons leva uma parte das cinzas de Clyde Tombaugh, o astrônomo que descobriu Plutão em 1930, levando-o assim a visitar o mundo que ele revelou. A nave cruzou todo o Sistema Solar quase o tempo todo hibernando, acordada por poucos meses por ano para economizar energia. Tão longe e tão rápida, ela não tinha freios: o encontro com Plutão durou só algumas horas, e cada imagem demorou mais de quatro horas para chegar à Terra.',
        en: 'New Horizons carries some of the ashes of Clyde Tombaugh, the astronomer who discovered Pluto in 1930, letting him visit the world he revealed. The spacecraft crossed the entire Solar System mostly hibernating, woken for only a few months a year to save power. So far and so fast, it had no brakes: the Pluto encounter lasted only a few hours, and each image took more than four hours to reach Earth.',
    },
    'spacecraft:-61': {
        pt: 'A Juno leva três bonecos de Lego de alumínio: o deus romano Júpiter, sua esposa Juno e o astrônomo Galileu, que descobriu as quatro maiores luas do planeta. Seus instrumentos vivem dentro de um cofre de titânio que funciona como abrigo contra a radiação brutal de Júpiter, a mais intensa do Sistema Solar fora do Sol. E as fotos mais belas dos polos vêm da JunoCam, uma câmera incluída sobretudo para o público, com imagens que qualquer pessoa pode baixar e tratar.',
        en: 'Juno carries three aluminium Lego figures: the Roman god Jupiter, his wife Juno and the astronomer Galileo, who discovered the planet’s four largest moons. Its instruments live inside a titanium vault that acts as a shelter against Jupiter’s brutal radiation, the most intense in the Solar System outside the Sun. And the most beautiful pole images come from JunoCam, a camera included mainly for the public, with pictures anyone can download and process.',
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
