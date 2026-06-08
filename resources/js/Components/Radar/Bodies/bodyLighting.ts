import * as THREE from 'three';

/**
 * Posição do Sol no sistema visual heliocêntrico do radar.
 *
 * No `RadarScene`, o Sol é renderizado explicitamente na origem `[0, 0, 0]`.
 * Os planetas ambiente recebem posições heliocêntricas prontas da efeméride,
 * então a direção de iluminação de cada planeta é simplesmente:
 *
 *     normalize(sceneSunOrigin - bodyPosition)
 *
 * Este helper mantém essa convenção em um único ponto e evita que cada planeta
 * recrie sua própria interpretação de onde o Sol está.
 */
const SCENE_SUN_ORIGIN = new THREE.Vector3(0, 0, 0);

/**
 * Calcula o vetor unitário que aponta do corpo visual até o Sol da cena.
 *
 * Uso esperado:
 * - planetas ambiente: Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano e Netuno;
 * - shaders planetários que recebem `sunDir`;
 * - componentes que já estejam em coordenadas heliocêntricas da cena.
 *
 * Não usar para:
 * - Terra, que usa `sunDirection` geocêntrico e ponto subsolar;
 * - Lua, que usa lógica própria de fase/orientação em relação à Terra;
 * - trajetórias/órbitas, que pertencem às camadas de efeméride e trajetória.
 *
 * @param bodyPosition Posição heliocêntrica do corpo na cena.
 * @returns Vetor normalizado apontando do corpo para o Sol da cena.
 */
export function directionFromBodyToSceneSun(
    bodyPosition: [number, number, number],
): THREE.Vector3 {
    return SCENE_SUN_ORIGIN.clone()
        .sub(new THREE.Vector3(...bodyPosition))
        .normalize();
}