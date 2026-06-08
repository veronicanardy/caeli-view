/**
 * Dados de curiosidades do manual do radar.
 *
 * Responsabilidade: centralizar perguntas e respostas exibidas na seção de
 * curiosidades do FriendlyManual, em PT-BR e EN. Conteúdo estático — sem
 * lógica, sem estado, sem dependência da cena.
 */

export type CuriosityItemData = {
    q: string;
    a: string;
};

export const EN_CURIOSITIES: CuriosityItemData[] = [
    {
        q: 'Why do asteroids have names like 2026 KX1?',
        a: "Every newly spotted asteroid gets a provisional designation following a strict code. The four digits are the year of discovery. The first letter after the year is the half-month when it was found (A = first half of January, B = second half of January … Y = second half of December, skipping I). The second letter is the order within that period, and the number is how many times that letter has been cycled through. So ‘2026 KX1’ means: discovered in 2026, in the second half of May (K), 24th object in the sequence (X), second cycle (1). Once an asteroid’s orbit is well confirmed and it meets certain fame criteria — like being a notable near-Earth object or having a mission dedicated to it — it can receive a permanent number and, eventually, an honorary name.",
    },
    {
        q: 'Why do some asteroids have proper names, like Bennu or Apophis?',
        a: 'When an asteroid is given a permanent catalogue number (which happens once its orbit is well determined), the discoverers earn the right to propose a name to the International Astronomical Union. Names are usually drawn from mythology, literature, science, or are tributes to people and places. Bennu is named after an ancient Egyptian bird deity. Apophis comes from the Egyptian god of chaos. Not all numbered asteroids get a name — there are over a million catalogued objects and naming them all would be impossible, so only the more prominent ones end up with a proper name.',
    },
    {
        q: 'What is the difference between an asteroid and a comet?',
        a: 'Both are small bodies left over from the formation of the solar system, but their composition and behaviour differ. Asteroids are mostly rocky or metallic and live mainly in the asteroid belt between Mars and Jupiter. Comets are icy bodies — a mix of frozen gases, dust, and rock — that come from the outer solar system. When a comet gets close to the Sun, the ice vaporises and creates the bright tail we see from Earth. An asteroid approaching the Sun does not produce a tail. In practice the boundary can blur: some objects classified as asteroids have been caught showing faint comet-like activity when heated.',
    },
    {
        q: 'What makes an asteroid more dangerous according to NASA?',
        a: 'Several factors stack up: size (larger objects release far more energy), orbit (does its path cross Earth’s?), and how close those crossings get over the next few centuries. NASA uses a metric called the Palermo Technical Scale and the simpler Torino Scale to quantify impact risk. A body needs to be at least ~140 m across to cause regional devastation, so that size is the official threshold for a Potentially Hazardous Asteroid (PHA). Objects tagged with the ⚠️ warning on this radar are tracked by NASA’s Center for Near Earth Object Studies (CNEOS) because at some point in their computed future they accumulate a non-zero — though usually very tiny — impact probability.',
    },
    {
        q: 'Could Earth be hit by one of the asteroids on this radar?',
        a: 'Technically these are all near-Earth objects, but being nearby does not mean being on a collision course. Most will miss by thousands or even millions of kilometres. The distances shown on this radar are real — they just look close because the visualization is compressed to fit the screen. The asteroids marked ⚠️ are the ones worth watching: scientists track them over years, refining their orbits with each new observation. In most cases, more data rules out the impact. If a genuine threat were ever confirmed, space agencies already have deflection concepts tested — NASA’s DART mission in 2022 proved we can deliberately change an asteroid’s speed.',
    },
    {
        q: 'How fast are these asteroids moving?',
        a: 'Near-Earth asteroids typically travel at 10 to 30 km/s relative to Earth — that is 36,000 to 108,000 km/h. For comparison, the International Space Station orbits at about 7.7 km/s. The motion cones you see on the radar point in the direction each object is heading at this very moment, using the velocity vector provided by JPL Horizons.',
    },
    {
        q: 'Could one of these rocks crash into the Moon?',
        a: 'Yes, but the Moon is a very small target. Most of the craters you see on its surface are the result of impacts over the past four billion years. Today the bombardment rate is much lower than in the early solar system. The Moon has no atmosphere, so it cannot slow objects down — anything that hits lands with full force, which is why its surface is so heavily cratered compared to Earth, where most incoming rocks burn up before landing.',
    },
];

export const PT_CURIOSITIES: CuriosityItemData[] = [
    {
        q: 'Por que os asteroides têm nomes como 2026 KX1?',
        a: 'Todo asteroide recém-descoberto recebe uma designação provisória seguindo um código rígido. Os quatro dígitos são o ano da descoberta. A primeira letra depois do ano indica a quinzena em que ele foi encontrado (A = primeira metade de janeiro, B = segunda metade de janeiro… Y = segunda metade de dezembro, pulando o I). A segunda letra indica a ordem dentro daquela quinzena, e o número indica quantas vezes aquela letra foi reciclada. Então ‘2026 KX1’ significa: descoberto em 2026, na segunda metade de maio (K), 24º objeto na sequência (X), segundo ciclo (1). Quando a órbita é bem confirmada e o objeto atende a certos critérios de relevância — como ser um NEO notável ou ter uma missão dedicada a ele —, ele pode receber um número permanente e, eventualmente, um nome.',
    },
    {
        q: 'Por que alguns asteroides têm nomes próprios, como Bennu ou Apophis?',
        a: 'Quando um asteroide recebe um número permanente de catálogo (o que ocorre depois que sua órbita é bem determinada), os descobridores ganham o direito de propor um nome à União Astronômica Internacional. Os nomes geralmente vêm da mitologia, da literatura, da ciência ou são homenagens a pessoas e lugares. Bennu é o nome de uma divindade-pássaro do Egito antigo. Apophis vem do deus egípcio do caos. Nem todo asteroide numerado ganha um nome — há mais de um milhão de objetos catalogados, então só os mais proeminentes acabam recebendo um nome próprio.',
    },
    {
        q: 'Qual a diferença entre um asteroide e um cometa?',
        a: 'Ambos são pequenos corpos remanescentes da formação do sistema solar, mas composição e comportamento diferem. Asteroides são majoritariamente rochosos ou metálicos e vivem principalmente no cinturão de asteroides entre Marte e Júpiter. Cometas são corpos gelados — uma mistura de gases congelados, poeira e rocha — que vêm do sistema solar externo. Quando um cometa se aproxima do Sol, o gelo vaporiza e cria a cauda brilhante que vemos da Terra. Um asteroide se aproximando do Sol não produz cauda. Na prática o limite pode ser tênue: alguns objetos classificados como asteroides já foram flagrados com atividade cometária fraca quando aquecidos.',
    },
    {
        q: 'O que faz um asteroide ser considerado mais perigoso pela NASA?',
        a: 'Vários fatores se somam: tamanho (objetos maiores liberam muito mais energia), órbita (o caminho dele cruza a da Terra?) e o quão próximas essas interseções ficam ao longo dos próximos séculos. A NASA usa uma métrica chamada Escala Palermo e a mais simples Escala de Torino para quantificar o risco de impacto. Um objeto precisa ter pelo menos ~140 m de diâmetro para causar devastação regional, então esse é o limite oficial para um Asteroide Potencialmente Perigoso (PHA). Os objetos marcados com ⚠️ neste radar são monitorados pelo CNEOS da NASA porque, em algum ponto de seu futuro calculado, acumulam uma probabilidade de impacto não nula — embora em geral muito pequena.',
    },
    {
        q: 'A Terra pode ser atingida por um dos asteroides deste radar?',
        a: 'Tecnicamente todos são objetos próximos da Terra, mas estar perto não significa estar em rota de colisão. A maioria passará a milhares ou mesmo milhões de quilômetros de distância. As distâncias mostradas no radar são reais — só parecem pequenas porque a visualização é comprimida para caber na tela. Os asteroides marcados com ⚠️ são os que valem atenção: cientistas os monitoram por anos, refinando a órbita a cada nova observação. Na maioria dos casos, mais dados descartam o impacto. Se uma ameaça genuína fosse confirmada, agências espaciais já têm conceitos de deflexão testados — a missão DART da NASA em 2022 provou que é possível mudar deliberadamente a velocidade de um asteroide.',
    },
    {
        q: 'Com que velocidade esses asteroides se movem?',
        a: 'Asteroides próximos à Terra tipicamente viajam a 10–30 km/s em relação à Terra — ou seja, de 36.000 a 108.000 km/h. Para comparação, a Estação Espacial Internacional orbita a cerca de 7,7 km/s. Os cones de movimento que você vê no radar apontam para a direção em que cada objeto está indo neste exato momento, usando o vetor de velocidade fornecido pelo JPL Horizons.',
    },
    {
        q: 'Uma dessas rochas poderia colidir com a Lua?',
        a: 'Sim, mas a Lua é um alvo bem pequeno. A maioria das crateras que você vê na sua superfície é resultado de impactos ao longo dos últimos quatro bilhões de anos. Hoje a taxa de bombardeio é muito menor do que no início do sistema solar. A Lua não tem atmosfera, então não consegue desacelerar os objetos — tudo que chega pousa com força total, o que explica por que a sua superfície é tão craterada em comparação com a Terra, onde a maioria das rochas se queima antes de pousar.',
    },
];

export const EN_ORBIT_CURIOSITIES: CuriosityItemData[] = [
    {
        q: 'Why do planets and asteroids orbit in ellipses and not circles?',
        a: 'Johannes Kepler discovered in the early 1600s that orbits are ellipses — and Isaac Newton later explained why: gravity from the Sun pulls the body continuously, but the body also has sideways momentum. The balance between those two forces traces a perfect ellipse. A circle is just a special case of an ellipse where both focal points coincide at the centre. Most asteroids have slightly stretched ellipses; comets can have extremely elongated ones that send them far out into the solar system.',
    },
    {
        q: 'What are the two focal points of an ellipse, and why does the Sun sit in one of them?',
        a: "An ellipse has two special points called foci (singular: focus) — the 'off-centre' points that define its shape. Kepler's first law states that the Sun sits at one focus of every planet's or asteroid's orbit. The other focus is empty. This means the body is closer to the Sun at one end of its orbit (perihelion) and farther at the other (aphelion). That varying distance is why objects speed up when near the Sun and slow down when far away.",
    },
    {
        q: 'Why does an asteroid move faster when it is close to the Sun?',
        a: "This is Kepler's second law, also called the 'equal areas' law. As an asteroid gets closer to the Sun, the Sun's gravity pulls it harder, accelerating it. To conserve angular momentum — a fundamental law of physics — the asteroid sweeps out equal areas of its orbit in equal times. Near perihelion, where the orbit is narrow, it must travel fast to sweep the same area as it does slowly near aphelion, where the orbit is wide. The effect is dramatic for elongated orbits: some comets near the Sun move tens of times faster than when they are far away.",
    },
    {
        q: "What does 'eccentricity' mean, and what does it tell us about an orbit?",
        a: "Eccentricity (e) measures how stretched an ellipse is, on a scale from 0 to 1 (for bound orbits). e = 0 is a perfect circle. e close to 1 is a very elongated, thin ellipse. Earth's orbit has e ≈ 0.017 — almost circular. Many near-Earth asteroids have e between 0.1 and 0.6. Halley's comet has e ≈ 0.97 — an extreme ellipse that takes it from inside Venus's orbit out beyond Neptune. A value above 1 means the object is not bound to the Sun at all and will fly away forever.",
    },
    {
        q: 'What is orbital inclination, and why do some orbits look tilted?',
        a: "Inclination (i) is the angle between the orbit's plane and the ecliptic — the flat plane where Earth orbits. i = 0° means the orbit lies exactly in Earth's plane; i = 90° means it orbits perpendicular to it. Most planets have low inclinations (under 7°). Asteroids can be wildly tilted: some have i > 60°, meaning they cross Earth's orbital plane at a steep angle. This is crucial for impact risk: even if an orbit crosses Earth's path, a highly inclined orbit only intersects the ecliptic at two specific points — the asteroid and Earth must be at the same point at the same time.",
    },
    {
        q: 'What is perihelion and why does it matter for Earth?',
        a: "Perihelion is the point in an orbit where the body is closest to the Sun. For an asteroid to come close to Earth, its perihelion (or part of its orbit near perihelion) must be in the region where Earth orbits — roughly 0.9 to 1.1 AU from the Sun. Astronomers call these 'Earth-crossers.' An asteroid with perihelion at 0.5 AU and aphelion at 3 AU will spend most of its time far from Earth — but twice per orbit it swings through the inner solar system and could potentially intersect Earth's path.",
    },
    {
        q: 'How do astronomers predict an orbit from just a few observations?',
        a: "When an asteroid is first spotted, astronomers measure its position (right ascension and declination) on several nights. With at least three well-separated observations, they can fit an orbit using Gauss's method or similar algorithms. Early fits have large uncertainties — the possible orbit is a wide cone in space. Each new observation constrains the fit further, shrinking the uncertainty region. After months or years of tracking, the orbit is usually known precisely enough to rule out any Earth impact for decades ahead. JPL's Horizons system, used by this radar, maintains these refined solutions.",
    },
];

export const PT_ORBIT_CURIOSITIES: CuriosityItemData[] = [
    {
        q: 'Por que planetas e asteroides orbitam em elipses e não em círculos?',
        a: 'Johannes Kepler descobriu no início do século XVII que as órbitas são elipses — e Isaac Newton explicou o porquê: a gravidade do Sol puxa o corpo continuamente, mas o corpo também tem momento angular lateral. O equilíbrio entre essas duas forças traça uma elipse perfeita. Um círculo é apenas um caso especial de elipse onde os dois focos coincidem no centro. A maioria dos asteroides tem elipses levemente esticadas; cometas podem ter elipses extremamente alongadas que os mandam para longe do sistema solar.',
    },
    {
        q: 'O que são os dois focos de uma elipse, e por que o Sol fica em um deles?',
        a: "Uma elipse tem dois pontos especiais chamados focos — os pontos 'fora do centro' que definem sua forma. A primeira lei de Kepler diz que o Sol fica em um dos focos de cada órbita planetária ou de asteroide. O outro foco está vazio. Isso significa que o corpo fica mais perto do Sol em um extremo da órbita (periélio) e mais longe no outro (afélio). Essa distância variável explica por que os objetos aceleram quando estão perto do Sol e desaceleram quando estão longe.",
    },
    {
        q: 'Por que um asteroide se move mais rápido quando está perto do Sol?',
        a: "Essa é a segunda lei de Kepler, também chamada de lei das 'áreas iguais'. Quando um asteroide se aproxima do Sol, a gravidade solar puxa-o com mais força, acelerando-o. Para conservar o momento angular — uma lei fundamental da física —, o asteroide varre áreas iguais da órbita em tempos iguais. Perto do periélio, onde a órbita é estreita, ele precisa ir rápido para varrer a mesma área que varre lentamente no afélio, onde a órbita é larga. O efeito é dramático em órbitas alongadas: alguns cometas perto do Sol se movem dezenas de vezes mais rápido do que quando estão longe.",
    },
    {
        q: "O que significa 'excentricidade' e o que ela revela sobre uma órbita?",
        a: 'A excentricidade (e) mede o quanto uma elipse está esticada, numa escala de 0 a 1 (para órbitas ligadas). e = 0 é um círculo perfeito. e próximo de 1 é uma elipse muito alongada e fina. A órbita da Terra tem e ≈ 0,017 — quase circular. Muitos asteroides próximos à Terra têm e entre 0,1 e 0,6. O cometa Halley tem e ≈ 0,97 — uma elipse extrema que o leva de dentro da órbita de Vênus até além de Netuno. Um valor acima de 1 significa que o objeto não está gravitacionalmente ligado ao Sol e vai embora para sempre.',
    },
    {
        q: 'O que é inclinação orbital e por que algumas órbitas parecem inclinadas?',
        a: 'A inclinação (i) é o ângulo entre o plano da órbita e o eclíptico — o plano plano onde a Terra orbita. i = 0° significa que a órbita fica exatamente no plano da Terra; i = 90° significa que ela orbita perpendicularmente a ele. A maioria dos planetas tem inclinações baixas (abaixo de 7°). Asteroides podem ser bem inclinados: alguns têm i > 60°, cruzando o plano orbital da Terra num ângulo acentuado. Isso é crucial para o risco de impacto: mesmo que uma órbita cruze o caminho da Terra, uma órbita muito inclinada só intercepta o eclíptico em dois pontos específicos — o asteroide e a Terra precisam estar no mesmo ponto ao mesmo tempo.',
    },
    {
        q: 'O que é periélio e por que ele importa para a Terra?',
        a: "O periélio é o ponto da órbita onde o corpo está mais próximo do Sol. Para que um asteroide se aproxime da Terra, seu periélio (ou parte de sua órbita perto do periélio) precisa estar na região onde a Terra orbita — aproximadamente entre 0,9 e 1,1 UA do Sol. Os astrônomos chamam esses de 'cruzadores da Terra'. Um asteroide com periélio em 0,5 UA e afélio em 3 UA passa a maior parte do tempo longe da Terra — mas duas vezes por órbita ele passa pelo sistema solar interno e pode potencialmente cruzar o caminho da Terra.",
    },
    {
        q: 'Como os astrônomos preveem uma órbita a partir de poucas observações?',
        a: 'Quando um asteroide é avistado pela primeira vez, os astrônomos medem sua posição (ascensão reta e declinação) em várias noites. Com pelo menos três observações bem espaçadas, eles conseguem ajustar uma órbita usando o método de Gauss ou algoritmos similares. Os ajustes iniciais têm grandes incertezas — a órbita possível é um cone largo no espaço. Cada nova observação restringe mais o ajuste, reduzindo a região de incerteza. Após meses ou anos de rastreamento, a órbita geralmente é conhecida com precisão suficiente para descartar qualquer impacto com a Terra por décadas. O sistema Horizons do JPL, usado por este radar, mantém essas soluções refinadas.',
    },
];
