/**
 * Responsabilidade: horizonte orbital da Home, a Terra vista de órbita baixa.
 *
 * Monta a cena Three.js do planeta como um horizonte colossal na base da
 * tela: câmera posicionada logo acima da superfície (estilo ISS), texturas
 * reais NASA com cascata de fallback, nuvens com sombra projetada, luzes
 * noturnas Black Marble, brilho oceânico e o arco atmosférico no limbo,
 * que é a assinatura visual do CaeliView. Controla os estados ready/failed
 * com fallback em CSS.
 */

import { useEffect, useRef, useState } from 'react';
import type { CanvasTexture } from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG FLAG — set true to strip all extra layers (clouds, atmosphere, glow,
// night lights, ocean sheen) and render only the daymap sphere with one light.
// When Earth appears in this mode but not in full mode, the issue is in one
// of those extra layers. Flip back to false once confirmed working.
// ─────────────────────────────────────────────────────────────────────────────
const EARTH_DEBUG_MINIMAL = false;

// ── Enquadramento "horizonte orbital" ────────────────────────────────────────
// A câmera fica a ORBIT_ALTITUDE acima da superfície (esfera de raio 1) e
// inclina para baixo até a linha do horizonte cair em HORIZON_NDC_Y no canvas
// (0 = centro vertical, positivo = acima do centro).
//
// IMPORTANTE: altitudes baixas (< ~0.4) esticam a textura 8K além de 1:1 na
// tela e o resultado fica borrado. Em 0.7 o domo mostra ~108° de longitude
// (~2.450px de textura) ocupando ~76% da largura da tela, ou seja, a textura
// chega com ~1.26x de superamostragem: nítido em monitores 2560px, com o
// limbo curvo inteiro no quadro e flancos de céu menores (menos "bola",
// mais "horizonte"). Não descer de ~0.65 sem reavaliar essa conta.
// HORIZON_NDC_Y moderado: o topo do arco fica abaixo do CTA, deixando o
// nascer do sol respirar como fundo cinematografico em vez de competir com a UI.
const ORBIT_ALTITUDE = 0.7;
const HORIZON_NDC_Y = 0.30;
const CAMERA_FOV = 38;

// Cascade of Earth daymap textures, tried in order. First success wins.
// MAX_TEXTURE_SIZE is checked at runtime; entries larger than the GPU limit are skipped.
const EARTH_TEXTURE_CASCADE = [
    '/images/earth/earth-daymap-8192.jpg',
    '/images/earth/blue-marble-land-shallow-topo-2048.jpg',
] as const;

// Cascade of cloud textures — only used when EARTH_DEBUG_MINIMAL is false.
const CLOUD_TEXTURE_CASCADE = [
    '/images/earth/8k_earth_clouds.jpg',
    '/images/earth/earth-clouds-2048.jpg',
    '/images/earth/earth-clouds-1024.png',
] as const;

// Real NASA Black Marble night lights (Solar System Scope, CC-BY 4.0)
const NIGHT_LIGHTS_TEXTURE_URL = '/images/earth/earth-night-lights-8192.jpg';
// Real normal map (three.js planet textures, NASA-derived)
const NORMAL_MAP_TEXTURE_URL = '/images/earth/earth-normal-2048.jpg';
// Real specular map: white = water (smooth), black = land (rough)
const SPECULAR_MAP_TEXTURE_URL = '/images/earth/earth-specular-2048.jpg';

const CLOUD_VERTEX_SHADER = `
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const CLOUD_FRAGMENT_SHADER = `
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    uniform sampler2D cloudsMap;
    uniform vec3 sunDirection;
    uniform float cloudOpacity;
    uniform float terminatorBoost;
    uniform float alphaFromAlpha;
    void main() {
        vec4 c = texture2D(cloudsMap, vUv);
        float lum = dot(c.rgb, vec3(0.299, 0.587, 0.114));
        // Faixa mais estreita = nuvens mais definidas/contrastadas (mais evidentes).
        float softLum = smoothstep(0.10, 0.80, lum);
        float baseAlpha = mix(softLum, c.a, alphaFromAlpha);
        float ndot = dot(normalize(vWorldNormal), normalize(sunDirection));
        float lit = max(ndot, 0.0);
        float terminator = smoothstep(-0.18, 0.22, ndot);
        float lightFactor = lit * 0.82 + terminator * terminatorBoost;
        // Lado dia: nuvens brancas brilhantes. Lado noite: um resíduo azulado de
        // luar (não some de todo), dando textura à penumbra noturna.
        vec3 dayCloud = vec3(1.0, 0.985, 0.97) * (0.30 + lightFactor * 0.92);
        vec3 nightCloud = vec3(0.16, 0.22, 0.34);
        float nightAmount = 1.0 - smoothstep(-0.05, 0.20, ndot);
        vec3 cloudColor = mix(dayCloud, nightCloud, nightAmount);
        float dayAlpha = baseAlpha * cloudOpacity * (0.40 + lightFactor * 0.80);
        float nightAlpha = baseAlpha * cloudOpacity * 0.22;
        gl_FragColor = vec4(cloudColor, mix(dayAlpha, nightAlpha, nightAmount));
    }
`;

export function CinematicEarthScene({ onReady }: { onReady?: () => void } = {}) {
    const shellRef = useRef<HTMLDivElement | null>(null);
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const shell = shellRef.current;
        const mount = mountRef.current;

        if (!shell || !mount) {
            return undefined;
        }

        let cleanup: (() => void) | undefined;
        let cancelled = false;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let earthTextureApplied = false;
        let firstFrameReady = false;

        void import('three').then((THREE) => {
            if (cancelled || !mount.isConnected || !shell.isConnected) {
                return;
            }

            const mouse = { x: 0, y: 0 };
            let frame = 0;
            let disposed = false;
            let normalTexture: import('three').Texture | null = null;
            let specularTexture: import('three').Texture | null = null;
            let nightLightsTexture: import('three').Texture | null = null;

            const scene = new THREE.Scene();
            // Near/far apertados ao redor da esfera unitária: melhor precisão
            // de profundidade entre as cascas (superfície, oceano, luzes, nuvens).
            const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 10);
            camera.position.set(0, 0, 1 + ORBIT_ALTITUDE);

            // Orientação por lookAt com a vertical local (+z, direção radial da
            // câmera) como "cima". A câmera fica sobre o equador da textura e
            // olha na horizontal (-y) inclinada para baixo até o horizonte cair
            // em HORIZON_NDC_Y. O dip do horizonte abaixo da horizontal local é
            // acos(1/(1+h)). NUNCA usar rotation.x direto aqui: o eixo de pitch
            // de Euler não coincide com a horizontal local desta posição (foi o
            // bug que jogava o planeta para fora do quadro).
            const horizonDip = Math.acos(1 / (1 + ORBIT_ALTITUDE));
            const fovHalfRad = THREE.MathUtils.degToRad(CAMERA_FOV * 0.5);
            const baseDownTilt = horizonDip + Math.atan(HORIZON_NDC_Y * Math.tan(fovHalfRad));
            const viewTarget = new THREE.Vector3();
            const applyCameraView = (extraPitch: number, yaw: number) => {
                const tilt = baseDownTilt + extraPitch;
                const cosTilt = Math.cos(tilt);
                viewTarget.set(
                    camera.position.x - Math.sin(yaw) * cosTilt,
                    camera.position.y - Math.cos(yaw) * cosTilt,
                    camera.position.z - Math.sin(tilt),
                );
                camera.up.set(0, 0, 1);
                camera.lookAt(viewTarget);
            };
            applyCameraView(0, 0);

            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.85));
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.10;

            // Log GPU texture size limit so we know which cascade entries can work.
            const gl = renderer.getContext();
            const maxTexSize: number = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
            console.debug('[earth] renderer max texture size:', maxTexSize);

            const canvasElement = renderer.domElement;
            canvasElement.style.width = '100%';
            canvasElement.style.height = '100%';
            canvasElement.style.display = 'block';
            canvasElement.style.position = 'absolute';
            canvasElement.style.inset = '0';
            mount.appendChild(canvasElement);

            const earthGroup = new THREE.Group();
            scene.add(earthGroup);
            const surfaceGroup = new THREE.Group();
            earthGroup.add(surfaceGroup);

            // Enquadramento inicial do globo: América do Sul no centro do domo.
            // A rotação própria (y = -0.70) coloca a longitude ~50°W de frente
            // para a câmera; o tombo do conjunto (x = 0.42, ~24° para o norte)
            // traz a faixa equatorial à vista em vez do oceano Austral. Sem
            // isso a câmera nasce mirando o Pacífico Sul, que é um vazio azul.
            earthGroup.rotation.x = 0.42;
            surfaceGroup.rotation.y = -0.70;

            // ── Lighting ────────────────────────────────────────────────────
            // Key light: sol pela esquerda com componente frontal moderada.
            // O terminador cruza o domo à direita do centro: ~60% do disco em
            // dia, ~40% em noite real à direita, onde as luzes de cidade do
            // Black Marble brilham. Sol totalmente frontal achata o planeta
            // (sem terminador não há drama); manter a noite visível.
            const sunLight = new THREE.DirectionalLight(0xfff2e0, EARTH_DEBUG_MINIMAL ? 2.0 : 2.12);
            // Sol NO TOPO, atrás do limbo (referência): a câmera olha para -y, então
            // o limbo "longe" sobe na tela. Colocando o sol bem longe em -y e um pouco
            // atrás em -z, ele nasce no alto da curvatura central. O hemisfério voltado
            // para a câmera fica majoritariamente NOITE: as luzes de cidade do Black
            // Marble dominam o disco e o brilho dourado fica só no arco do topo.
            sunLight.position.set(0.0, -2.9, -2.2);
            scene.add(sunLight);

            if (!EARTH_DEBUG_MINIMAL) {
                // Cool fill from the dark side — kept very subtle so the night side
                // stays genuinely dark and the Black Marble lights pop.
                const rimLight = new THREE.DirectionalLight(0x2a8ec8, 0.16);
                rimLight.position.set(-4.0, 0.2, -2.8);
                scene.add(rimLight);
                // Cyan back-light — thin luminous contour on the dark side limb
                const cyanBackLight = new THREE.DirectionalLight(0x4ac8e8, 0.21);
                cyanBackLight.position.set(-3.2, 0.4, -2.0);
                scene.add(cyanBackLight);
                // Subtle blue scatter from above (skylight)
                const topLight = new THREE.DirectionalLight(0x5ab0d8, 0.08);
                topLight.position.set(0, 5, 1);
                scene.add(topLight);
                // Cool terminator fill (recomeçado sem quente): suaviza a transição
                // dia/noite com um tom neutro frio, sem brilho de pôr do sol.
                const twilightFill = new THREE.DirectionalLight(0x8ab4d0, 0.18);
                twilightFill.position.set(-3.0, -1.0, 1.5);
                scene.add(twilightFill);
                // Cool back-rim from below — separa do fundo sem aquecer.
                const backLight = new THREE.DirectionalLight(0x6f9ec0, 0.08);
                backLight.position.set(-2.0, -3.0, -1.5);
                scene.add(backLight);
                // Hemisphere: deep space below, faint blue sky above
                scene.add(new THREE.HemisphereLight(0x7ac8e8, 0x010306, 0.06));
                // Very low ambient so night side stays dark and city lights pop
                scene.add(new THREE.AmbientLight(0x050a12, 0.008));
            } else {
                scene.add(new THREE.AmbientLight(0xffffff, 0.4));
            }

            // ── Earth surface mesh ───────────────────────────────────────────
            const earthMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0xc0c8c8),
                roughness: EARTH_DEBUG_MINIMAL ? 1.0 : 0.68,
                metalness: EARTH_DEBUG_MINIMAL ? 0.0 : 0.04,
                envMapIntensity: 0.0,
            });

            const sunDirection = sunLight.position.clone().normalize();

            // Shared uniforms exposed via onBeforeCompile so the standard material
            // can read cloud occlusion + sun direction without losing built-in lighting.
            const earthShaderUniforms = {
                cloudShadowMap: { value: null as import('three').Texture | null },
                cloudShadowEnabled: { value: 0.0 },
                cloudRotationY: { value: 0.0 },
                cloudShadowSunDir: { value: sunDirection.clone() },
                cloudShadowStrength: { value: 0.62 },
            };

            if (!EARTH_DEBUG_MINIMAL) {
                earthMaterial.onBeforeCompile = (shader) => {
                    shader.uniforms.cloudShadowMap = earthShaderUniforms.cloudShadowMap;
                    shader.uniforms.cloudShadowEnabled = earthShaderUniforms.cloudShadowEnabled;
                    shader.uniforms.cloudRotationY = earthShaderUniforms.cloudRotationY;
                    shader.uniforms.cloudShadowSunDir = earthShaderUniforms.cloudShadowSunDir;
                    shader.uniforms.cloudShadowStrength = earthShaderUniforms.cloudShadowStrength;

                    // Pass world normal to fragment so we can offset cloud UVs toward the sun.
                    shader.vertexShader = shader.vertexShader.replace(
                        '#include <common>',
                        `#include <common>
                        varying vec3 vCloudShadowWorldNormal;
                        varying vec2 vCloudShadowUv;`,
                    ).replace(
                        '#include <begin_vertex>',
                        `#include <begin_vertex>
                        vCloudShadowWorldNormal = normalize(mat3(modelMatrix) * normal);
                        vCloudShadowUv = uv;`,
                    );

                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <common>',
                        `#include <common>
                        varying vec3 vCloudShadowWorldNormal;
                        varying vec2 vCloudShadowUv;
                        uniform sampler2D cloudShadowMap;
                        uniform float cloudShadowEnabled;
                        uniform float cloudRotationY;
                        uniform vec3 cloudShadowSunDir;
                        uniform float cloudShadowStrength;`,
                    ).replace(
                        '#include <map_fragment>',
                        `#include <map_fragment>
                        vec3 surfaceNormal = normalize(vCloudShadowWorldNormal);
                        float surfaceSun = dot(surfaceNormal, normalize(cloudShadowSunDir));
                        // Cor base só levemente trabalhada; o BRILHO do lado noturno é
                        // adicionado via emissive (abaixo), porque a iluminação direcional
                        // do material zera a cor difusa onde não bate sol — mexer só na
                        // diffuseColor deixava a noite preta por mais clara que fosse.
                        diffuseColor.rgb *= vec3(1.00, 1.02, 1.06);
                        // Profundidade/vinheta: escurece nas bordas (longe do sub-ponto da
                        // câmera) e mais ainda embaixo (normal.y baixo), clareando para
                        // cima/em direção ao sol. Dá volume ao globo em vez de disco chapado.
                        float depthDown = smoothstep(-0.85, 0.35, surfaceNormal.y);
                        float depthVignette = 0.40 + 0.60 * depthDown;
                        diffuseColor.rgb *= depthVignette;
                        if (cloudShadowEnabled > 0.5) {
                            // Offset the cloud lookup slightly toward the sun in surface space —
                            // approximates a shadow cast a small distance toward the light source.
                            vec3 nrm = surfaceNormal;
                            vec3 sunTangent = normalize(cloudShadowSunDir - nrm * dot(cloudShadowSunDir, nrm));
                            // Convert tangential offset into UV space. Magnitudes are tiny because
                            // the cloud layer sits just above the surface (~0.020 above radius 1).
                            float uOffset = sunTangent.x * 0.018;
                            float vOffset = sunTangent.y * 0.012;
                            vec2 cloudUv = vec2(vCloudShadowUv.x - cloudRotationY + uOffset, vCloudShadowUv.y + vOffset);
                            cloudUv.x = fract(cloudUv.x);
                            vec4 cloudSample = texture2D(cloudShadowMap, cloudUv);
                            float cloudDensity = dot(cloudSample.rgb, vec3(0.299, 0.587, 0.114));
                            // Only shadow on the day side (where there's light to occlude).
                            float lit = max(dot(nrm, normalize(cloudShadowSunDir)), 0.0);
                            float shadow = smoothstep(0.18, 0.78, cloudDensity) * cloudShadowStrength * lit;
                            diffuseColor.rgb *= (1.0 - shadow);
                        }`,
                    ).replace(
                        '#include <emissivemap_fragment>',
                        `#include <emissivemap_fragment>
                        // Brilho do lado NOTURNO via emissive: independe da luz do sol,
                        // então o lado escuro deixa de ser preto. A luz de luar azulada
                        // aparece só onde NÃO bate sol (nightMask) e usa a própria textura
                        // (map) para revelar continentes/oceanos em penumbra. Esta é a
                        // alavanca certa — mexer na diffuseColor não clareava a noite.
                        vec3 nEm = normalize(vCloudShadowWorldNormal);
                        float sunEm = dot(nEm, normalize(cloudShadowSunDir));
                        float nightMask = 1.0 - smoothstep(-0.18, 0.30, sunEm);
                        vec3 baseTex = diffuseColor.rgb;
                        // Luar azul frio SUTIL: noite ainda escura, mas com relevo e
                        // oceanos visíveis em penumbra; as cidades brilham por cima.
                        // Leve realce no terminador (penumbra um pouco mais clara).
                        float terminatorEm = (1.0 - smoothstep(0.0, 0.34, abs(sunEm)));
                        vec3 moonlight = baseTex * vec3(0.085, 0.125, 0.215) + vec3(0.004, 0.009, 0.018);
                        moonlight += vec3(0.010, 0.024, 0.046) * terminatorEm;
                        // Mesma vinheta de profundidade do lado dia: penumbra mais escura
                        // embaixo, clareando para cima.
                        float depthDownEm = smoothstep(-0.85, 0.35, nEm.y);
                        moonlight *= (0.40 + 0.60 * depthDownEm);
                        totalEmissiveRadiance += moonlight * nightMask;`,
                    );
                };
            }

            // earth mesh declared before applyEarthTexture so we can log its state
            const earth = new THREE.Mesh(
                new THREE.SphereGeometry(1, EARTH_DEBUG_MINIMAL ? 64 : 160, EARTH_DEBUG_MINIMAL ? 64 : 160),
                earthMaterial,
            );
            surfaceGroup.add(earth);

            let earthTexture: import('three').Texture | null = null;

            const applyEarthTexture = (loadedTexture: import('three').Texture, url: string) => {
                if (disposed) return;

                const img = loadedTexture.image as HTMLImageElement | null;
                const w = img?.width ?? 0;
                const h = img?.height ?? 0;

                console.debug('[earth] base texture loaded:', url, { width: w, height: h, uuid: loadedTexture.uuid });

                if (!img || w === 0 || h === 0) {
                    console.warn('[earth] base texture has no valid dimensions — skipping apply, trying next');
                    return;
                }

                loadedTexture.colorSpace = THREE.SRGBColorSpace;
                loadedTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
                earthTexture = loadedTexture;
                earthMaterial.map = loadedTexture;
                earthMaterial.needsUpdate = true;

                console.debug('[earth] base texture applied to material:', {
                    hasMap: Boolean(earthMaterial.map),
                    materialType: earthMaterial.type,
                    meshVisible: earth.visible,
                    materialUuid: earthMaterial.uuid,
                });

                if (!EARTH_DEBUG_MINIMAL) {
                    // Load real NASA-derived maps in parallel — replaces the procedural fakes
                    // that scattered fake city lights into oceans/deserts.
                    const loader = new THREE.TextureLoader();
                    const maxAnis = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);

                    loader.load(NORMAL_MAP_TEXTURE_URL, (tex) => {
                        if (disposed) { tex.dispose(); return; }
                        tex.anisotropy = maxAnis;
                        tex.colorSpace = THREE.NoColorSpace;
                        normalTexture = tex;
                        earthMaterial.normalMap = tex;
                        earthMaterial.normalScale = new THREE.Vector2(0.85, 0.85);
                        earthMaterial.needsUpdate = true;
                        console.debug('[earth] real normal map applied');
                    });

                    loader.load(SPECULAR_MAP_TEXTURE_URL, (tex) => {
                        if (disposed) { tex.dispose(); return; }
                        tex.anisotropy = maxAnis;
                        tex.colorSpace = THREE.NoColorSpace;
                        specularTexture = tex;
                        // In this specular map: white = water (smooth/reflective), black = land (rough).
                        // We feed it ONLY to the custom ocean-sheen shader (which expects that convention)
                        // and keep the base material's roughness uniform — avoids inverting the texture.
                        oceanSheen.material.uniforms.roughnessMap.value = tex;
                        console.debug('[earth] real specular map applied (ocean sheen)');
                    });

                    loader.load(NIGHT_LIGHTS_TEXTURE_URL, (tex) => {
                        if (disposed) { tex.dispose(); return; }
                        tex.anisotropy = maxAnis;
                        tex.colorSpace = THREE.SRGBColorSpace;
                        // Trilinear filtering + mipmaps — kills the sparkle/twinkle that
                        // came from undersampled high-frequency pixels on a slowly rotating sphere.
                        tex.minFilter = THREE.LinearMipmapLinearFilter;
                        tex.magFilter = THREE.LinearFilter;
                        tex.generateMipmaps = true;
                        nightLightsTexture = tex;
                        nightLights.material.uniforms.lightsMap.value = tex;
                        console.debug('[earth] real night lights map applied (8K Black Marble)');
                    });
                }

                // Don't call setReady here — wait for first actual rendered frame (see animate loop).
                earthTextureApplied = true;
            };

            const tryLoadEarth = (index: number): void => {
                if (disposed) return;
                if (index >= EARTH_TEXTURE_CASCADE.length) {
                    console.warn('[earth] all base textures failed — showing fallback permanently');
                    if (!disposed) setFailed(true);
                    return;
                }
                const url = EARTH_TEXTURE_CASCADE[index];
                // Skip textures that exceed GPU max texture size.
                const sizeHint = url.includes('8192') ? 8192 : url.includes('4096') ? 4096 : 2048;
                if (sizeHint > maxTexSize) {
                    console.debug(`[earth] skipping ${url} — GPU max is ${maxTexSize}`);
                    tryLoadEarth(index + 1);
                    return;
                }
                console.debug(`[earth] trying base texture: ${url}`);
                new THREE.TextureLoader().load(
                    url,
                    (tex) => {
                        if (disposed) { tex.dispose(); return; }
                        applyEarthTexture(tex, url);
                    },
                    undefined,
                    (err) => {
                        console.debug(`[earth] base texture failed (${url}):`, err);
                        tryLoadEarth(index + 1);
                    },
                );
            };
            tryLoadEarth(0);

            // ── Extra layers — only in full mode ────────────────────────────
            // Declare with `let` so they exist in closure; only populated when !EARTH_DEBUG_MINIMAL.
            let oceanSheen!: import('three').Mesh<import('three').SphereGeometry, import('three').ShaderMaterial>;
            let nightLights!: import('three').Mesh<import('three').SphereGeometry, import('three').ShaderMaterial>;
            let clouds!: import('three').Mesh<import('three').SphereGeometry, import('three').ShaderMaterial>;
            let cloudTexture: import('three').Texture | null = null;
            const roughnessPlaceholder = createSolidTexture(THREE, [210, 210, 210, 255]);
            const nightLightsPlaceholder = createSolidTexture(THREE, [0, 0, 0, 0]);
            const cloudPlaceholder = createSolidTexture(THREE, [0, 0, 0, 0]);

            if (!EARTH_DEBUG_MINIMAL) {
                oceanSheen = new THREE.Mesh(
                    new THREE.SphereGeometry(1.002, 160, 160),
                    new THREE.ShaderMaterial({
                        transparent: true,
                        depthWrite: false,
                        blending: THREE.AdditiveBlending,
                        uniforms: {
                            roughnessMap: { value: roughnessPlaceholder },
                            sunDirection: { value: sunDirection },
                            glowColor: { value: new THREE.Color(0x70c8e0) },
                            uTime: { value: 0.0 },
                        },
                        vertexShader: `
                            varying vec2 vUv;
                            varying vec3 vWorldNormal;
                            varying vec3 vWorldPosition;
                            void main() {
                                vUv = uv;
                                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                                vWorldPosition = worldPosition.xyz;
                                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                                gl_Position = projectionMatrix * viewMatrix * worldPosition;
                            }
                        `,
                        fragmentShader: `
                            varying vec2 vUv;
                            varying vec3 vWorldNormal;
                            varying vec3 vWorldPosition;
                            uniform sampler2D roughnessMap;
                            uniform vec3 sunDirection;
                            uniform vec3 glowColor;
                            uniform float uTime;
                            void main() {
                                vec3 normal = normalize(vWorldNormal);
                                vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                                vec3 sunDir = normalize(sunDirection);
                                // Real specular map: white = water, black = land. Sample directly.
                                float oceanMask = texture2D(roughnessMap, vUv).g;
                                // Lit side only — smooth transition at terminator
                                float sun = smoothstep(-0.08, 0.38, dot(normal, sunDir));
                                // Wide fresnel for diffuse ocean edge sheen
                                float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.2);
                                // Tight specular highlight — controlled, not flashy
                                float spec = pow(max(dot(reflect(-sunDir, normal), viewDir), 0.0), 64.0);

                                // Wind across the ocean — two low-frequency wave fields
                                // drifting in slightly different directions create the look
                                // of trade winds varying glossiness across the surface.
                                float wind1 = sin(vUv.y * 14.0 + uTime * 0.18 + vUv.x * 6.0) * 0.5 + 0.5;
                                float wind2 = sin(vUv.x * 22.0 - uTime * 0.12 + vUv.y * 4.0) * 0.5 + 0.5;
                                float wind = mix(wind1, wind2, 0.5);
                                // Wind modulates the specular intensity by ±25%.
                                float windMod = 0.75 + wind * 0.5;

                                float alpha = oceanMask * sun * (fresnel * 0.04 + spec * 0.18 * windMod);
                                gl_FragColor = vec4(glowColor, clamp(alpha, 0.0, 0.26));
                            }
                        `,
                    }),
                );
                surfaceGroup.add(oceanSheen);

                nightLights = new THREE.Mesh(
                    new THREE.SphereGeometry(1.003, 160, 160),
                    new THREE.ShaderMaterial({
                        transparent: true,
                        depthWrite: false,
                        blending: THREE.AdditiveBlending,
                        uniforms: {
                            lightsMap: { value: nightLightsPlaceholder },
                            sunDirection: { value: sunDirection },
                        },
                        vertexShader: `
                            varying vec2 vUv;
                            varying vec3 vWorldNormal;
                            varying vec3 vWorldPosition;
                            void main() {
                                vUv = uv;
                                vec4 wp = modelMatrix * vec4(position, 1.0);
                                vWorldPosition = wp.xyz;
                                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                                gl_Position = projectionMatrix * viewMatrix * wp;
                            }
                        `,
                        fragmentShader: `
                            varying vec2 vUv;
                            varying vec3 vWorldNormal;
                            varying vec3 vWorldPosition;
                            uniform sampler2D lightsMap;
                            uniform vec3 sunDirection;
                            void main() {
                                vec3 n = normalize(vWorldNormal);
                                vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                                float facing = max(dot(n, viewDir), 0.0);

                                // Anti-twinkle: LOD bias positivo cresce perto do limbo, onde a
                                // textura é foreshortened e pixels isolados aliasingam quadro a
                                // quadro (piscam como estrelas). Amostrar um mip menor borra essa
                                // cintilação. Base 1.1 + reforço quando facing é baixo (limbo).
                                float lodBias = 1.1 + (1.0 - smoothstep(0.04, 0.45, facing)) * 1.4;
                                vec3 raw = texture2D(lightsMap, vUv, lodBias).rgb;

                                float lum = dot(raw, vec3(0.299, 0.587, 0.114));
                                // Piso mais alto: não acende os pixels muito fracos (ruído de
                                // aliasing). Só luzes de cidade reais, estáveis entre quadros.
                                float intensity = smoothstep(0.085, 0.62, lum);

                                vec3 cityColor = mix(
                                    vec3(1.0, 0.78, 0.42),
                                    vec3(1.0, 0.92, 0.68),
                                    intensity
                                );

                                float sunDot = dot(n, normalize(sunDirection));
                                // Sol no topo atrás do limbo: quase todo o disco visível é
                                // penumbra/noite (sunDot baixo). Abrimos a janela para as
                                // cidades acenderem já a partir da penumbra (sunDot ~0.40),
                                // cobrindo o disco noturno como na referência; o dayPenalty
                                // ainda apaga a faixa fina de dia no topo, perto do sol.
                                float nightFactor = smoothstep(0.46, -0.10, sunDot);
                                float dayPenalty = smoothstep(0.52, 0.20, sunDot);

                                // Apaga só a borda extrema do limbo (twinkle residual).
                                float limbFade = smoothstep(0.015, 0.09, facing);

                                float alpha = intensity * nightFactor * dayPenalty * limbFade * 1.75;
                                gl_FragColor = vec4(cityColor * intensity * 2.1, clamp(alpha, 0.0, 1.0));
                            }
                        `,
                    }),
                );
                surfaceGroup.add(nightLights);

                let cloudMaterial: import('three').ShaderMaterial;
                let cloudsEnabled = true;
                try {
                    cloudMaterial = new THREE.ShaderMaterial({
                        transparent: true,
                        depthWrite: false,
                        blending: THREE.NormalBlending,
                        uniforms: {
                            cloudsMap: { value: cloudPlaceholder },
                            sunDirection: { value: sunDirection },
                            cloudOpacity: { value: 0.0 },
                            terminatorBoost: { value: 0.28 },
                            alphaFromAlpha: { value: 0.0 },
                        },
                        vertexShader: CLOUD_VERTEX_SHADER,
                        fragmentShader: CLOUD_FRAGMENT_SHADER,
                    });
                } catch (shaderError) {
                    console.warn('[earth] cloud shader creation failed, disabling clouds', shaderError);
                    cloudsEnabled = false;
                    cloudMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false });
                }

                clouds = new THREE.Mesh(new THREE.SphereGeometry(1.020, 160, 160), cloudMaterial);
                earthGroup.add(clouds);

                const applyCloudTexture = (tex: import('three').Texture, opacity: number, alphaFromAlpha: number) => {
                    tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16);
                    tex.minFilter = THREE.LinearMipmapLinearFilter;
                    tex.magFilter = THREE.LinearFilter;
                    tex.generateMipmaps = true;
                    cloudTexture = tex;
                    cloudMaterial.uniforms.cloudsMap.value = tex;
                    cloudMaterial.uniforms.cloudOpacity.value = opacity;
                    cloudMaterial.uniforms.alphaFromAlpha.value = alphaFromAlpha;
                    cloudMaterial.needsUpdate = true;
                    // Share the same texture for cloud-shadow projection on the surface.
                    earthShaderUniforms.cloudShadowMap.value = tex;
                    earthShaderUniforms.cloudShadowEnabled.value = 1.0;
                };

                const tryLoadCloud = (index: number): void => {
                    if (disposed) return;
                    if (index >= CLOUD_TEXTURE_CASCADE.length) {
                        console.warn('[earth] clouds texture failed, disabling clouds');
                        return;
                    }
                    const url = CLOUD_TEXTURE_CASCADE[index];
                    const isPng = url.endsWith('.png');
                    new THREE.TextureLoader().load(
                        url,
                        (tex) => {
                            if (disposed) { tex.dispose(); return; }
                            console.debug(`[earth] cloud texture loaded: ${url}`);
                            applyCloudTexture(tex, isPng ? 0.92 : 0.88, isPng ? 1.0 : 0.0);
                        },
                        undefined,
                        () => tryLoadCloud(index + 1),
                    );
                };

                if (cloudsEnabled) tryLoadCloud(0);

                // ── Arco atmosférico no limbo ────────────────────────────────
                // Casca FrontSide fina (2.5% acima da superfície), aditiva.
                // Atmosfera REAL vista de órbita: uma linha fina e brilhante
                // de núcleo quase branco rente ao limbo, decaindo rápido para
                // ciano e azul profundo; intensa no lado dia, quase ausente no
                // lado noite (as luzes de cidade assumem a borda noturna).
                // Banda larga e uniforme lê como "glow de filtro", evitar.
                const atmosphere = new THREE.Mesh(
                    new THREE.SphereGeometry(1.018, 128, 128),
                    new THREE.ShaderMaterial({
                        transparent: true,
                        depthWrite: false,
                        blending: THREE.AdditiveBlending,
                        uniforms: {
                            sunDirection: { value: sunDirection },
                            uColorDay: { value: new THREE.Color(0x6fd2ec) },
                            uColorDeep: { value: new THREE.Color(0x1e55b0) },
                            uIntensity: { value: 1.75 },
                        },
                        vertexShader: `
                            varying vec3 vWorldNormal;
                            varying vec3 vWorldPosition;
                            void main() {
                                vec4 wp = modelMatrix * vec4(position, 1.0);
                                vWorldPosition = wp.xyz;
                                vWorldNormal = normalize(mat3(modelMatrix) * normal);
                                gl_Position = projectionMatrix * viewMatrix * wp;
                            }
                        `,
                        fragmentShader: `
                            varying vec3 vWorldNormal;
                            varying vec3 vWorldPosition;
                            uniform vec3 sunDirection;
                            uniform vec3 uColorDay;
                            uniform vec3 uColorDeep;
                            uniform float uIntensity;
                            void main() {
                                vec3 n = normalize(vWorldNormal);
                                vec3 viewDir = normalize(cameraPosition - vWorldPosition);
                                // Fresnel: 0 olhando o chão, 1 na tangência (limbo).
                                float rim = 1.0 - max(dot(n, viewDir), 0.0);
                                // Cena recomeçada SEM cores quentes: atmosfera só azul.
                                // Halo azul mais largo + filete ciano rente ao limbo,
                                // nenhuma lâmina âmbar/vermelha do nascer do sol.
                                float blueHalo = pow(rim, 6.7);
                                float blueCore = pow(rim, 13.0);
                                float sunDot = dot(n, normalize(sunDirection));
                                // Dia brilha, noite quase some (realista).
                                float lit = smoothstep(-0.35, 0.28, sunDot);
                                vec3 color =
                                    uColorDeep * blueHalo * 0.72 +
                                    uColorDay * blueCore * 0.92;
                                float alpha =
                                    (blueHalo * 0.28 + blueCore * 0.26) * (0.12 + lit * 0.88);
                                gl_FragColor = vec4(color, clamp(alpha * uIntensity, 0.0, 0.76));
                            }
                        `,
                    }),
                );
                atmosphere.renderOrder = 5;
                earthGroup.add(atmosphere);
            }

            // ── Resize ───────────────────────────────────────────────────────
            const resize = () => {
                const renderRect = mount.getBoundingClientRect();
                const width = Math.max(1, renderRect.width);
                const height = Math.max(1, renderRect.height);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)), false);
            };

            const observer = new ResizeObserver(resize);
            observer.observe(mount);
            resize();

            // ── Pointer parallax ─────────────────────────────────────────────
            const onPointerMove = (event: PointerEvent) => {
                if (reducedMotion) return;
                mouse.x = (event.clientX / window.innerWidth - 0.5) * 2;
                mouse.y = (event.clientY / window.innerHeight - 0.5) * 2;
            };
            window.addEventListener('pointermove', onPointerMove, { passive: true });

            // ── Animation loop ───────────────────────────────────────────────
            const timer = new THREE.Timer();
            const smoothedMouse = { x: 0, y: 0 };
            const animate = () => {
                timer.update();
                const delta = timer.getDelta();
                const elapsed = timer.getElapsed();

                if (!reducedMotion) {
                    // Rotação lenta para LESTE (decrementando): a vista percorre
                    // Atlântico → África → Ásia em vez de mergulhar no vazio do
                    // Pacífico. Velocidades de globo seriam vertiginosas aqui.
                    surfaceGroup.rotation.y -= delta * 0.012;
                    if (!EARTH_DEBUG_MINIMAL && clouds) {
                        clouds.rotation.y -= delta * 0.0145;
                        clouds.rotation.x = Math.sin(elapsed * 0.04) * 0.004;
                        // Pass the cloud/surface rotation delta to the surface shader so
                        // shadows track the actual cloud positions as they rotate.
                        const surfaceRotY = surfaceGroup.rotation.y;
                        const cloudRotY = clouds.rotation.y;
                        // Cloud UVs in surface space drift by (cloudRotY - surfaceRotY) / (2π).
                        earthShaderUniforms.cloudRotationY.value = ((cloudRotY - surfaceRotY) / (Math.PI * 2));
                    }
                    // Wind animation on the ocean sheen
                    if (!EARTH_DEBUG_MINIMAL && oceanSheen) {
                        oceanSheen.material.uniforms.uTime.value = elapsed;
                    }

                    // Parallax suave de "estação": a câmera inclina levemente com o
                    // mouse e flutua devagar em altitude, como deriva orbital.
                    // Posição primeiro; applyCameraView deriva o alvo dela.
                    smoothedMouse.x += (mouse.x - smoothedMouse.x) * 0.03;
                    smoothedMouse.y += (mouse.y - smoothedMouse.y) * 0.03;
                    camera.position.z = 1 + ORBIT_ALTITUDE + Math.sin(elapsed * 0.12) * 0.006;
                    camera.position.x = Math.sin(elapsed * 0.07) * 0.008;
                    applyCameraView(0, 0);
                }

                renderer.render(scene, camera);

                // Only mark ready after:
                // 1. earth texture was actually applied to the material
                // 2. renderer.render() has been called (meaning a real GPU frame exists)
                if (earthTextureApplied && !firstFrameReady && !disposed) {
                    // Final validation before hiding fallback
                    const mat = earth.material as import('three').MeshStandardMaterial;
                    if (mat.map && mat.map.image && (mat.map.image as HTMLImageElement).width > 0 && earth.visible) {
                        firstFrameReady = true;
                        console.debug('[earth] first valid frame rendered');
                        console.debug('[earth] fallback hidden after valid render');
                        setReady(true);
                        onReady?.();
                    }
                }

                frame = window.requestAnimationFrame(animate);
            };

            animate();

            // ── Cleanup ──────────────────────────────────────────────────────
            cleanup = () => {
                disposed = true;
                window.cancelAnimationFrame(frame);
                window.removeEventListener('pointermove', onPointerMove);
                observer.disconnect();
                earthTexture?.dispose();
                normalTexture?.dispose();
                specularTexture?.dispose();
                nightLightsTexture?.dispose();
                roughnessPlaceholder.dispose();
                nightLightsPlaceholder.dispose();
                cloudPlaceholder.dispose();
                cloudTexture?.dispose();
                scene.traverse((object) => {
                    if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
                        object.geometry.dispose();
                        const material = object.material;
                        if (Array.isArray(material)) {
                            material.forEach((item) => item.dispose());
                        } else {
                            material.dispose();
                        }
                    }
                });
                renderer.dispose();
                canvasElement.remove();
            };
        }).catch((err) => {
            console.error('[earth] Three.js import failed:', err);
            setFailed(true);
        });

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, []);

    return (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
            <div
                ref={shellRef}
                className={`cinematic-earth-shell ${ready && !failed ? 'cinematic-earth-shell-ready' : ''}`}
            >
                <div
                    ref={mountRef}
                    className="absolute inset-0"
                    style={{
                        opacity: ready && !failed ? 1 : 0,
                        visibility: ready && !failed ? 'visible' : 'hidden',
                        pointerEvents: 'none',
                    }}
                />

                {failed ? (
                    <div className="earth-horizon-fallback" aria-hidden="true" />
                ) : null}

                {!ready && !failed ? (
                    <div className="earth-loading-spinner absolute inset-0" aria-hidden="true" />
                ) : null}
            </div>
        </div>
    );
}


function createSolidTexture(THREE: typeof import('three'), color: [number, number, number, number]): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');

    if (context) {
        const imageData = context.createImageData(1, 1);
        imageData.data.set(color);
        context.putImageData(imageData, 0, 0);
    }

    return new THREE.CanvasTexture(canvas);
}
