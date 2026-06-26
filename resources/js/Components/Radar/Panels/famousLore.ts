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
    'spacecraft:-31': {
        pt: 'A Voyager 1 foi lançada pela NASA em 1977 e é o objeto construído por pessoas mais distante da Terra. Visitou Júpiter e Saturno, revelou vulcões ativos na lua Io e detalhes dos anéis, e seguiu rumo ao espaço entre as estrelas. Em 2012 cruzou a fronteira onde o vento do Sol dá lugar ao meio interestelar, a primeira sonda a fazer isso. Leva a bordo o Disco de Ouro, com sons e imagens da Terra, e ainda envia sinais que levam mais de 22 horas para chegar até aqui.',
        en: 'Voyager 1 was launched by NASA in 1977 and is the most distant human-made object from Earth. It visited Jupiter and Saturn, revealed active volcanoes on the moon Io and details of the rings, and then headed toward the space between the stars. In 2012 it crossed the boundary where the Sun’s wind gives way to the interstellar medium, the first probe to do so. It carries the Golden Record, with sounds and images of Earth, and still sends back signals that take more than 22 hours to reach us.',
    },
    'spacecraft:-32': {
        pt: 'A Voyager 2 partiu pouco antes da Voyager 1, em 1977, e é a única sonda a visitar os quatro planetas gigantes: Júpiter, Saturno, Urano e Netuno. Suas imagens de Urano e Netuno, feitas nos anos 1980, ainda são quase tudo que vemos de perto desses dois mundos. Em 2018 também alcançou o espaço interestelar, por um caminho diferente do da irmã. Como ela, carrega um Disco de Ouro e continua transmitindo, agora a mais de 130 vezes a distância da Terra ao Sol.',
        en: 'Voyager 2 set off shortly before Voyager 1, in 1977, and is the only probe to visit all four giant planets: Jupiter, Saturn, Uranus and Neptune. Its images of Uranus and Neptune, taken in the 1980s, are still almost everything we have seen up close of those two worlds. In 2018 it too reached interstellar space, by a different path from its sister. Like it, it carries a Golden Record and keeps transmitting, now more than 130 times the Earth-Sun distance away.',
    },
    'spacecraft:-23': {
        pt: 'A Pioneer 10 foi lançada pela NASA em 1972 e abriu o caminho para o Sistema Solar exterior. Foi a primeira nave a atravessar o cinturão de asteroides e a primeira a passar perto de Júpiter, em 1973, enviando as primeiras imagens próximas do planeta gigante. Leva uma placa gravada com a figura de um casal humano e a posição da Terra, pensada para um eventual encontro futuro. O último sinal fraco chegou em 2003; desde então ela segue muda, levada pela própria velocidade rumo às estrelas.',
        en: 'Pioneer 10 was launched by NASA in 1972 and opened the way to the outer Solar System. It was the first spacecraft to cross the asteroid belt and the first to fly past Jupiter, in 1973, sending back the first close images of the giant planet. It carries a plaque engraved with a human couple and Earth’s location, meant for a possible future encounter. Its last faint signal arrived in 2003; since then it drifts silent, carried by its own speed toward the stars.',
    },
    'spacecraft:-98': {
        pt: 'A New Horizons foi lançada pela NASA em 2006 como a sonda mais rápida já enviada, a caminho de Plutão. Em 2015 fez o primeiro sobrevoo próximo de Plutão e suas luas, revelando montanhas de gelo e uma grande planície em forma de coração num mundo que se imaginava morto. Depois seguiu mais fundo no cinturão de Kuiper e visitou Arrokoth, o objeto mais distante já explorado de perto. Hoje viaja rumo à borda do Sistema Solar, ainda enviando dados.',
        en: 'New Horizons was launched by NASA in 2006 as the fastest probe ever sent, bound for Pluto. In 2015 it made the first close flyby of Pluto and its moons, revealing ice mountains and a large heart-shaped plain on a world once thought to be dead. It then went deeper into the Kuiper Belt and visited Arrokoth, the most distant object ever explored up close. Today it travels toward the edge of the Solar System, still sending back data.',
    },
    'spacecraft:-61': {
        pt: 'A Juno foi lançada pela NASA em 2011 e chegou a Júpiter em 2016 para estudar o maior planeta do Sistema Solar por dentro. Em vez de uma órbita regular, ela mergulha em arcos longos que passam perto das nuvens e fogem dos cinturões de radiação intensa do planeta. Mediu o campo magnético, sondou o que há sob as nuvens e fez retratos impressionantes dos ciclones nos polos. É movida a energia solar, algo raro tão longe do Sol, com três grandes painéis abertos como pás.',
        en: 'Juno was launched by NASA in 2011 and reached Jupiter in 2016 to study the largest planet in the Solar System from within. Instead of a regular orbit, it dives in long arcs that skim close to the clouds and escape the planet’s intense radiation belts. It has measured the magnetic field, probed what lies beneath the clouds and taken striking portraits of the cyclones at the poles. It runs on solar power, rare this far from the Sun, with three large panels spread like blades.',
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
