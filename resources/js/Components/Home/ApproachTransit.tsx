/**
 * Responsabilidade: trânsito de DADOS reais cruzando a faixa central do hero.
 *
 * Diferente do cometa decorativo do CinematicSpaceBackdrop (branco frio, raro,
 * no céu superior, com cauda longa de gelo), este é um ASTEROIDE: um ponto de
 * luz quase branco-quente que DESLIZA pela banda central, com apenas um borrão
 * de movimento curto atrás (rocha não tem cauda de cometa). A velocidade vem do
 * dado real (mais perto = mais rápido) e a trajetória varia em ângulo, altura,
 * direção e comprimento a cada passagem, evitando o aspecto de esteira. Cada
 * passagem é um objeto REAL da vizinhança da Terra (vindo de
 * `/radar/closest-now` via useHomeApproachTransits); ao passar pelo meio, um
 * rótulo fantasma com nome + distância surge e some, costurando o dado vivo do
 * produto na beleza da cena. Objetos são sorteados em rodízio.
 *
 * Sem objetos (lista vazia), o componente fica silencioso. Renderiza num canvas
 * próprio posicionado entre o fundo cósmico (z-0) e o glow do nascer (z-8).
 */

import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/lib/format';
import type { HomeApproachTransit } from '@/hooks/useHomeApproachTransits';

// ── TUNING ──────────────────────────────────────────────────────────────────
// ASTEROIDE, NÃO COMETA: rocha é um PONTO de luz que se move, sem a cauda
// brilhante de gelo sublimando. Aqui o "rastro" é só um borrão de movimento
// bem curto atrás do núcleo, não a cauda longa de antes (aquilo era cometa).
const TUNING = {
    // Banda central onde o trânsito vive (NDC y, 0 = topo, 1 = base). Fica acima
    // do horizonte da Terra e abaixo do bloco editorial: a faixa morta.
    bandYMin: 0.32,
    bandYMax: 0.54,
    // Travessia em função da distância (ver transitDurationForDistance): objeto
    // mais perto cruza mais rápido. Estes são os limites do mapa.
    // Asteroide a milhões de km parece quase parado no céu: movimento lento e
    // contemplativo é o mais realista (e o mais elegante na cena). "Rápido" aqui
    // ainda é bem devagar; "lento" é uma deriva longa.
    durationFastSec: 9.0,    // objeto próximo, passa um pouco mais ligeiro
    durationSlowSec: 16.0,   // objeto distante, deriva bem devagar
    gapMinSec: 7,            // espera mínima entre passagens
    gapMaxSec: 13,           // espera máxima
    headSizePx: 3.0,         // núcleo de rocha, mais presente que a cabeça do cometa
    trailLengthPx: 42,       // só um borrão de movimento (era 320 = cauda de cometa)
    colorCore: 0xfff0d8,     // núcleo quase branco-quente da rocha iluminada
    colorWarm: 0xffb870,     // âmbar do rastro de movimento (casa com o crepúsculo)
    // Fração do percurso em que o rótulo fica visível (centro da travessia).
    labelInAt: 0.36,
    labelOutAt: 0.64,
} as const;

// Distâncias típicas da vizinhança (km) que mapeiam para as velocidades extremas.
// ~150 mil km (perto) → rápido; ~6 milhões km (longe) → lento.
const DISTANCE_NEAR_KM = 150_000;
const DISTANCE_FAR_KM = 6_000_000;

/**
 * Duração da travessia a partir da distância do objeto. Pura e testável: mais
 * perto = mais rápido (duração menor). Sem distância, usa o meio da faixa.
 */
export function transitDurationForDistance(distanceKm: number | null): number {
    if (distanceKm == null || !Number.isFinite(distanceKm)) {
        return (TUNING.durationFastSec + TUNING.durationSlowSec) / 2;
    }
    const clamped = Math.min(Math.max(distanceKm, DISTANCE_NEAR_KM), DISTANCE_FAR_KM);
    const t = (clamped - DISTANCE_NEAR_KM) / (DISTANCE_FAR_KM - DISTANCE_NEAR_KM);
    return TUNING.durationFastSec + t * (TUNING.durationSlowSec - TUNING.durationFastSec);
}

type LabelState = { text: HomeApproachTransit | null; x: number; y: number; visible: boolean };

type Props = { transits: HomeApproachTransit[] };

export function ApproachTransit({ transits }: Props) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [label, setLabel] = useState<LabelState>({ text: null, x: 0.5, y: 0.43, visible: false });

    // Lista atual em ref: o loop lê sem reiniciar a cena quando o fetch resolve.
    const transitsRef = useRef<HomeApproachTransit[]>(transits);
    transitsRef.current = transits;

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        let cleanup: (() => void) | undefined;
        let cancelled = false;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        void import('three').then((THREE) => {
            if (cancelled || !mount.isConnected) return;

            const scene = new THREE.Scene();
            const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.85));
            renderer.outputColorSpace = THREE.SRGBColorSpace;

            const canvas = renderer.domElement;
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
            mount.appendChild(canvas);

            const streak = buildStreak(THREE);
            scene.add(streak);
            const mat = streak.material as import('three').ShaderMaterial;

            const state = {
                active: false,
                startTime: 0,
                duration: TUNING.durationSlowSec as number,
                nextSpawnAt: performance.now() / 1000 + 1.5 + Math.random() * 2,
                startX: 0, startY: 0, endX: 0, endY: 0,
                labelEmitted: false,
                current: null as HomeApproachTransit | null,
                cursor: 0, // rodízio na lista
            };
            const scheduleNext = (now: number) => {
                state.nextSpawnAt = now + TUNING.gapMinSec + Math.random() * (TUNING.gapMaxSec - TUNING.gapMinSec);
            };
            const launch = () => {
                const list = transitsRef.current;
                if (list.length === 0) {
                    // Sem dados ainda: tenta de novo daqui a pouco, sem trânsito.
                    scheduleNext(performance.now() / 1000);
                    return;
                }
                state.current = list[state.cursor % list.length];
                state.cursor += 1;
                // Velocidade do dado real: mais perto cruza mais rápido.
                state.duration = transitDurationForDistance(state.current.distanceKm);

                // Trajetória VARIADA (mata o aspecto esteira reta horizontal):
                // entra por um dos lados ou pelo topo, com ângulo e altura próprios.
                // O alvo é sempre dentro/perto da banda central para o rótulo ler.
                const fromLeft = Math.random() < 0.5;
                const entryX = fromLeft ? -0.1 : 1.1;
                const entryY = TUNING.bandYMin - 0.06 + Math.random() * (TUNING.bandYMax - TUNING.bandYMin + 0.12);
                // Inclinação suave e aleatória; comprimento do percurso também varia.
                const slope = (Math.random() - 0.5) * 0.34; // sobe ou desce levemente
                const span = 0.9 + Math.random() * 0.4;     // quanto da tela percorre
                state.startX = entryX;
                state.startY = entryY;
                state.endX = fromLeft ? entryX + span : entryX - span;
                state.endY = entryY + slope;

                state.active = true;
                state.startTime = performance.now() / 1000;
                state.labelEmitted = false;
            };

            const resize = () => {
                const { clientWidth: w, clientHeight: h } = mount;
                renderer.setSize(w, h, false);
                mat.uniforms.uResolution.value.set(w, h);
            };
            const observer = new ResizeObserver(resize);
            observer.observe(mount);
            resize();

            let frame = 0;
            const animate = () => {
                const nowSec = performance.now() / 1000;
                if (!state.active && nowSec >= state.nextSpawnAt && !reducedMotion) {
                    launch();
                }
                if (state.active) {
                    const progress = (nowSec - state.startTime) / state.duration;
                    if (progress >= 1) {
                        state.active = false;
                        mat.uniforms.uActive.value = 0;
                        setLabel((prev) => (prev.visible ? { ...prev, visible: false } : prev));
                        scheduleNext(nowSec);
                    } else {
                        mat.uniforms.uActive.value = 1;
                        mat.uniforms.uProgress.value = progress;
                        mat.uniforms.uStart.value.set(state.startX, state.startY);
                        mat.uniforms.uEnd.value.set(state.endX, state.endY);

                        // Rótulo: visível só na janela central da travessia. Posição
                        // segue a cabeça do risco, ligeiramente acima dela.
                        const wantVisible = progress >= TUNING.labelInAt && progress <= TUNING.labelOutAt;
                        const headX = state.startX + (state.endX - state.startX) * progress;
                        const headY = state.startY + (state.endY - state.startY) * progress;
                        if (wantVisible) {
                            setLabel({ text: state.current, x: headX, y: headY, visible: true });
                        } else if (state.labelEmitted) {
                            setLabel((prev) => (prev.visible ? { ...prev, visible: false } : prev));
                        }
                        state.labelEmitted = wantVisible;
                    }
                }

                renderer.render(scene, camera);
                frame = window.requestAnimationFrame(animate);
            };
            animate();

            cleanup = () => {
                window.cancelAnimationFrame(frame);
                observer.disconnect();
                streak.geometry.dispose();
                mat.dispose();
                renderer.dispose();
                canvas.remove();
            };
        }).catch(() => {
            // Silent: sem Three, o trânsito simplesmente não aparece.
        });

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, []);

    const distLabel = label.text?.distanceKm != null ? `${formatNumber(label.text.distanceKm, 0)} km` : null;

    return (
        <div ref={mountRef} aria-hidden="true" className="home-approach-transit pointer-events-none absolute inset-0 z-[7] overflow-hidden">
            {label.text ? (
                <span
                    className={`home-approach-transit-label ${label.visible ? 'is-visible' : ''}`}
                    style={{ left: `${label.x * 100}%`, top: `${label.y * 100}%` }}
                >
                    <span className="home-approach-transit-name">{label.text.name}</span>
                    {distLabel ? <span className="home-approach-transit-dist">{distLabel}</span> : null}
                </span>
            ) : null}
        </div>
    );
}

// ── Asteroide (quad fullscreen): núcleo de luz + borrão de movimento curto ──
function buildStreak(THREE: typeof import('three')): import('three').Mesh<import('three').PlaneGeometry, import('three').ShaderMaterial> {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uActive: { value: 0 },
            uProgress: { value: 0 },
            uStart: { value: new THREE.Vector2(0, 0.4) },
            uEnd: { value: new THREE.Vector2(1, 0.4) },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uColorCore: { value: new THREE.Color(TUNING.colorCore) },
            uColorWarm: { value: new THREE.Color(TUNING.colorWarm) },
            uHeadPx: { value: TUNING.headSizePx },
            uTrailPx: { value: TUNING.trailLengthPx },
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform float uActive;
            uniform float uProgress;
            uniform vec2 uStart;
            uniform vec2 uEnd;
            uniform vec2 uResolution;
            uniform vec3 uColorCore;
            uniform vec3 uColorWarm;
            uniform float uHeadPx;
            uniform float uTrailPx;

            float distToSegment(vec2 p, vec2 a, vec2 b) {
                vec2 ab = b - a;
                float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
                return distance(p, a + ab * t);
            }

            void main() {
                if (uActive < 0.5) discard;

                vec2 fragPx = vUv * uResolution;
                // uStart/uEnd em coords de tela (y para baixo); UV.y sobe. Flipa.
                vec2 startPx = vec2(uStart.x, 1.0 - uStart.y) * uResolution;
                vec2 endPx = vec2(uEnd.x, 1.0 - uEnd.y) * uResolution;

                vec2 headPx = mix(startPx, endPx, uProgress);
                vec2 fullDir = endPx - startPx;
                vec2 dir = length(fullDir) > 0.0 ? normalize(fullDir) : vec2(1.0, 0.0);
                vec2 tailPx = headPx - dir * min(uTrailPx, length(headPx - startPx));

                float headDist = distance(fragPx, headPx);
                float segDist = distToSegment(fragPx, tailPx, headPx);

                // NÚCLEO de rocha: ponto nítido e brilhante (o asteroide em si) com
                // um halo pequeno ao redor. É o elemento dominante, não a cauda.
                float core = exp(-headDist / uHeadPx);
                float halo = exp(-headDist / (uHeadPx * 3.2)) * 0.35;

                // RASTRO de movimento curtíssimo: só um borrão âmbar atrás do núcleo,
                // some rápido (along^2). Não é cauda de cometa, é blur de velocidade.
                float along = clamp(dot(fragPx - tailPx, dir) / max(uTrailPx, 1.0), 0.0, 1.0);
                float trailWidth = mix(0.5, uHeadPx * 0.8, along);
                float trail = exp(-segDist / trailWidth) * along * along * 0.5;

                // Cor: núcleo quase branco-quente, rastro caindo para o âmbar.
                vec3 color = mix(uColorWarm, uColorCore, clamp(core + halo, 0.0, 1.0));

                // Envelope: fade in/out suave para o objeto não "pipocar".
                float envelope = smoothstep(0.0, 0.09, uProgress) * smoothstep(1.0, 0.85, uProgress);

                float intensity = (core + halo + trail) * envelope;
                gl_FragColor = vec4(color, clamp(intensity, 0.0, 0.92));
            }
        `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    return mesh;
}
