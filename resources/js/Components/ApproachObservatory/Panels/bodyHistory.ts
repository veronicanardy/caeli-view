/**
 * Contexto histórico dos corpos celestes de referência.
 *
 * Separado de bodyInfoContent para manter fatos estáticos e narrativa histórica
 * em responsabilidades distintas.
 */

import type { BodyId } from './bodyInfoContent';

export interface BodyHistory {
    historyPt: string;
    historyEn: string;
}

export const BODY_HISTORY: Record<BodyId, BodyHistory> = {
    sun: {
        historyPt: 'O Sol foi adorado como divindade em praticamente todas as culturas antigas — Ra no Egito, Hélio na Grécia, Inti nos Andes. Em 1543, Copérnico propôs que era o Sol, e não a Terra, o centro do sistema planetário. A natureza nuclear do Sol só foi compreendida no século XX: em 1920, Arthur Eddington sugeriu que a fusão de hidrogênio poderia ser sua fonte de energia — confirmada décadas depois com o desenvolvimento da física nuclear.',
        historyEn: 'The Sun was worshipped as a deity in virtually every ancient culture — Ra in Egypt, Helios in Greece, Inti in the Andes. In 1543, Copernicus proposed that the Sun, not Earth, was the center of the planetary system. The Sun\'s nuclear nature was only understood in the 20th century: in 1920, Arthur Eddington suggested hydrogen fusion as its energy source — confirmed decades later with the development of nuclear physics.',
    },
    earth: {
        historyPt: 'Por milênios, a Terra foi considerada o centro imóvel do universo. Foi Copérnico quem a deslocou desse trono em 1543, e Galileu quem pagou o preço por confirmar isso. O nome "Terra" vem do latim, como "Erde" em alemão e "Earth" em inglês vêm de raízes proto-germânicas — todos significando simplesmente "chão". A esfericidade da Terra já era conhecida pelos gregos: Eratóstenes mediu sua circunferência com notável precisão por volta de 240 a.C.',
        historyEn: 'For millennia, Earth was considered the immovable center of the universe. It was Copernicus who displaced it from that throne in 1543, and Galileo who paid the price for confirming it. The name "Earth" comes from Old English and Proto-Germanic roots meaning simply "ground." The spherical shape of the Earth was already known to the Greeks: Eratosthenes measured its circumference with remarkable accuracy around 240 BC.',
    },
    moon: {
        historyPt: 'A Lua é o único corpo celeste além da Terra pisado por seres humanos. As missões Apollo (1969–1972) trouxeram 382 kg de amostras lunares. Antes disso, foi ela que impulsionou a astronomia moderna: Galileu foi o primeiro a observá-la com telescópio em 1609 e ficou surpreso com suas montanhas e crateras — evidência de que os corpos celestes não eram esferas perfeitas, como acreditava Aristóteles. O nome vem do latim "Luna", que deu origem a "lunático" e ao nosso conceito de mês.',
        historyEn: 'The Moon is the only celestial body beyond Earth ever walked on by humans. The Apollo missions (1969–1972) brought back 382 kg of lunar samples. Before that, the Moon drove modern astronomy forward: Galileo was the first to observe it through a telescope in 1609 and was struck by its mountains and craters — evidence that celestial bodies were not perfect spheres, as Aristotle had believed. The name comes from Latin "Luna," which gave rise to "lunatic" and our concept of the month.',
    },
    mercury: {
        historyPt: 'Mercúrio é conhecido desde a Antiguidade, mas por muito tempo foi confundido com dois objetos diferentes — uma estrela matutina e uma vespertina — antes que os gregos percebessem que eram o mesmo planeta. Seu nome foi dado pelos romanos em homenagem ao mensageiro dos deuses, pela sua velocidade ao cruzar o céu. A primeira sonda a visitá-lo foi a Mariner 10, em 1974. A Messenger (2011–2015) orbitou Mercúrio e mapeou sua superfície completamente.',
        historyEn: 'Mercury has been known since antiquity, but was long thought to be two different objects — a morning star and an evening star — before the Greeks realized they were the same planet. The Romans named it after their messenger of the gods, for its swift passage across the sky. The first spacecraft to visit it was Mariner 10, in 1974. The MESSENGER probe (2011–2015) orbited Mercury and completely mapped its surface.',
    },
    venus: {
        historyPt: 'Vênus é o objeto mais brilhante do céu noturno depois da Lua, e por isso era chamado de "estrela d\'alva" antes de ser reconhecido como planeta. Os babilônios o registravam há mais de 3.500 anos. O nome romano homenageia a deusa do amor. A União Soviética foi pioneira na exploração: a Venera 7 (1970) foi a primeira sonda a pousar em outro planeta e transmitir dados da superfície. Descobriu-se então que Vênus tem pressão atmosférica 90 vezes maior que a da Terra.',
        historyEn: 'Venus is the brightest object in the night sky after the Moon, and was called the "morning star" long before it was recognized as a planet. The Babylonians recorded it more than 3,500 years ago. Its Roman name honors the goddess of love. The Soviet Union pioneered its exploration: Venera 7 (1970) was the first spacecraft to land on another planet and transmit data from the surface. It revealed that Venus has atmospheric pressure 90 times greater than Earth\'s.',
    },
    mars: {
        historyPt: 'Marte fascina a humanidade há milênios — seu tom avermelhado o associou à guerra e ao sangue em quase todas as culturas antigas. Os romanos o batizaram de Marte, deus da guerra. Em 1877, Giovanni Schiaparelli descreveu "canali" em sua superfície, mal traduzido como "canais" artificiais, gerando décadas de especulação sobre vida marciana. A Era Espacial desmistificou isso: a Mariner 4 (1965) revelou uma superfície árida e craterizada. Hoje, rovers como o Perseverance investigam se o planeta já abrigou vida microbiana.',
        historyEn: 'Mars has fascinated humanity for millennia — its reddish hue associated it with war and blood in nearly every ancient culture. The Romans named it after Mars, god of war. In 1877, Giovanni Schiaparelli described "canali" on its surface, mistranslated as artificial "canals," sparking decades of speculation about Martian life. The Space Age dispelled this: Mariner 4 (1965) revealed a barren, cratered surface. Today, rovers like Perseverance investigate whether the planet once harbored microbial life.',
    },
    jupiter: {
        historyPt: 'Júpiter era conhecido pelos babilônios há mais de 3.000 anos, que já rastreavam seus movimentos com precisão. Os romanos o nomearam em homenagem ao rei dos deuses. Em 1610, Galileu descobriu as quatro maiores luas de Júpiter — Io, Europa, Ganimedes e Calisto — provando que nem tudo orbitava a Terra. Foi a primeira observação direta de corpos em órbita de outro astro. A Grande Mancha Vermelha, uma tempestade com mais de 300 anos de idade, já foi maior que a Terra inteira.',
        historyEn: 'Jupiter was known to the Babylonians more than 3,000 years ago, who already tracked its movements with precision. The Romans named it after the king of the gods. In 1610, Galileo discovered Jupiter\'s four largest moons — Io, Europa, Ganymede, and Callisto — proving that not everything orbited Earth. It was the first direct observation of bodies orbiting another celestial object. The Great Red Spot, a storm over 300 years old, was once larger than Earth itself.',
    },
    saturn: {
        historyPt: 'Saturno foi o planeta mais distante conhecido pelos antigos, e por isso era associado ao tempo, ao lento e ao inevitável — daí "Saturno" como deus do tempo na mitologia romana. Galileu foi o primeiro a observar seus anéis, em 1610, mas não conseguiu entender o que via, descrevendo-o como um planeta com "orelhas". Foi Christian Huygens quem, em 1655, identificou corretamente que eram anéis — e também descobriu Titã, sua maior lua. A sonda Cassini orbita Saturno de 2004 a 2017, revelando os anéis com detalhe extraordinário.',
        historyEn: 'Saturn was the most distant planet known to the ancients, and was thus associated with time, slowness, and the inevitable — hence "Saturn" as the god of time in Roman mythology. Galileo was the first to observe its rings in 1610, but failed to understand what he saw, describing it as a planet with "ears." It was Christiaan Huygens who, in 1655, correctly identified them as rings — and also discovered Titan, its largest moon. The Cassini probe orbited Saturn from 2004 to 2017, revealing the rings in extraordinary detail.',
    },
    uranus: {
        historyPt: 'Urano tem a honra de ser o primeiro planeta descoberto com telescópio. William Herschel o identificou em 1781, pensando inicialmente ser um cometa. O nome vem do deus grego do céu — Urano, pai de Saturno. A sonda Voyager 2 é a única a ter visitado Urano, em 1986, e descobriu que o planeta emite mais calor do que recebe do Sol — ainda um mistério. Suas 13 luas conhecidas têm algo incomum: todos os nomes foram tirados de obras de Shakespeare e Alexander Pope, não da mitologia clássica.',
        historyEn: 'Uranus has the distinction of being the first planet discovered with a telescope. William Herschel identified it in 1781, initially thinking it was a comet. The name comes from the Greek god of the sky — Ouranos, father of Saturn. The Voyager 2 probe is the only spacecraft to have visited Uranus, in 1986, and found that the planet emits more heat than it receives from the Sun — still a mystery. Its known moons all have something unusual: their names were taken from the works of Shakespeare and Alexander Pope, not classical mythology.',
    },
    neptune: {
        historyPt: 'Netuno foi o primeiro planeta descoberto pela matemática antes de ser visto pelo telescópio. Em 1846, perturbações na órbita de Urano levaram Urbain Le Verrier e John Couch Adams, de forma independente, a prever sua existência e posição — e Johann Galle o confirmou na mesma noite em que recebeu as coordenadas. Foi batizado em homenagem ao deus romano do mar por seu azul profundo. Sua maior lua, Tritão, orbita na direção contrária à rotação do planeta — um comportamento anômalo que sugere que foi capturada gravitacionalmente.',
        historyEn: 'Neptune was the first planet discovered through mathematics before being seen through a telescope. In 1846, perturbations in Uranus\'s orbit led Urbain Le Verrier and John Couch Adams, independently, to predict its existence and position — and Johann Galle confirmed it the very night he received the coordinates. It was named after the Roman god of the sea for its deep blue color. Its largest moon, Triton, orbits in the opposite direction to the planet\'s rotation — an anomalous behavior suggesting it was gravitationally captured.',
    },
};
