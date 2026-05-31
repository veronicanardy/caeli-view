/**
 * Orientação da Terra e da Lua em coordenadas de cena.
 *
 * Responsabilidades:
 * - `orientEarth`: manter o ponto subsolar real apontado para o Sol, preservando a obliquidade.
 * - `orientMoonTidal`: manter a face próxima da Lua voltada para a Terra.
 *
 * Ambas são puras no sentido geométrico: para a mesma entrada, produzem a mesma rotação final.
 */

import * as THREE from 'three';

/**
 * Direção, em espaço de modelo, de um ponto geográfico (lat, lon) em uma `SphereGeometry`
 * com textura equiretangular centrada em Greenwich.
 */
export function geoToModelDir(latDeg: number, lonDeg: number): THREE.Vector3 {
    const lat = (latDeg * Math.PI) / 180;
    const lon = (lonDeg * Math.PI) / 180;
    const cl = Math.cos(lat);
    return new THREE.Vector3(Math.cos(lon) * cl, Math.sin(lat), -Math.sin(lon) * cl);
}

/** Obliquidade média da Terra em radianos (IAU 2006 para J2000.0). */
export const EARTH_OBLIQUITY_RAD = (23.4393 * Math.PI) / 180;

/**
 * Eixo polar verdadeiro da Terra expresso nos eixos da cena.
 * Mantemos esse vetor inercial para preservar a inclinação axial real.
 */
export const EARTH_POLAR_AXIS_SCENE = new THREE.Vector3(
    0,
    Math.cos(EARTH_OBLIQUITY_RAD),
    -Math.sin(EARTH_OBLIQUITY_RAD),
);

/**
 * Orienta a Terra com o eixo axial real e com o ponto subsolar verdadeiro apontando para o Sol.
 */
export function orientEarth(
    group: THREE.Group,
    sunDirection: [number, number, number],
    subsolarLatDeg: number,
    subsolarLonDeg: number,
): void {
    const sun = new THREE.Vector3(...sunDirection).normalize();

    // Referencial de origem do modelo.
    const srcUp = new THREE.Vector3(0, 1, 0);
    const srcForward = geoToModelDir(subsolarLatDeg, subsolarLonDeg);

    // Referencial-alvo em espaço de cena.
    const tgtUp = EARTH_POLAR_AXIS_SCENE.clone();
    const tgtForward = sun.clone();

    const buildBasis = (up: THREE.Vector3, forward: THREE.Vector3): THREE.Matrix4 => {
        let right = new THREE.Vector3().crossVectors(up, forward);
        if (right.lengthSq() < 1e-6) right = new THREE.Vector3(1, 0, 0);
        right.normalize();
        const fwd = new THREE.Vector3().crossVectors(right, up).normalize();
        return new THREE.Matrix4().makeBasis(fwd, up, right);
    };

    const src = buildBasis(srcUp, srcForward);
    const tgt = buildBasis(tgtUp, tgtForward);

    const rot = tgt.multiply(src.transpose());
    group.quaternion.setFromRotationMatrix(rot);
}

/**
 * Mantém a Lua travada tidalmente: a face próxima (lat=0, lon=0 da textura, eixo +X do modelo)
 * aponta para a Terra, enquanto o polo norte lunar fica o mais próximo possível de +Y da cena.
 *
 * A função recebe explicitamente o vetor Terra→Lua em coordenadas de cena, sem depender da origem
 * global quando a Terra está deslocada dentro de uma camada heliocêntrica maior.
 */
export function orientMoonTidal(mesh: THREE.Mesh, earthToMoonVector: [number, number, number]): void {
    const earthDir = new THREE.Vector3(-earthToMoonVector[0], -earthToMoonVector[1], -earthToMoonVector[2]);
    if (earthDir.lengthSq() < 1e-9) return; // Lua coincidente com a Terra: preserva a orientação atual.
    earthDir.normalize();

    const worldUp = new THREE.Vector3(0, 1, 0);

    // Fonte: face próxima em espaço de modelo (+X) e polo norte do próprio modelo.
    const srcForward = new THREE.Vector3(1, 0, 0);
    const srcUp = new THREE.Vector3(0, 1, 0);

    // Destino: a face próxima olha para a Terra; o norte lunar fica o mais alinhado possível a +Y.
    const tgtForward = earthDir.clone();
    let tgtRight = new THREE.Vector3().crossVectors(worldUp, tgtForward);
    if (tgtRight.lengthSq() < 1e-6) tgtRight = new THREE.Vector3(1, 0, 0);
    tgtRight.normalize();
    const tgtUp = new THREE.Vector3().crossVectors(tgtForward, tgtRight).normalize();

    let srcRight = new THREE.Vector3().crossVectors(srcUp, srcForward);
    if (srcRight.lengthSq() < 1e-6) srcRight = new THREE.Vector3(0, 0, 1);
    srcRight.normalize();
    const srcUpO = new THREE.Vector3().crossVectors(srcForward, srcRight).normalize();

    const src = new THREE.Matrix4().makeBasis(srcForward, srcUpO, srcRight);
    const tgt = new THREE.Matrix4().makeBasis(tgtForward, tgtUp, tgtRight);
    const rot = tgt.multiply(src.transpose());
    mesh.quaternion.setFromRotationMatrix(rot);
}
