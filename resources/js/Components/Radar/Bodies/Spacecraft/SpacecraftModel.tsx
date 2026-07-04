/**
 * Modelo GLB real de uma nave (Voyager, Juno, Pioneer, New Horizons, James Webb, Parker, Europa Clipper).
 *
 * Responsabilidade: carregar o GLB oficial da NASA e exibi-lo centralizado e normalizado, com a cor real
 * da NASA visível. Não decide qual modelo usar nem a posição (isso é do spacecraftModelRegistry e da
 * camada de cena).
 *
 * Iluminação: os NÚMEROS da receita (escala de cor, teto de metalness, intensidades) vêm da função
 * pura `spacecraftMaterialRecipe` (`lib/radar/spacecraftMaterial.ts`, com o porquê de cada um).
 * Resumo do que este componente aplica, in-place no MeshStandard original (trocar por MeshBasic
 * quebrava o pipeline) e sem contorno de seleção (dava aspecto de "raio-X"):
 * - Compensação de exposição contra o Sol decay=0 em mat.color, SÓ na fração dielétrica: metal
 *   mantém a cor/F0 da NASA (ouro reflete ouro, prata reflete prata).
 * - EnvMap LOCAL (PMREM de RoomEnvironment, gerado no cliente, sem download) em intensidade física,
 *   para metal ter o que refletir. Teto de metalness < 1: o fio de diffuse restante garante a nave
 *   visível mesmo onde o envMap não renderiza (WebGL por software no headless).
 * - Emissivo: o autorado da NASA é PRESERVADO quando o GLB traz um (caso James Webb); senão entra
 *   um piso baixo com a própria cor/textura, para o lado sem sol continuar legível.
 * - `exposure` por modelo (registry) para GLB autorado escuro.
 * Materiais são COMPARTILHADOS entre malhas do GLB, então a preparação deduplica por material (a
 * compensação de cor é multiplicativa, aplicar 2x escureceria 2x).
 */

import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { spacecraftMaterialRecipe } from '@/lib/radar/spacecraftMaterial';
import type { SpacecraftModelAsset } from './spacecraftModelRegistry';

/**
 * Environment map compartilhado das naves, um por renderer: PMREM do RoomEnvironment do three (cenário
 * neutro de estúdio, gerado localmente). É o que dá aparência real a foil/ouro/alumínio (metal sem
 * envMap não reflete nada). Não é aplicado à cena inteira de propósito: planetas e asteroides têm sua
 * própria iluminação calibrada.
 */
const ENV_BY_RENDERER = new WeakMap<THREE.WebGLRenderer, THREE.Texture>();

function spacecraftEnvironment(gl: THREE.WebGLRenderer): THREE.Texture {
    let env = ENV_BY_RENDERER.get(gl);
    if (!env) {
        const pmrem = new THREE.PMREMGenerator(gl);
        env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();
        ENV_BY_RENDERER.set(gl, env);
    }
    return env;
}

type SpacecraftModelProps = {
    asset: SpacecraftModelAsset;
    /** Opacidade do conjunto (esmaecimento quando há outra nave focada). */
    opacity: number;
};

/**
 * Renderiza o GLB da nave centralizado (via offset de grupo) e normalizado (maior eixo = 2), iluminando
 * o material da NASA por emissivo para ele aparecer longe das luzes da cena.
 */
export function SpacecraftModel({ asset, opacity }: SpacecraftModelProps) {
    const gltf = useGLTF(asset.url) as { scene: THREE.Group };
    const gl = useThree((state) => state.gl);

    // Clona a cena uma vez (para não mexer no cache do useGLTF) e calcula offset de centralização + escala.
    const { scene, offset, scale } = useMemo(() => {
        const clone = gltf.scene.clone(true);
        const box = new THREE.Box3().setFromObject(clone);
        if (box.isEmpty()) return { scene: clone, offset: new THREE.Vector3(), scale: 1 };
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;
        // Centraliza pelo TRANSFORM do grupo (offset = -center), sem cirurgia de geometria (mais seguro).
        return { scene: clone, offset: center.clone().multiplyScalar(-1), scale: 2 / maxAxis };
    }, [gltf.scene, asset.url]);

    // Prepara o material da NASA (envMap, compensação de exposição, recorte, emissivo de legibilidade)
    // — in-place, no material original MeshStandard (não troca o tipo). Os números vêm da receita pura
    // `spacecraftMaterialRecipe`, aplicada SEMPRE a partir da foto do material AUTORADO (guardada em
    // userData na primeira passada): materiais são compartilhados entre malhas e entre gêmeas que
    // dividem o GLB (Voyager 1/2, Pioneer 10/11), e partir da foto torna a preparação idempotente —
    // rodar de novo (HMR, ajuste de constante ou de exposure) produz o mesmo resultado, sem escurecer
    // a cor duas vezes.
    useEffect(() => {
        const envMap = spacecraftEnvironment(gl);
        scene.traverse((obj) => {
            // Malhas escondidas por decisão do registry (ex.: aft flap do James Webb, que o GLB
            // parkeia longe do corpo, em pose de animação que não reproduzimos).
            if (asset.hide && asset.hide.test(obj.name)) {
                obj.visible = false;
                return;
            }
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh || !mesh.material) return;
            mesh.frustumCulled = false;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const raw of mats) {
                const mat = raw as THREE.MeshStandardMaterial;
                if (!mat || !mat.isMaterial || !mat.isMeshStandardMaterial) continue;
                const authored = (mat.userData.caeliAuthored ??= {
                    color: mat.color.getHex(),
                    brightness: mat.color.r * 0.299 + mat.color.g * 0.587 + mat.color.b * 0.114,
                    metalness: mat.metalness,
                    emissive: mat.emissive.getHex(),
                    emissiveIntensity: mat.emissiveIntensity,
                    hasEmissiveMap: Boolean(mat.emissiveMap),
                    transparent: mat.transparent,
                }) as {
                    color: number;
                    brightness: number;
                    metalness: number;
                    emissive: number;
                    emissiveIntensity: number;
                    hasEmissiveMap: boolean;
                    transparent: boolean;
                };
                const recipe = spacecraftMaterialRecipe({
                    metalness: authored.metalness,
                    brightness: authored.brightness ?? 0,
                    hasAuthoredEmissive: authored.hasEmissiveMap || authored.emissive !== 0,
                    authoredTransparent: authored.transparent,
                    exposure: asset.exposure ?? 1,
                });
                // Nave NUNCA entra em blending: material autorado transparente deixava a nave
                // apagada/raio-X (a Voyager 1 sumia). O autorado transparente vira RECORTE (alphaTest):
                // o que a NASA fez invisível some de vez (o cubo placeholder da New Horizons) e telas
                // com padrão viram recorte, tudo renderizado como opaco com depth.
                mat.transparent = false;
                mat.opacity = 1;
                mat.depthWrite = true;
                mat.alphaTest = recipe.alphaTest;
                mat.userData.caeliAlphaTest = recipe.alphaTest;
                // Roughness ORIGINAL da NASA; metalness com o teto de segurança da receita.
                mat.metalness = recipe.metalness;
                mat.envMap = envMap;
                mat.envMapIntensity = recipe.envMapIntensity;
                // Emissivo: 0 = o GLB já traz um autorado (fica como veio). Senão, piso BAIXO com
                // a cor real (textura quando há, senão a cor base ANTES da compensação): o lado
                // sem sol continua legível, sem chapar.
                if (recipe.emissiveIntensity > 0) {
                    if (mat.map) {
                        mat.emissiveMap = mat.map;
                        mat.emissive.set(0xffffff);
                    } else {
                        mat.emissive.setHex(authored.color);
                    }
                    mat.emissiveIntensity = recipe.emissiveIntensity;
                } else {
                    mat.emissive.setHex(authored.emissive);
                    mat.emissiveIntensity = authored.emissiveIntensity;
                }
                // Compensação de exposição contra o Sol decay=0, só na fração dielétrica
                // (metal mantém o F0 da NASA), preservando o matiz. Sempre a partir da cor autorada.
                mat.color.setHex(authored.color).multiplyScalar(recipe.colorScale);
                mat.needsUpdate = true;
            }
        });
    }, [scene, gl, asset]);

    // Esmaecimento quando OUTRA nave está focada. A base é SEMPRE opaca (opacity 1, transparent false):
    // só esmaece de propósito, nunca herda transparência baked-in do GLB. Quando opacity >= 1 volta a opaco.
    useEffect(() => {
        scene.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.isMesh || !mesh.material) return;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const raw of mats) {
                const mat = raw as THREE.Material;
                if (!mat?.isMaterial) continue;
                if (opacity >= 1) {
                    mat.transparent = false;
                    mat.opacity = 1;
                    mat.alphaTest = (mat.userData.caeliAlphaTest as number | undefined) ?? 0;
                } else {
                    // Esmaecido usa blending real: o recorte sai de cena (um alphaTest de 0,5
                    // descartaria a nave inteira com opacity 0,5) e o alpha da textura volta a valer,
                    // então o que era invisível autorado continua invisível durante o fade.
                    mat.transparent = true;
                    mat.opacity = opacity;
                    mat.alphaTest = 0;
                }
            }
        });
    }, [scene, opacity]);

    return (
        <group scale={scale}>
            <group position={offset}>
                <group rotation={asset.rotation}>
                    <primitive object={scene} />
                </group>
            </group>
        </group>
    );
}
