/**
 * Receita PURA de preparação dos materiais das naves (GLBs da NASA) contra a luz da cena.
 *
 * Responsabilidade: decidir os NÚMEROS (escala da cor, teto de metalness, intensidade do envMap e
 * do emissivo) a partir do material autorado pela NASA. Aplicar isso no three.js é do
 * `Components/Radar/Bodies/Spacecraft/SpacecraftModel.tsx`; aqui não entra React nem three.
 *
 * O problema que esta receita resolve: o Sol da cena é um pointLight de intensidade 8 com decay=0
 * (chega com força total em qualquer distância), calibrado para os corpos celestes. Um material de
 * nave com albedo claro estoura para branco sob essa luz. A compensação escurece `mat.color`, MAS
 * ela só faz sentido para o diffuse dielétrico:
 *
 * - Em METAL, `mat.color` é o F0 do reflexo (a própria aparência do metal). Escurecê-lo apaga o
 *   matiz (ouro vira reflexo escuro) e devolver o brilho via envMap devolve luz BRANCA, não cor.
 *   Por isso a compensação é interpolada pelo metalness: metal mantém a cor da NASA. EXCETO metal
 *   quase branco (foil/alumínio polido, sem matiz a perder): aí a compensação parcial evita o
 *   estouro para branco giz sob o Sol forte, sem afetar metal com cor real (ouro, cobre).
 * - O envMap fica em intensidade FÍSICA (1). O reescalo antigo (1/compensação ≈ 5,5) jogava um véu
 *   branco de estúdio em todo material e o tone mapping ACES esmagava tudo para branco giz.
 *
 * `exposure` é o botão POR MODELO para GLBs autorados escuros (o James Webb não tem textura e usa
 * cores base 0,10 a 0,15, pensadas para um motor mais claro). Multiplica só a compensação do
 * diffuse; 1 = neutro. Vive no `spacecraftModelRegistry`, junto da rotação de repouso, e é
 * calibrado vendo na tela.
 */

/**
 * Compensação de exposição do diffuse dielétrico contra o Sol decay=0 de intensidade 8:
 * 8 × 0,18 ≈ 1,44 de luz efetiva no lado iluminado, claro sem estourar para branco.
 */
export const SUN_EXPOSURE_COMPENSATION = 0.18;

/**
 * Intensidade FÍSICA do environment map nas naves. O ambiente (RoomEnvironment via PMREM) já tem
 * gradiente e pontos de luz próprios; acima de 1 ele vira véu branco uniforme sob o ACES.
 */
export const SPACECRAFT_ENV_INTENSITY = 1.0;

/**
 * Brilho próprio (emissivo) de legibilidade: piso para o lado sem sol, com a própria cor/textura da
 * NASA. Só entra quando o GLB NÃO traz emissivo autorado (quando traz, o autorado é preservado).
 * Baixo de propósito: alto demais chapa a nave e apaga a leitura de "de onde vem o sol".
 */
export const SPACECRAFT_EMISSIVE = 0.12;

/**
 * Teto de metalness: abaixo de 1 de propósito, para todo material guardar um fio de diffuse e a
 * nave continuar visível mesmo sem envMap efetivo (WebGL por software renderiza o PMREM como preto).
 * Alto (0,95) para metal branco (foil da Parker, mantas da Europa Clipper) ler como METAL refletindo,
 * com gradiente, em vez de giz chapado: quanto maior, menos diffuse plano e mais reflexo.
 */
export const SPACECRAFT_MAX_METALNESS = 0.95;

/**
 * Recorte dos materiais autorados TRANSPARENTES: pixels com alpha abaixo disso são descartados.
 * A nave nunca entra em blending (o raio-X da Voyager); o que a NASA autorou invisível some de vez
 * (o cubo placeholder da New Horizons, PNG 100% transparente) e telas com padrão viram recorte.
 */
export const SPACECRAFT_ALPHA_TEST = 0.5;

/**
 * Luminosidade (Rec. 601) acima da qual um metal é tratado como "quase branco" (sem matiz a
 * perder): foil/alumínio polido do Parker e da Europa Clipper ficam bem acima disso (~0,96+);
 * metal com cor real (ouro, cobre) fica bem abaixo.
 */
export const SPACECRAFT_WHITE_METAL_THRESHOLD = 0.85;

/**
 * Compensação aplicada à fração "branca" do metal (0 a 1 acima do threshold), para não estourar
 * sob o Sol forte. Metade da compensação dielétrica: metal ainda deve ler mais claro que diffuse
 * comum, só sem chapar de branco puro.
 */
export const WHITE_METAL_EXPOSURE_COMPENSATION = 0.6;

export type SpacecraftMaterialInput = {
    /** Metalness autorado do material (antes de qualquer teto). */
    metalness: number;
    /** Luminosidade (Rec. 601) da cor autorada, 0 a 1. Decide o desconto do metal quase branco. */
    brightness: number;
    /** O GLB trouxe emissivo autorado (cor ou mapa)? Se sim, ele é preservado como veio. */
    hasAuthoredEmissive: boolean;
    /** O material foi autorado transparente (alphaMode BLEND)? Vira recorte, nunca blending. */
    authoredTransparent: boolean;
    /** Multiplicador de exposição do MODELO (registry), para GLB autorado escuro. 1 = neutro. */
    exposure: number;
};

export type SpacecraftMaterialRecipe = {
    /** Multiplicador de `mat.color` (preserva o matiz; 1 = cor da NASA intacta). */
    colorScale: number;
    /** Metalness final, já com o teto de segurança. */
    metalness: number;
    /** Intensidade do envMap. */
    envMapIntensity: number;
    /** Intensidade do emissivo de legibilidade; 0 = preservar o emissivo autorado da NASA. */
    emissiveIntensity: number;
    /** Limiar de recorte por alpha; 0 = material opaco comum, sem recorte. */
    alphaTest: number;
};

/**
 * Decide a receita de um material de nave. A escala de cor interpola entre a compensação dielétrica
 * (diffuse contra o Sol forte) e 1 (metal puro, F0 intacto) conforme o metalness autorado, com um
 * desconto extra para metal quase branco (sem matiz a perder, mas que estoura fácil). O piso de
 * emissivo segue a interpolação inversa do metalness: metal já reflete o envMap sozinho, então um
 * emissivo uniforme por cima dele apaga o gradiente do reflexo (lê como giz chapado); só o
 * dielétrico precisa do piso cheio para o lado sem sol continuar legível.
 */
export function spacecraftMaterialRecipe({ metalness, brightness, hasAuthoredEmissive, authoredTransparent, exposure }: SpacecraftMaterialInput): SpacecraftMaterialRecipe {
    const metal = Math.min(Math.max(metalness, 0), 1);
    const dielectricScale = Math.min(1, SUN_EXPOSURE_COMPENSATION * exposure);
    const metalScale = 1 - (1 - WHITE_METAL_EXPOSURE_COMPENSATION) * whiteMetalFraction(brightness);
    return {
        colorScale: dielectricScale + (metalScale - dielectricScale) * metal,
        metalness: Math.min(metal, SPACECRAFT_MAX_METALNESS),
        envMapIntensity: SPACECRAFT_ENV_INTENSITY,
        emissiveIntensity: hasAuthoredEmissive ? 0 : SPACECRAFT_EMISSIVE * (1 - metal),
        alphaTest: authoredTransparent ? SPACECRAFT_ALPHA_TEST : 0,
    };
}

/** Quão "branco" é o metal, 0 abaixo do threshold a 1 em brightness máxima (1). */
function whiteMetalFraction(brightness: number): number {
    const span = 1 - SPACECRAFT_WHITE_METAL_THRESHOLD;
    return Math.min(1, Math.max(0, brightness - SPACECRAFT_WHITE_METAL_THRESHOLD) / span);
}
