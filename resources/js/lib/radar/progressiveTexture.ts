/**
 * Decisão pura do LOD de textura de corpo: qual textura expor e se a nítida já está pronta.
 *
 * Responsabilidade: dado o estado de carregamento (textura leve, textura nítida, e se a
 * nítida já subiu para a GPU), decidir o que o consumidor deve mostrar AGORA e se já pode
 * trocar para a nítida. Separada do hook React (`useProgressiveBodyTexture`) para ser testável
 * sem DOM/three.
 *
 * Regra:
 * - enquanto a nítida não está pronta na GPU, expõe a leve (mesmo que a nítida já tenha
 *   baixado mas ainda não subido);
 * - quando a nítida está pronta (`highUploaded`), expõe a nítida e marca `highReady`;
 * - `highReady` nunca é `true` sem uma textura nítida de fato disponível.
 *
 * O tipo é genérico (`T`) para o teste poder usar valores simples no lugar de `THREE.Texture`.
 */

export type ProgressiveDecision<T> = {
    texture: T | null;
    highReady: boolean;
};

/**
 * @param low          Textura leve (2k) já disponível, ou `null` enquanto carrega.
 * @param high         Textura nítida (8k) já baixada, ou `null`.
 * @param highUploaded Se a nítida já foi enviada à GPU (pronta para troca sem custo).
 */
export function resolveProgressiveTexture<T>(
    low: T | null,
    high: T | null,
    highUploaded: boolean,
): ProgressiveDecision<T> {
    const ready = highUploaded && high != null;
    return {
        texture: ready ? high : low,
        highReady: ready,
    };
}
