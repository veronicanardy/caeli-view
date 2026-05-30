/**
 * Physical and visual constants for "ambient" planets rendered in the Radar scene.
 *
 * These planets are not the focus of the observatory (that's Earth + NEOs + Sun), but
 * they enrich the scientific and visual context. Each entry carries:
 *   physicalRadiusDl  — true radius in lunar-distance units (for science/scale reference)
 *   visualRadiusDl    — exaggerated radius actually rendered (same exaggeration factor as
 *                       Earth ~47× and Moon ~10×, so relative proportions feel familiar)
 *   rotationPeriodS   — sidereal rotation period in seconds (for real-time spin)
 *   axialTiltDeg      — obliquity relative to the ecliptic (for axis orientation)
 *   texturePath       — public path to the surface map; null triggers the procedural fallback
 *   fallbackColor     — hex color used when texturePath is unavailable or still loading
 *
 * WHY separate physicalRadiusDl from visualRadiusDl:
 * At the log-compressed radar scale, Mercury's real radius (0.00635 DL) would be sub-pixel.
 * We keep the scientific value explicit so future consumers can label distances correctly,
 * while the visual value drives the rendered sphere.
 *
 * Sources:
 *   - Radii:              IAU Working Group on Cartographic Coordinates and Rotational Elements 2015
 *   - Rotation periods:   NASA Planetary Fact Sheet (Williams 2022)
 *   - Axial tilt:         IAU WGCCRE 2015 pole orientation (sub-degree for Mercury)
 */

const KM_PER_LD = 384_400;

export interface PlanetDatum {
    /** IAU mean radius, km → DL. */
    physicalRadiusDl: number;
    /** Rendered radius in scene units (DL, log-compressed). */
    visualRadiusDl: number;
    /** Sidereal rotation period, seconds. */
    rotationPeriodS: number;
    /** Obliquity of the ecliptic, degrees. IAU WGCCRE 2015. */
    axialTiltDeg: number;
    /** Public path to the 2K surface texture, or null for fallback. */
    texturePath: string | null;
    /** Fallback sphere color when no texture is loaded. */
    fallbackColor: string;
}

/**
 * Mercury's physical constants.
 *
 * physicalRadiusDl = 2439.7 km / 384400 km/DL = 0.006346 DL
 *
 * Visual exaggeration target: roughly the same visual footprint as the Moon marker (0.035 DL),
 * which uses ~10× exaggeration over its true 0.00451 DL. Mercury is slightly larger physically
 * but should feel small and distant, so we cap it at 0.028 DL (~44× physical) — visible but
 * unambiguously smaller than Earth (0.11 DL) and similar in apparent size to Moon.
 *
 * Rotation: 58.6462 Earth days (IAU, synodic resonance 3:2 with orbital period).
 * Axial tilt: 0.034° — essentially upright relative to the ecliptic; renders as no perceptible tilt.
 */
export const MERCURY: PlanetDatum = {
    physicalRadiusDl: 2_439.7 / KM_PER_LD,          // 0.00635 DL — true radius
    visualRadiusDl: 0.028,                             // rendered radius (~44× exaggeration)
    rotationPeriodS: 58.6462 * 24 * 3600,             // 5_067,013 s ≈ 58.65 days
    axialTiltDeg: 0.034,                               // near-zero obliquity (IAU WGCCRE 2015)
    texturePath: '/images/mercury/mercury-2k.jpg',
    fallbackColor: '#a89880',                          // warm grey matching real surface albedo
};

/**
 * Venus's physical constants.
 *
 * physicalRadiusDl = 6051.8 km / 384400 km/DL = 0.01574 DL
 *
 * Visual exaggeration: Vênus é ligeiramente menor que a Terra (0.11 DL visual).
 * Renderizamos em 0.038 DL (~24× físico) — maior que Mercúrio, menor que a Terra,
 * refletindo a proporção real (Vênus ≈ 95% do diâmetro terrestre).
 *
 * Rotation: −243.018 Earth days (retrograde — negativo na lógica do spin).
 *   O sinal negativo é aplicado na taxa de rotação do componente Venus.tsx.
 * Axial tilt: 177.36° — efetivamente de cabeça para baixo (rotação retrógrada).
 *   A inclinação >90° codifica a natureza retrógrada; o shader trata isso corretamente.
 *
 * Textura: camada de nuvens (não a superfície rochosa, que nunca é visível).
 */
export const VENUS: PlanetDatum = {
    physicalRadiusDl: 6_051.8 / KM_PER_LD,           // 0.01574 DL — true radius
    visualRadiusDl: 0.038,                              // rendered radius (~24× exaggeration)
    rotationPeriodS: 243.018 * 24 * 3600,              // magnitude; sign applied in Venus.tsx
    axialTiltDeg: 177.36,                               // retrograde obliquity (IAU WGCCRE 2015)
    texturePath: '/images/venus/venus-2k.jpg',
    fallbackColor: '#c8a84a',                           // âmbar dourado — cor das nuvens de CO₂
};

/**
 * Mars's physical constants.
 *
 * physicalRadiusDl = 3389.5 km / 384400 km/DL = 0.00882 DL
 *
 * Visual exaggeration: Marte é ~53% do raio terrestre.
 * Renderizamos em 0.048 DL (~54× físico) — maior que Vênus (0.038), menor que Terra (0.11),
 * preservando a proporção relativa: Marte < Vênus < Terra no radar.
 *
 * Rotation: 1.02596 Earth days (prograde — mesmo sentido que a Terra).
 * Axial tilt: 25.19° — muito próxima da Terra (23.44°), Marte tem estações reais.
 *
 * Textura: superfície rochosa avermelhada de óxido de ferro (2K).
 */
export const MARS: PlanetDatum = {
    physicalRadiusDl: 3_389.5 / KM_PER_LD,           // 0.00882 DL — true radius
    visualRadiusDl: 0.048,                              // rendered radius (~54× exaggeration)
    rotationPeriodS: 1.02596 * 24 * 3600,              // 88,643 s ≈ 1.026 days (sol marciano)
    axialTiltDeg: 25.19,                                // obliquity (IAU WGCCRE 2015)
    texturePath: '/images/mars/mars-2k.jpg',
    fallbackColor: '#c0501a',                           // vermelho-ferrugem — óxido de ferro
};

/**
 * Saturn's physical constants.
 *
 * physicalRadiusDl = 60268 km / 384400 km/DL = 0.15682 DL (raio equatorial)
 *
 * Saturno é o segundo maior planeta do Sistema Solar — raio equatorial 60268 km, ~9.45× a Terra.
 * Renderizamos em 0.16 DL (~1.02× físico, quase sem exageração!) — como Júpiter, já é grande
 * o suficiente para ser visível sem distorção. Fica menor que Júpiter (0.19 DL), refletindo
 * a proporção real (Saturno é ~85% do raio equatorial de Júpiter).
 *
 * Rotation: 0.44401 Earth days (10 h 39 min — segunda rotação mais rápida do SS após Júpiter).
 *   O achatamento polar é pronunciado (raio polar 54364 km vs equatorial 60268 km),
 *   mas renderizamos como esfera — os anéis dominam a identidade visual.
 * Axial tilt: 26.73° — mais inclinado que a Terra (23.44°); os anéis variam de abertos a
 *   quase de fio à medida que Saturno orbita ao longo de seus ~29 anos.
 *
 * Textura: camada de nuvens de amônia na troposfera superior (2K).
 *   Bandas amarelo-ocre mais apagadas e largas que as de Júpiter — identidade visual inconfundível.
 */
export const SATURN: PlanetDatum = {
    physicalRadiusDl: 60_268 / KM_PER_LD,              // 0.15682 DL — true equatorial radius
    visualRadiusDl: 0.16,                                // rendered radius (~1.02× — quase real!)
    rotationPeriodS: 0.44401 * 24 * 3600,               // 38,362 s ≈ 10h 39min (sistema III IAU)
    axialTiltDeg: 26.73,                                 // obliquity (IAU WGCCRE 2015)
    texturePath: '/images/saturn/saturn-2k.jpg',
    fallbackColor: '#c8b060',                            // dourado-ocre — bandas de amônia
};

/**
 * Jupiter's physical constants.
 *
 * physicalRadiusDl = 71492 km / 384400 km/DL = 0.18596 DL (raio equatorial)
 *
 * Júpiter é o maior planeta do Sistema Solar — raio equatorial 71492 km, mais de 11× a Terra.
 * Renderizamos em 0.19 DL (~1.02× físico, quase sem exageração!) — na escala do radar
 * Júpiter já é grande o suficiente para ser visível sem distorção. Fica maior que a Terra
 * (0.11 DL) e menor apenas que o próprio Sol, refletindo a proporção real.
 *
 * Rotation: 0.41354 Earth days (9 h 55 min — rotação mais rápida dos planetas do SS).
 *   O achatamento polar é perceptível (raio polar 66854 km vs equatorial 71492 km),
 *   mas renderizamos como esfera — o shader compensa visualmente com as bandas zonais.
 * Axial tilt: 3.13° — quase perpendicular ao plano eclíptico, sem estações significativas.
 *
 * Textura: camada de nuvens de amônia e água na troposfera superior (2K).
 *   As bandas laranja/bege/brancas e as zonas escuras são a face permanente visual de Júpiter.
 */
export const JUPITER: PlanetDatum = {
    physicalRadiusDl: 71_492 / KM_PER_LD,             // 0.18596 DL — true equatorial radius
    visualRadiusDl: 0.19,                               // rendered radius (~1.02× — quase real!)
    rotationPeriodS: 0.41354 * 24 * 3600,              // 35,730 s ≈ 9h 55min (sistema III IAU)
    axialTiltDeg: 3.13,                                 // obliquity (IAU WGCCRE 2015)
    texturePath: '/images/jupiter/jupiter-2k.jpg',
    fallbackColor: '#c8a878',                           // laranja-bege — bandas de amônia
};
