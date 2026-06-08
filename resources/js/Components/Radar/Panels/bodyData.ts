/**
 * Dados estáticos dos corpos celestes exibidos pelos painéis.
 *
 * Responsabilidade: centralizar fatos científicos, textos de contexto e
 * narrativas históricas em um único módulo. Não calcula posição, órbita,
 * efeméride ou qualquer dado dinâmico da cena.
 *
 * Anteriormente dividido entre bodyInfoContent.ts (fatos) e bodyHistory.ts
 * (histórico) — unificados aqui porque compartilham o mesmo tipo de chave
 * (BodyId) e são sempre lidos juntos pelo UnifiedFocusCard.
 */

export type BodyId = 'earth' | 'moon' | 'sun' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

export interface BodyFact {
    labelPt: string;
    labelEn: string;
    value: string;
}

export interface BodyConfig {
    namePt: string;
    nameEn: string;
    subtitlePt: string;
    subtitleEn: string;
    contextPt: string;
    contextEn: string;
    dotColor: string;
    facts: BodyFact[];
    historyPt: string;
    historyEn: string;
}

export const BODIES: Record<BodyId, BodyConfig> = {
    sun: {
        namePt: 'Sol',
        nameEn: 'Sun',
        subtitlePt: 'Estrela · Centro do Sistema Solar',
        subtitleEn: 'Star · Center of the Solar System',
        contextPt: 'A estrela que ancora todo o sistema. Sua luz define o lado diurno dos corpos e sua gravidade mantém planetas, asteroides e cometas em movimento ao seu redor.',
        contextEn: 'The star that anchors the whole system. Its light defines the daylight side of bodies, and its gravity keeps planets, asteroids, and comets moving around it.',
        dotColor: '#f5c842',
        facts: [
            { labelPt: 'Distância da Terra',  labelEn: 'Distance from Earth',  value: '149,6 mi km (1 UA) / 149.6M km (1 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '1.392.700 km (109× a Terra)' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '~25 dias (equador) / ~25 days (equator)' },
            { labelPt: 'Temperatura (sup.)',  labelEn: 'Temperature (surf.)',   value: '~5.500 °C / ~9.900 °F' },
            { labelPt: 'Tipo espectral',      labelEn: 'Spectral type',        value: 'G2V (anã amarela / yellow dwarf)' },
        ],
        historyPt: 'O Sol foi adorado como divindade em praticamente todas as culturas antigas — Ra no Egito, Hélio na Grécia, Inti nos Andes. Cada povo inventava uma história diferente para explicar a luz que aquecia o mundo, mas todos chegavam à mesma conclusão: ela era sagrada. Em 1543, Copérnico ousou propor que era o Sol, e não a Terra, o centro do sistema planetário — e o mundo tardou séculos para aceitar isso. A verdadeira natureza do Sol só foi compreendida no século XX: em 1920, Arthur Eddington sugeriu que a fusão de hidrogênio poderia ser sua fonte de energia. Era uma ideia radical para a época, confirmada décadas depois quando a física nuclear ganhou maturidade suficiente para dar sentido ao que estava acontecendo no interior de uma estrela.',
        historyEn: 'The Sun was worshipped as a deity in virtually every ancient culture — Ra in Egypt, Helios in Greece, Inti in the Andes. Each civilization invented different stories to explain the light that warmed their world, but all reached the same conclusion: it was sacred. In 1543, Copernicus dared to propose that the Sun, not Earth, was the center of the planetary system — and the world took centuries to fully accept it. The Sun\'s true nature was only understood in the 20th century: in 1920, Arthur Eddington suggested hydrogen fusion as its energy source. It was a radical idea for the time, confirmed decades later once nuclear physics had matured enough to make sense of what was happening inside a star.',
    },
    earth: {
        namePt: 'Terra',
        nameEn: 'Earth',
        subtitlePt: 'Planeta · Referência do Radar',
        subtitleEn: 'Planet · Radar Reference',
        contextPt: 'O ponto de partida do radar. É daqui que as distâncias fazem sentido: cada aproximação, escala e trajetória é interpretada em relação ao nosso planeta.',
        contextEn: "The radar's starting point. From here, distances gain meaning: every approach, scale, and trajectory is interpreted in relation to our planet.",
        dotColor: '#4a9eff',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '149,6 milhões km (1 UA) / 149.6 million km (1 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '12.742 km' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '365,25 dias / 365.25 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '24 horas / 24 hours' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '1 Lua / Moon' },
            { labelPt: 'Temperatura média',   labelEn: 'Temperature (avg.)',   value: '~15 °C' },
        ],
        historyPt: 'Por milênios, a Terra foi considerada o centro imóvel do universo — e por que não seria? Ela não balança, não parece girar, e o céu inteiro se move ao seu redor. Foi Copérnico quem a deslocou desse trono em 1543, e Galileu quem pagou o preço por confirmar isso com o telescópio. O nome "Terra" vem do latim, assim como "Earth" em inglês e "Erde" em alemão vêm de raízes proto-germânicas — todos significando simplesmente "chão". A esfericidade da Terra, ao contrário do que se pensa, já era conhecida pelos gregos antigos: por volta de 240 a.C., Eratóstenes mediu sua circunferência usando sombras e um poço no Egito, chegando a um resultado de notável precisão.',
        historyEn: 'For millennia, Earth was considered the immovable center of the universe — and why wouldn\'t it be? It doesn\'t shake, doesn\'t seem to spin, and the entire sky revolves around it. It was Copernicus who displaced it from that throne in 1543, and Galileo who paid the price for confirming it with the telescope. The name "Earth" comes from Old English and Proto-Germanic roots, just as "Erde" in German does — all meaning simply "ground." Contrary to popular myth, the spherical shape of the Earth was already known to the ancient Greeks: around 240 BC, Eratosthenes measured its circumference using shadows and a well in Egypt, arriving at a remarkably accurate result.',
    },
    moon: {
        namePt: 'Lua',
        nameEn: 'Moon',
        subtitlePt: 'Satélite natural · Régua de escala',
        subtitleEn: 'Natural satellite · Scale marker',
        contextPt: 'A régua mais intuitiva do espaço próximo. Quando um objeto aparece a 1 DL, ele está aproximadamente à distância média entre a Terra e a Lua.',
        contextEn: 'The most intuitive ruler for nearby space. When an object appears at 1 LD, it is roughly at the average distance between Earth and the Moon.',
        dotColor: '#c2c4c8',
        facts: [
            { labelPt: 'Distância da Terra',  labelEn: 'Distance from Earth',  value: '~384.400 km (1 DL)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '3.474 km (27% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '27,3 dias / 27.3 days' },
            { labelPt: 'Rotação',             labelEn: 'Rotation',             value: 'Síncrona (face travada / tidally locked)' },
            { labelPt: 'Fases',               labelEn: 'Phases',               value: 'Ciclo de 29,5 dias / 29.5-day cycle' },
            { labelPt: 'Temperatura média',   labelEn: 'Temperature (avg.)',   value: '−53 °C (−63 °F a +107 °C) / −63 °F (+107 °C face, −173 °C dark)' },
        ],
        historyPt: 'A Lua é o único corpo celeste além da Terra pisado por seres humanos — e talvez por isso nunca deixe de impressionar. Galileu foi o primeiro a voltá-la ao telescópio, em 1609, e ficou desconcertado com o que viu: montanhas, vales, crateras. Aquilo destruía a ideia aristotélica de que os corpos celestes eram esferas perfeitas e imutáveis. Séculos depois, as missões Apollo (1969–1972) trouxeram de volta cerca de 380 kg de amostras lunares que ainda são estudadas hoje. O nome vem do latim "Luna", que deixou rastros inesperados na língua: dele vieram "lunático", "lúnula" e o próprio conceito de mês — o tempo que a Lua leva para completar um ciclo.',
        historyEn: 'The Moon is the only celestial body beyond Earth ever walked on by humans — and perhaps that\'s why it never stops being awe-inspiring. Galileo was the first to turn a telescope to it, in 1609, and was unsettled by what he saw: mountains, valleys, craters. It shattered the Aristotelian idea that celestial bodies were perfect, unchanging spheres. Centuries later, the Apollo missions (1969–1972) brought back around 380 kg of lunar samples that are still studied today. The name comes from Latin "Luna," which left unexpected traces in language: from it came "lunatic," "lunula," and the very concept of the month — the time it takes the Moon to complete one cycle.',
    },
    mercury: {
        namePt: 'Mercúrio',
        nameEn: 'Mercury',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'Pequeno, veloz e extremo. Mercúrio dá uma volta ao redor do Sol em apenas 88 dias e percorre a órbita mais elíptica entre os oito planetas — ora mais distante, ora perigosamente próximo do Sol, onde suas condições ficam ainda mais severas.',
        contextEn: 'Small, fast, and extreme. Mercury completes an orbit around the Sun in only 88 days and follows the most elliptical orbit among the eight planets — at times farther away, at times dangerously close to the Sun, where its already harsh conditions become even more severe.',
        dotColor: '#b0b8c8',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '57,9 mi km (0,387 UA) / 57.9M km (0.387 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '4.879 km (38% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '88 dias / 88 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '58,646 dias / 58.646 days' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: 'Nenhum / None' },
            { labelPt: 'Temperatura média',   labelEn: 'Temperature (avg.)',   value: '+167 °C (dia) / −183 °C (noite) / +167 °C (day) / −183 °C (night)' },
        ],
        historyPt: 'Mercúrio é conhecido desde a Antiguidade, mas por muito tempo foi tratado como dois astros distintos — uma estrela que aparecia de manhã e outra que surgia ao entardecer — antes que os gregos percebessem que ambas eram o mesmo planeta. Os romanos o batizaram em homenagem ao mensageiro dos deuses, pela velocidade com que ele cruza o céu. A primeira sonda a visitá-lo foi a Mariner 10, em 1974, que revelou uma superfície densamente craterizada. A MESSENGER entrou em órbita em 2011 e passou quatro anos mapeando Mercúrio por completo, incluindo regiões nunca antes fotografadas. Entre suas descobertas mais surpreendentes: gelo de água em crateras permanentemente na sombra, próximas ao polo.',
        historyEn: 'Mercury has been known since antiquity, but was long treated as two separate objects — a star that appeared in the morning and another that rose at dusk — before the Greeks realized both were the same planet. The Romans named it after the messenger of the gods, for the speed with which it crosses the sky. The first spacecraft to visit it was Mariner 10, in 1974, which revealed a heavily cratered surface. MESSENGER entered orbit in 2011 and spent four years mapping Mercury completely, including regions never before photographed. Among its most surprising discoveries: water ice in permanently shadowed craters near the pole.',
    },
    venus: {
        namePt: 'Vênus',
        nameEn: 'Venus',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'Quase do tamanho da Terra, mas com um destino completamente diferente: atmosfera densa, calor extremo e nuvens que refletem tanta luz que o tornam o planeta mais brilhante no nosso céu.',
        contextEn: 'Nearly Earth-sized, but with a completely different fate: a dense atmosphere, extreme heat, and clouds so reflective that they make it the brightest planet in our sky.',
        dotColor: '#c8b870',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '108,2 mi km (0,723 UA) / 108.2M km (0.723 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '12.104 km (95% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '224,7 dias / 224.7 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '243,018 dias (retrógrado) / 243.018 days (retrograde)' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: 'Nenhum / None' },
            { labelPt: 'Temperatura média',   labelEn: 'Temperature (avg.)',   value: '~465 °C (superfície) / ~465 °C (surface)' },
        ],
        historyPt: 'Vênus é o objeto mais brilhante do céu noturno depois da Lua, e durante séculos foi chamado de "estrela d\'alva" — sem que se soubesse que era um planeta. Os babilônios o registravam há mais de três mil anos, e quase todas as culturas antigas lhe atribuíram alguma divindade feminina: a deusa do amor, da beleza, do amanhecer. O nome romano homenageia Vênus, deusa do amor. A União Soviética foi pioneira na sua exploração: a Venera 7 (1970) foi a primeira sonda a pousar com sucesso em outro planeta e transmitir dados da superfície. O que ela encontrou foi perturbador — temperatura próxima a 460 °C e uma pressão atmosférica noventa vezes maior que a da Terra, hostil a qualquer sonda que tentasse permanecer por mais de uma hora.',
        historyEn: 'Venus is the brightest object in the night sky after the Moon, and for centuries was called the "morning star" — without anyone knowing it was a planet. The Babylonians recorded it more than three thousand years ago, and nearly every ancient culture assigned it a feminine deity: the goddess of love, beauty, or dawn. Its Roman name honors Venus, goddess of love. The Soviet Union pioneered its exploration: Venera 7 (1970) was the first spacecraft to successfully land on another planet and transmit data from the surface. What it found was unsettling — temperatures near 460 °C and atmospheric pressure ninety times greater than Earth\'s, an environment hostile enough to silence any probe within the hour.',
    },
    mars: {
        namePt: 'Marte',
        nameEn: 'Mars',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'O planeta vermelho. Sua cor vem do óxido de ferro na superfície, e sua órbita é mais elíptica que a da Terra — por isso sua distância até nós varia bastante ao longo dos anos.',
        contextEn: "The Red Planet. Its color comes from iron oxide on the surface, and its orbit is more elliptical than Earth's — which is why its distance from us varies significantly over the years.",
        dotColor: '#c87070',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '227,9 mi km (1,524 UA) / 227.9M km (1.524 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '6.779 km (53% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '687 dias / 687 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '24,623 horas / 24.623 hours' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: 'Dois / Two' },
            { labelPt: 'Temperatura média',   labelEn: 'Temperature (avg.)',   value: '−63 °C' },
        ],
        historyPt: 'Marte fascina a humanidade há milênios — seu tom avermelhado o associou à guerra e ao sangue em quase todas as culturas antigas. Os romanos o batizaram de Marte, deus da guerra. Em 1877, o astrônomo Giovanni Schiaparelli descreveu o que chamou de "canali" na superfície marciana — uma palavra italiana que significa "canais" no sentido de sulcos naturais, mas que foi traduzida para o inglês como "canals", sugerindo estruturas artificiais. Isso bastou para décadas de especulação sobre civilizações marcianas. A Mariner 4 (1965) foi a primeira sonda a fotografar Marte de perto e devolveu imagens de uma superfície árida e craterizada. Desde então, a busca não cessou — apenas mudou de escala: hoje, rovers investigam traços de vida microbiana passada na rocha e no subsolo.',
        historyEn: 'Mars has fascinated humanity for millennia — its reddish hue associated it with war and blood in nearly every ancient culture. The Romans named it after Mars, god of war. In 1877, astronomer Giovanni Schiaparelli described what he called "canali" on the Martian surface — an Italian word meaning natural channels or grooves, but mistranslated into English as "canals," implying artificial structures. That was enough to fuel decades of speculation about Martian civilizations. Mariner 4 (1965) was the first spacecraft to photograph Mars up close and returned images of a barren, cratered surface. Since then, the search has not stopped — it has only changed in scale: today, rovers probe ancient rock and subsurface layers for traces of past microbial life.',
    },
    jupiter: {
        namePt: 'Júpiter',
        nameEn: 'Jupiter',
        subtitlePt: 'Planeta · Sistema Solar Externo',
        subtitleEn: 'Planet · Outer Solar System',
        contextPt: 'O gigante gravitacional do Sistema Solar. Júpiter é tão massivo que influencia a arquitetura de órbitas, captura luas e perturba trajetórias de pequenos corpos.',
        contextEn: "The Solar System's gravitational giant. Jupiter is so massive that it shapes orbital architecture, captures moons, and perturbs the paths of small bodies.",
        dotColor: '#c8a060',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '778,5 mi km (5,203 UA) / 778.5M km (5.203 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '139.822 km (11,0× a Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '11,86 anos / 11.86 years' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '9h 55min 30s (mais rápido do SS)' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '115+ (Io, Europa, Ganimedes, Calisto…)' },
            { labelPt: 'Temperatura média',   labelEn: 'Temperature (avg.)',   value: '−108 °C (topo das nuvens) / −108 °C (cloud tops)' },
        ],
        historyPt: 'Júpiter era conhecido pelos babilônios há mais de três mil anos, que já rastreavam seus movimentos com precisão suficiente para fazer previsões astronômicas. Os romanos o nomearam em homenagem ao rei dos deuses — e nenhum outro planeta parecia mais adequado para carregar esse nome. Em 1610, Galileu apontou o telescópio para Júpiter e descobriu quatro luas orbitando-o: Io, Europa, Ganimedes e Calisto. Foi a primeira vez que alguém observava corpos celestes em órbita de algo que não era a Terra — uma prova direta de que o modelo geocêntrico não poderia estar completamente certo. A Grande Mancha Vermelha, uma tempestade que persiste há séculos, chegou a ser maior do que a Terra inteira — e ainda hoje, embora menor, continua girando.',
        historyEn: 'Jupiter was known to the Babylonians more than three thousand years ago, who tracked its movements with enough precision to make astronomical predictions. The Romans named it after the king of the gods — and no other planet seemed more fitting to carry that name. In 1610, Galileo turned the telescope to Jupiter and discovered four moons orbiting it: Io, Europa, Ganymede, and Callisto. It was the first time anyone had observed celestial bodies in orbit around something other than Earth — direct proof that the geocentric model could not be entirely right. The Great Red Spot, a storm that has persisted for centuries, was once larger than the entire Earth — and today, though smaller, it keeps on spinning.',
    },
    saturn: {
        namePt: 'Saturno',
        nameEn: 'Saturn',
        subtitlePt: 'Planeta · Sistema Solar Externo',
        subtitleEn: 'Planet · Outer Solar System',
        contextPt: 'O planeta dos anéis. Eles parecem sólidos à distância, mas são formados por incontáveis fragmentos de gelo e rocha orbitando em uma estrutura fina e imensa.',
        contextEn: 'The ringed planet. From afar, the rings look solid, but they are made of countless pieces of ice and rock orbiting in a vast, thin structure.',
        dotColor: '#c8a840',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '1.432 mi km (9,537 UA) / 1.432B km (9.537 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '116.464 km (9,14× a Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '29,45 anos / 29.45 years' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '10h 39min 22s' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '285+ (Titã, Encélado, Réia…)' },
            { labelPt: 'Temperatura média',   labelEn: 'Temperature (avg.)',   value: '−139 °C (topo das nuvens) / −139 °C (cloud tops)' },
        ],
        historyPt: 'Saturno foi o planeta mais distante conhecido pelos antigos — o limite visível do sistema solar por milênios. Sua lentidão no céu o associou, em várias culturas, à passagem inexorável do tempo: na mitologia romana, Saturno era o deus da colheita e das eras, aquele que preside os ciclos que nenhum ser escapa. Galileu foi o primeiro a observar seus anéis, em 1610, mas não conseguiu entender o que via e os descreveu como "orelhas" do planeta. Foi Christiaan Huygens quem, em 1655, interpretou corretamente que se tratava de um anel — e na mesma época descobriu Titã, sua maior lua. A sonda Cassini orbitou Saturno de 2004 a 2017, transmitindo imagens dos anéis com um detalhe que ainda espanta.',
        historyEn: 'Saturn was the most distant planet known to the ancients — the visible boundary of the solar system for millennia. Its slow drift across the sky associated it, in many cultures, with the inexorable passage of time: in Roman mythology, Saturn was the god of the harvest and of ages, the one who presides over cycles from which no being escapes. Galileo was the first to observe its rings, in 1610, but he could not understand what he saw and described them as the planet\'s "ears." It was Christiaan Huygens who, in 1655, correctly interpreted them as a ring — and around the same time discovered Titan, Saturn\'s largest moon. The Cassini probe orbited Saturn from 2004 to 2017, transmitting images of the rings in detail that still astonishes.',
    },
    uranus: {
        namePt: 'Urano',
        nameEn: 'Uranus',
        subtitlePt: 'Planeta · Sistema Solar Externo',
        subtitleEn: 'Planet · Outer Solar System',
        contextPt: 'Um planeta quase deitado. Urano provavelmente foi tombado por colisões gigantescas no início do Sistema Solar; por isso avança pela órbita como se estivesse rolando, com estações longas e muito incomuns.',
        contextEn: 'A planet almost lying on its side. Uranus was likely tilted by giant collisions early in the Solar System, so it moves along its orbit as if it were rolling, creating long and unusual seasons.',
        dotColor: '#4ab8c8',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '2.871 mi km (19,2 UA) / 2.871B km (19.2 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '50.724 km (3,98× a Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '84,01 anos / 84.01 years' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '17,24 h (retrógrado)' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '28+ (Titânia, Oberon, Ariel…)' },
            { labelPt: 'Temperatura média',   labelEn: 'Temperature (avg.)',   value: '−197 °C (topo das nuvens) / −197 °C (cloud tops)' },
        ],
        historyPt: 'Urano tem a honra de ser o primeiro planeta descoberto com telescópio. William Herschel o identificou em 1781, pensando inicialmente ser um cometa — levou um tempo até que os cálculos de sua órbita revelassem que era um planeta. O nome vem do deus grego do céu primordial, Urano, pai de Saturno e avô de Zeus. A única sonda a visitá-lo foi a Voyager 2, em 1986, que revelou um mundo inclinado de lado — seu eixo de rotação é tão oblíquo que Urano orbita o Sol quase como uma bola rolando. Uma de suas peculiaridades mais poéticas está nos nomes de suas luas: ao contrário de todos os outros planetas, cujos satélites levam nomes da mitologia greco-romana, as luas de Urano foram batizadas com nomes de personagens de Shakespeare e Alexander Pope.',
        historyEn: 'Uranus has the distinction of being the first planet discovered with a telescope. William Herschel identified it in 1781, initially thinking it was a comet — it took time before orbital calculations revealed it was a planet. The name comes from the Greek god of the primordial sky, Ouranos, father of Saturn and grandfather of Zeus. The only spacecraft to visit it was Voyager 2, in 1986, which revealed a world tilted on its side — its rotational axis is so oblique that Uranus orbits the Sun almost like a rolling ball. One of its most poetic peculiarities lies in the names of its moons: unlike every other planet, whose satellites carry names from Greco-Roman mythology, the moons of Uranus were named after characters from Shakespeare and Alexander Pope.',
    },
    neptune: {
        namePt: 'Netuno',
        nameEn: 'Neptune',
        subtitlePt: 'Planeta · Sistema Solar Externo',
        subtitleEn: 'Planet · Outer Solar System',
        contextPt: 'Azul, distante e dinâmico. Netuno recebe pouca luz solar, mas sua atmosfera ainda produz ventos violentos e sistemas climáticos intensos.',
        contextEn: 'Blue, distant, and dynamic. Neptune receives little sunlight, yet its atmosphere still produces violent winds and intense weather systems.',
        dotColor: '#2878d8',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '4.495 mi km (30,1 UA) / 4.495B km (30.1 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '49.248 km (3,87× a Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '164,79 anos / 164.79 years' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '16,11 horas / 16.11 hours' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '16+ (Tritão, Nereida…)' },
            { labelPt: 'Temperatura média',   labelEn: 'Temperature (avg.)',   value: '−201 °C (topo das nuvens) / −201 °C (cloud tops)' },
        ],
        historyPt: 'Netuno foi o primeiro planeta descoberto pela matemática antes de ser visto pelo telescópio — uma façanha que ainda impressiona. Em 1846, perturbações na órbita de Urano levaram Urbain Le Verrier e John Couch Adams, trabalhando de forma independente, a calcular onde deveria haver um planeta desconhecido. Na mesma noite em que Le Verrier enviou suas coordenadas a Johann Galle, em Berlim, Galle apontou o telescópio e encontrou Netuno exatamente onde as equações disseram que ele estaria. Foi batizado em homenagem ao deus romano do mar por seu azul profundo. Sua maior lua, Tritão, orbita na direção contrária à rotação do planeta — um comportamento que sugere que ela não nasceu ali, mas foi capturada pelo campo gravitacional de Netuno em algum momento remoto da história do sistema solar.',
        historyEn: 'Neptune was the first planet discovered through mathematics before being seen through a telescope — a feat that still impresses. In 1846, perturbations in the orbit of Uranus led Urbain Le Verrier and John Couch Adams, working independently, to calculate where an unknown planet must lie. The very night Le Verrier sent his coordinates to Johann Galle in Berlin, Galle pointed the telescope and found Neptune exactly where the equations said it would be. It was named after the Roman god of the sea for its deep blue color. Its largest moon, Triton, orbits in the opposite direction to the planet\'s rotation — a behavior suggesting it was not born there, but was captured by Neptune\'s gravitational field at some remote point in the solar system\'s history.',
    },
};
