/**
 * Responsabilidade: constantes físicas e visuais dos planetas "ambientes" renderizados na cena 3D
 * do radar. Esses planetas não são o foco central do radar (esse é Terra + NEOs + Sol), mas
 * enriquecem o contexto científico e visual da cena 3D. Cada entrada carrega:
 *   physicalRadiusDl  — raio real em distâncias lunares (referência científica/de escala)
 *   visualRadiusDl    — raio exagerado realmente renderizado (mesmo fator de exagero da Terra ~47×
 *                       e da Lua ~10×, para que as proporções relativas pareçam familiares)
 *   rotationPeriodS   — período de rotação sideral em segundos (para spin em tempo real)
 *   axialTiltDeg      — obliquidade em relação ao plano eclíptico (para orientação do eixo)
 *   texturePath       — caminho público para o mapa de superfície; null aciona o fallback procedural
 *   fallbackColor     — cor hex usada quando texturePath está indisponível ou ainda carregando
 *
 * Por que separar physicalRadiusDl de visualRadiusDl:
 * Na régua linear de distância (UA), o raio real de Mercúrio (0,00635 DL) seria sub-pixel. Mantemos o
 * valor científico explícito para que consumidores futuros possam rotular distâncias corretamente,
 * enquanto o valor visual dimensiona a esfera renderizada. (As distâncias seguem a régua linear; só
 * os tamanhos dos corpos são exagerados — ver lib/radar/README.md.)
 *
 * Fontes:
 *   - Raios:            IAU Working Group on Cartographic Coordinates and Rotational Elements 2015
 *   - Períodos de rot.: NASA Planetary Fact Sheet (Williams 2022)
 *   - Inclinação axial: IAU WGCCRE 2015 orientação do polo (sub-grau para Mercúrio)
 */

import { KM_PER_LD } from '@/lib/sceneEphemeris';

export interface PlanetDatum {
    /** Raio médio IAU, km → DL. */
    physicalRadiusDl: number;
    /** Raio renderizado em unidades de cena (DL). Exagero calibrado por planeta; ver docblock acima. */
    visualRadiusDl: number;
    /** Período de rotação sideral, segundos. */
    rotationPeriodS: number;
    /** Obliquidade em relação ao plano eclíptico, graus. IAU WGCCRE 2015. */
    axialTiltDeg: number;
    /** Caminho público para a textura de superfície, ou null para o fallback. */
    texturePath: string | null;
    /** Caminho opcional para uma textura de atmosfera/nuvens sobreposta. */
    atmospherePath?: string | null;
    /** Cor de fallback da esfera quando nenhuma textura está carregada. */
    fallbackColor: string;
}

/**
 * Constantes físicas de Mercúrio.
 *
 * physicalRadiusDl = 2439.7 km / 384400 km/DL = 0.006346 DL
 *
 * Alvo de exagero visual: aproximadamente o mesmo tamanho aparente do marcador da Lua (0.035 DL),
 * que usa ~10× de exagero em relação ao seu raio real de 0.00451 DL. Mercúrio é ligeiramente maior
 * fisicamente, mas deve parecer pequeno e distante, então limitamos a 0.028 DL (~44× físico) —
 * visível mas inequivocamente menor que a Terra (0.11 DL) e similar em tamanho aparente à Lua.
 *
 * Rotação: 58.6462 dias terrestres (IAU, ressonância sinódica 3:2 com o período orbital).
 * Inclinação axial: 0.034° — essencialmente perpendicular ao plano eclíptico; sem inclinação perceptível.
 */
export const MERCURY: PlanetDatum = {
    physicalRadiusDl: 2_439.7 / KM_PER_LD,          // 0.00635 DL — raio real
    visualRadiusDl: 0.028,                             // raio renderizado (~44× exagero)
    rotationPeriodS: 58.6462 * 24 * 3600,             // 5.067.013 s ≈ 58,65 dias
    axialTiltDeg: 0.034,                               // obliquidade quase nula (IAU WGCCRE 2015)
    texturePath: '/images/mercury/mercury-8k.jpg',
    fallbackColor: '#a89880',                          // cinza quente compatível com albedo real da superfície
};

/**
 * Constantes físicas de Vênus.
 *
 * physicalRadiusDl = 6051.8 km / 384400 km/DL = 0.01574 DL
 *
 * Exagero visual: Vênus é o "planeta-irmão" da Terra (~95% do diâmetro terrestre).
 * Renderizamos em 0.10 DL (~6.4× físico) — quase do tamanho da Terra (0.11 DL), claramente maior
 * que Mercúrio (0.028) e ainda inequivocamente menor que a Terra, refletindo a proporção real.
 * (Antes ficava em 0.038, ~35% da Terra, contradizendo a própria proporção declarada.)
 *
 * Rotação: −243.018 dias terrestres (retrógrada — negativo na lógica do spin).
 *   O sinal negativo é aplicado na taxa de rotação do componente Venus.tsx.
 * Inclinação axial: 177.36° — efetivamente de cabeça para baixo (rotação retrógrada).
 *   A inclinação >90° codifica a natureza retrógrada; o shader trata isso corretamente.
 *
 * Textura: camada de nuvens (não a superfície rochosa, que nunca é visível).
 */
export const VENUS: PlanetDatum = {
    physicalRadiusDl: 6_051.8 / KM_PER_LD,           // 0.01574 DL — raio real
    visualRadiusDl: 0.10,                               // raio renderizado (~6.4× exagero, ~91% da Terra)
    rotationPeriodS: 243.018 * 24 * 3600,              // magnitude; sinal aplicado em Venus.tsx
    axialTiltDeg: 177.36,                               // obliquidade retrógrada (IAU WGCCRE 2015)
    texturePath: '/images/venus/venus-8k.jpg',
    atmospherePath: '/images/venus/venus-atmosfere-2k.jpg',
    fallbackColor: '#c8a84a',                           // âmbar dourado — cor das nuvens de CO₂
};

/**
 * Constantes físicas de Marte.
 *
 * physicalRadiusDl = 3389.5 km / 384400 km/DL = 0.00882 DL
 *
 * Exagero visual: Marte é ~53% do raio terrestre.
 * Renderizamos em 0.048 DL (~54× físico) — maior que Vênus (0.038), menor que Terra (0.11),
 * preservando a proporção relativa: Marte < Vênus < Terra no radar.
 *
 * Rotação: 1.02596 dias terrestres (prógrada — mesmo sentido que a Terra).
 * Inclinação axial: 25.19° — muito próxima da Terra (23.44°), Marte tem estações reais.
 *
 * Textura: superfície rochosa avermelhada de óxido de ferro (8K).
 */
export const MARS: PlanetDatum = {
    physicalRadiusDl: 3_389.5 / KM_PER_LD,           // 0.00882 DL — raio real
    visualRadiusDl: 0.048,                              // raio renderizado (~54× exagero)
    rotationPeriodS: 1.02596 * 24 * 3600,              // 88.643 s ≈ 1,026 dias (sol marciano)
    axialTiltDeg: 25.19,                                // obliquidade (IAU WGCCRE 2015)
    texturePath: '/images/mars/mars-8k.jpg',
    fallbackColor: '#c0501a',                           // vermelho-ferrugem — óxido de ferro
};

/**
 * Constantes físicas de Saturno.
 *
 * physicalRadiusDl = 60268 km / 384400 km/DL = 0.15682 DL (raio equatorial)
 *
 * Saturno é o segundo maior planeta do Sistema Solar — raio equatorial 60268 km, ~9.45× a Terra.
 * Renderizamos em 0.16 DL (~1.02× físico, quase sem exageração!) — como Júpiter, já é grande
 * o suficiente para ser visível sem distorção. Fica menor que Júpiter (0.19 DL), refletindo
 * a proporção real (Saturno é ~85% do raio equatorial de Júpiter).
 *
 * Rotação: 0.44401 dias terrestres (10 h 39 min — segunda rotação mais rápida do SS após Júpiter).
 *   O achatamento polar é pronunciado (raio polar 54364 km vs equatorial 60268 km),
 *   mas renderizamos como esfera — os anéis dominam a identidade visual.
 * Inclinação axial: 26.73° — mais inclinado que a Terra (23.44°); os anéis variam de abertos a
 *   quase de fio à medida que Saturno orbita ao longo de seus ~29 anos.
 *
 * Textura: camada de nuvens de amônia na troposfera superior (2K).
 *   Bandas amarelo-ocre mais apagadas e largas que as de Júpiter — identidade visual inconfundível.
 */
export const SATURN: PlanetDatum = {
    physicalRadiusDl: 60_268 / KM_PER_LD,              // 0.15682 DL — raio equatorial real
    visualRadiusDl: 0.16,                                // raio renderizado (~1.02× — quase real!)
    rotationPeriodS: 0.44401 * 24 * 3600,               // 38.362 s ≈ 10h 39min (sistema III IAU)
    axialTiltDeg: 26.73,                                 // obliquidade (IAU WGCCRE 2015)
    texturePath: '/images/saturn/saturn-8k.jpg',
    fallbackColor: '#c8b060',                            // dourado-ocre — bandas de amônia
};

/**
 * Constantes físicas de Urano.
 *
 * physicalRadiusDl = 25559 km / 384400 km/DL = 0.06650 DL (raio equatorial)
 *
 * Urano é o terceiro maior planeta do Sistema Solar em raio — 25559 km, ~4× a Terra.
 * Renderizamos em 0.13 DL (~1.96× físico) — um leve exageramente necessário pois Urano
 * ficaria muito pequeno sem ele ao lado de Júpiter (0.19 DL) e Saturno (0.16 DL).
 *
 * Rotação: −0.71833 dias terrestres (17h 14min, retrógrado na convenção IAU).
 *   A inclinação axial de 97.77° faz Urano "rolar" pela órbita — o polo aponta quase
 *   para o Sol em certas épocas. A rotação aparece retrógrada nessa convenção.
 * Inclinação axial: 97.77° — o maior de todos os planetas (IAU WGCCRE 2015).
 *
 * Textura: atmosfera superior de H₂/He/CH₄ — o metano absorve vermelho, dando a cor ciano.
 *   Aparência notavelmente uniforme, sem as bandas marcantes de Júpiter/Saturno.
 */
export const URANUS: PlanetDatum = {
    physicalRadiusDl: 25_559 / KM_PER_LD,              // 0.06650 DL — raio equatorial real
    visualRadiusDl: 0.13,                                // raio renderizado (~1.96× — leve exagero)
    rotationPeriodS: 0.71833 * 24 * 3600,               // magnitude; sinal negativo no spin
    axialTiltDeg: 97.77,                                 // obliquidade (IAU WGCCRE 2015) — extremo!
    texturePath: '/images/uranus/uranus-2k.jpg',
    fallbackColor: '#7ec8d8',                            // ciano-azulado — metano atmosférico
};

/**
 * Constantes físicas de Netuno.
 *
 * physicalRadiusDl = 24764 km / 384400 km/DL = 0.06444 DL (raio equatorial)
 *
 * Netuno é o quarto maior planeta em raio — 24764 km, ~3.9× a Terra.
 * Renderizamos em 0.12 DL (~1.86× físico) — leve exageramento, semelhante a Urano
 * (0.13 DL), levemente menor para refletir que Netuno é ligeiramente menor em raio.
 *
 * Rotação: 0.67125 dias terrestres (16h 6min, prógrada — rotação mais rápida entre os gigantes de gelo).
 * Inclinação axial: 28.32° — similar à Terra (23.44°); Netuno tem estações reais, mas cada
 *   uma dura ~40 anos devido ao período orbital de 165 anos.
 *
 * Textura: atmosfera superior de H₂/He/CH₄ com aparência azul mais profunda e saturada
 *   que Urano — provavelmente devido a um cromóforo adicional ainda não identificado.
 *   Netuno tem tempestades visíveis (Grandes Manchas Escuras) e ventos de ~2100 km/h.
 */
export const NEPTUNE: PlanetDatum = {
    physicalRadiusDl: 24_764 / KM_PER_LD,              // 0.06444 DL — raio equatorial real
    visualRadiusDl: 0.12,                                // raio renderizado (~1.86× — leve exagero)
    rotationPeriodS: 0.67125 * 24 * 3600,               // 57.996 s ≈ 16h 6min
    axialTiltDeg: 28.32,                                 // obliquidade (IAU WGCCRE 2015)
    texturePath: '/images/neptune/neptune-2k.jpg',
    fallbackColor: '#2878d8',                            // azul-profundo — cor do metano + cromóforo
};

/**
 * Constantes físicas de Júpiter.
 *
 * physicalRadiusDl = 71492 km / 384400 km/DL = 0.18596 DL (raio equatorial)
 *
 * Júpiter é o maior planeta do Sistema Solar — raio equatorial 71492 km, mais de 11× a Terra.
 * Renderizamos em 0.19 DL (~1.02× físico, quase sem exageração!) — na escala do radar
 * Júpiter já é grande o suficiente para ser visível sem distorção. Fica maior que a Terra
 * (0.11 DL) e menor apenas que o próprio Sol, refletindo a proporção real.
 *
 * Rotação: 0.41354 dias terrestres (9 h 55 min — rotação mais rápida dos planetas do SS).
 *   O achatamento polar é perceptível (raio polar 66854 km vs equatorial 71492 km),
 *   mas renderizamos como esfera — o shader compensa visualmente com as bandas zonais.
 * Inclinação axial: 3.13° — quase perpendicular ao plano eclíptico, sem estações significativas.
 *
 * Textura: camada de nuvens de amônia e água na troposfera superior (8K).
 *   As bandas laranja/bege/brancas e as zonas escuras são a face permanente visual de Júpiter.
 */
export const JUPITER: PlanetDatum = {
    physicalRadiusDl: 71_492 / KM_PER_LD,             // 0.18596 DL — raio equatorial real
    visualRadiusDl: 0.19,                               // raio renderizado (~1.02× — quase real!)
    rotationPeriodS: 0.41354 * 24 * 3600,              // 35.730 s ≈ 9h 55min (sistema III IAU)
    axialTiltDeg: 3.13,                                 // obliquidade (IAU WGCCRE 2015)
    texturePath: '/images/jupiter/jupiter-8k.jpg',
    fallbackColor: '#c8a878',                           // laranja-bege — bandas de amônia
};
