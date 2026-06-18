/**
 * Responsabilidade: trânsito de DADOS reais cruzando a faixa central do hero.
 *
 * Diferente do cometa decorativo do CinematicSpaceBackdrop (branco frio, raro,
 * no céu superior, com cauda longa de gelo), estes são ASTEROIDES: pontos de
 * luz quase branco-quentes que DESLIZAM pela banda central, cada um com apenas
 * um borrão de movimento curto atrás (rocha não tem cauda de cometa). VÁRIOS
 * podem cruzar ao mesmo tempo, em alturas, ângulos e velocidades distintas, de
 * modo que a faixa morta entre o bloco editorial e o horizonte raramente fica
 * vazia: vira o tráfego real da vizinhança da Terra. A velocidade vem do dado
 * (mais perto = mais rápido). Cada passagem é um objeto REAL (de
 * `/radar/closest-now` via useHomeApproachTransits); ao cruzar o meio, um
 * rótulo fantasma com nome + distância surge e some, costurando o dado vivo do
 * produto na beleza da cena. Objetos entram em rodízio.
 *
 * Sem objetos (lista vazia), o componente fica silencioso. Renderiza num canvas
 * próprio posicionado entre o fundo cósmico (z-0) e o glow do nascer (z-8).
 */

import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/lib/format';
import type { HomeApproachTransit } from '@/hooks/useHomeApproachTransits';

// ── TUNING ──────────────────────────────────────────────────────────────────
// ASTEROIDE, NÃO COMETA: rocha é um PONTO de luz que se move, sem a cauda
// brilhante de gelo sublimando. O "rastro" é só um borrão de movimento curto
// atrás do núcleo, não uma cauda de cometa.
const TUNING = {
    // Banda central onde o trânsito vive (NDC y, 0 = topo, 1 = base). Fica acima
    // do horizonte da Terra e abaixo do bloco editorial: a faixa morta.
    bandYMin: 0.30,
    bandYMax: 0.58,
    // Travessia em função da distância (ver transitDurationForDistance): objeto
    // mais perto cruza mais rápido. Estes são os limites do mapa.
    // Asteroide a milhões de km parece quase parado no céu: movimento lento e
    // contemplativo é o mais realista (e o mais elegante na cena).
    durationFastSec: 10.0,   // objeto próximo, passa um pouco mais ligeiro
    durationSlowSec: 18.0,   // objeto distante, deriva bem devagar
    // Quantos slots de trânsito existem ao mesmo tempo. Vários objetos cruzando
    // em paralelo enchem a faixa morta de tráfego em vez de um ponto solitário.
    maxConcurrent: 3,
    // Espera entre o FIM de uma passagem e o início da próxima NAQUELE slot.
    // Curta: com 3 slots desencontrados, quase sempre há algo na tela.
    gapMinSec: 1.4,
    gapMaxSec: 4.5,
    headSizePx: 3.4,         // núcleo de rocha, mais presente
    trailLengthPx: 52,       // borrão de movimento (não cauda de cometa)
    colorCore: 0xfff0d8,     // núcleo quase branco-quente da rocha iluminada
    colorWarm: 0xffb870,     // âmbar do rastro de movimento (casa com o crepúsculo)
    // Fração do percurso em que o rótulo fica visível (centro da travessia).
    labelInAt: 0.30,
    labelOutAt: 0.70,
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

// Um slot de trânsito: o estado de uma passagem em andamento (ou aguardando).
type TransitSlot = {
    active: boolean;
    startTime: number;
    duration: number;
    nextSpawnAt: number;
    startX: number; startY: number; endX: number; endY: number;
    current: HomeApproachTransit | null;
};

// Rótulo de um objeto em trânsito, ancorado na cabeça do risco. Até MAX_LABELS
// aparecem ao mesmo tempo (os mais próximos do centro da própria travessia);
// mais que isso polui a cena.
type LabelState = { id: string; text: HomeApproachTransit; x: number; y: number };

// No máximo dois rótulos simultâneos: o suficiente para a cena parecer um
// tráfego com nomes, sem virar uma sopa de balões sobrepostos.
const MAX_LABELS = 2;

type Props = { transits: HomeApproachTransit[] };

export function ApproachTransit({ transits }: Props) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [labels, setLabels] = useState<LabelState[]>([]);

    // Posição dos rótulos é atualizada via DOM a cada quadro (sem re-render):
    // o estado `labels` só monta/desmonta os spans quando o CONJUNTO muda; a
    // cabeça da rocha se move continuamente, então left/top vêm direto na ref.
    const labelNodesRef = useRef<Map<string, HTMLSpanElement>>(new Map());

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

            const N = TUNING.maxConcurrent;
            const streak = buildStreak(THREE, N);
            scene.add(streak);
            const mat = streak.material as import('three').ShaderMaterial;

            // Rodízio compartilhado da lista entre os slots, para não repetir o
            // mesmo objeto em dois slots ao mesmo tempo.
            let cursor = 0;
            const slots: TransitSlot[] = Array.from({ length: N }, (_, i) => ({
                active: false,
                startTime: 0,
                duration: TUNING.durationSlowSec,
                // Desencontra os primeiros spawns para os slots não largarem juntos.
                nextSpawnAt: performance.now() / 1000 + 0.6 + i * 1.3 + Math.random() * 1.2,
                startX: 0, startY: 0, endX: 0, endY: 0,
                current: null,
            }));

            const scheduleNext = (slot: TransitSlot, now: number) => {
                slot.nextSpawnAt = now + TUNING.gapMinSec + Math.random() * (TUNING.gapMaxSec - TUNING.gapMinSec);
            };

            const launch = (slot: TransitSlot) => {
                const list = transitsRef.current;
                if (list.length === 0) {
                    scheduleNext(slot, performance.now() / 1000);
                    return;
                }
                slot.current = list[cursor % list.length];
                cursor += 1;
                slot.duration = transitDurationForDistance(slot.current.distanceKm);

                // Trajetória VARIADA (mata o aspecto esteira reta horizontal):
                // entra por um dos lados, com ângulo e altura próprios.
                const fromLeft = Math.random() < 0.5;
                const entryX = fromLeft ? -0.12 : 1.12;
                const entryY = TUNING.bandYMin - 0.04 + Math.random() * (TUNING.bandYMax - TUNING.bandYMin + 0.08);
                const slope = (Math.random() - 0.5) * 0.30; // sobe ou desce levemente
                const span = 0.95 + Math.random() * 0.4;     // quanto da tela percorre
                slot.startX = entryX;
                slot.startY = entryY;
                slot.endX = fromLeft ? entryX + span : entryX - span;
                slot.endY = entryY + slope;

                slot.active = true;
                slot.startTime = performance.now() / 1000;
            };

            const resize = () => {
                const { clientWidth: w, clientHeight: h } = mount;
                renderer.setSize(w, h, false);
                mat.uniforms.uResolution.value.set(w, h);
            };
            const observer = new ResizeObserver(resize);
            observer.observe(mount);
            resize();

            // Buffers reutilizados a cada quadro (evita alocação no loop).
            const uActive: number[] = new Array(N).fill(0);
            const uProgress: number[] = new Array(N).fill(0);
            const uStart: import('three').Vector2[] = Array.from({ length: N }, () => new THREE.Vector2());
            const uEnd: import('three').Vector2[] = Array.from({ length: N }, () => new THREE.Vector2());

            // Candidatos a rótulo do quadro atual, reusados sem realocar.
            type Candidate = { slotIndex: number; text: HomeApproachTransit; x: number; y: number; centerDist: number };
            const candidates: Candidate[] = [];
            // Chave do conjunto de rótulos atualmente em estado (slotIndex:id):
            // só chamamos setState quando ela muda, evitando re-render por quadro.
            let lastLabelKey = '';

            let frame = 0;
            const animate = () => {
                const nowSec = performance.now() / 1000;
                candidates.length = 0;

                for (let i = 0; i < N; i++) {
                    const slot = slots[i];
                    if (!slot.active && nowSec >= slot.nextSpawnAt && !reducedMotion) {
                        launch(slot);
                    }
                    if (!slot.active) {
                        uActive[i] = 0;
                        continue;
                    }
                    const progress = (nowSec - slot.startTime) / slot.duration;
                    if (progress >= 1) {
                        slot.active = false;
                        uActive[i] = 0;
                        scheduleNext(slot, nowSec);
                        continue;
                    }
                    uActive[i] = 1;
                    uProgress[i] = progress;
                    uStart[i].set(slot.startX, slot.startY);
                    uEnd[i].set(slot.endX, slot.endY);

                    const headX = slot.startX + (slot.endX - slot.startX) * progress;
                    const headY = slot.startY + (slot.endY - slot.startY) * progress;

                    const inWindow = progress >= TUNING.labelInAt && progress <= TUNING.labelOutAt;
                    if (inWindow && slot.current) {
                        candidates.push({ slotIndex: i, text: slot.current, x: headX, y: headY, centerDist: Math.abs(progress - 0.5) });
                    }
                }

                // Upload dos arrays (uma vez por quadro).
                mat.uniforms.uActive.value = uActive;
                mat.uniforms.uProgress.value = uProgress;
                mat.uniforms.uStart.value = uStart;
                mat.uniforms.uEnd.value = uEnd;

                // Até MAX_LABELS rótulos: os mais próximos do centro da travessia.
                candidates.sort((a, b) => a.centerDist - b.centerDist);
                const shown = candidates.slice(0, MAX_LABELS);
                const key = shown.map((c) => `${c.slotIndex}:${c.text.id}`).join('|');
                // Re-render só quando o CONJUNTO de rótulos muda (monta/desmonta).
                if (key !== lastLabelKey) {
                    lastLabelKey = key;
                    setLabels(shown.map((c) => ({ id: `${c.slotIndex}:${c.text.id}`, text: c.text, x: c.x, y: c.y })));
                }
                // Posição segue a cabeça da rocha A CADA QUADRO, via DOM direto,
                // para o rótulo acompanhar o movimento sem custo de re-render.
                for (const c of shown) {
                    const node = labelNodesRef.current.get(`${c.slotIndex}:${c.text.id}`);
                    if (node) {
                        node.style.left = `${c.x * 100}%`;
                        node.style.top = `${c.y * 100}%`;
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

    return (
        <div ref={mountRef} aria-hidden="true" className="home-approach-transit pointer-events-none absolute inset-0 z-[7] overflow-hidden">
            {labels.map((entry) => {
                const distLabel = entry.text.distanceKm != null ? `${formatNumber(entry.text.distanceKm, 0)} km` : null;
                return (
                    <span
                        key={entry.id}
                        ref={(node) => {
                            if (node) labelNodesRef.current.set(entry.id, node);
                            else labelNodesRef.current.delete(entry.id);
                        }}
                        className="home-approach-transit-label is-visible"
                        style={{ left: `${entry.x * 100}%`, top: `${entry.y * 100}%` }}
                    >
                        <span className="home-approach-transit-name">{entry.text.name}</span>
                        {distLabel ? <span className="home-approach-transit-dist">{distLabel}</span> : null}
                    </span>
                );
            })}
        </div>
    );
}

// ── Asteroides (quad fullscreen): N núcleos de luz + borrão de movimento ─────
// Um único quad desenha todos os slots: o fragment varre o pool e soma a
// contribuição de cada trânsito ativo. Arrays de uniforms de tamanho fixo N.
function buildStreak(
    THREE: typeof import('three'),
    count: number,
): import('three').Mesh<import('three').PlaneGeometry, import('three').ShaderMaterial> {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uCount: { value: count },
            uActive: { value: new Array(count).fill(0) },
            uProgress: { value: new Array(count).fill(0) },
            uStart: { value: Array.from({ length: count }, () => new THREE.Vector2(0, 0.4)) },
            uEnd: { value: Array.from({ length: count }, () => new THREE.Vector2(1, 0.4)) },
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
            #define COUNT ${count}
            varying vec2 vUv;
            uniform int uCount;
            uniform float uActive[COUNT];
            uniform float uProgress[COUNT];
            uniform vec2 uStart[COUNT];
            uniform vec2 uEnd[COUNT];
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
                vec2 fragPx = vUv * uResolution;
                vec3 accColor = vec3(0.0);
                float accIntensity = 0.0;

                for (int i = 0; i < COUNT; i++) {
                    if (uActive[i] < 0.5) continue;

                    float progress = uProgress[i];
                    // uStart/uEnd em coords de tela (y para baixo); UV.y sobe. Flipa.
                    vec2 startPx = vec2(uStart[i].x, 1.0 - uStart[i].y) * uResolution;
                    vec2 endPx = vec2(uEnd[i].x, 1.0 - uEnd[i].y) * uResolution;

                    vec2 headPx = mix(startPx, endPx, progress);
                    vec2 fullDir = endPx - startPx;
                    vec2 dir = length(fullDir) > 0.0 ? normalize(fullDir) : vec2(1.0, 0.0);
                    vec2 tailPx = headPx - dir * min(uTrailPx, length(headPx - startPx));

                    float headDist = distance(fragPx, headPx);
                    float segDist = distToSegment(fragPx, tailPx, headPx);

                    // NÚCLEO de rocha: ponto nítido e brilhante com halo pequeno.
                    float core = exp(-headDist / uHeadPx);
                    float halo = exp(-headDist / (uHeadPx * 3.2)) * 0.35;

                    // RASTRO de movimento curtíssimo: borrão âmbar atrás do núcleo.
                    float along = clamp(dot(fragPx - tailPx, dir) / max(uTrailPx, 1.0), 0.0, 1.0);
                    float trailWidth = mix(0.5, uHeadPx * 0.8, along);
                    float trail = exp(-segDist / trailWidth) * along * along * 0.5;

                    // Envelope: fade in/out suave para o objeto não "pipocar".
                    float envelope = smoothstep(0.0, 0.09, progress) * smoothstep(1.0, 0.85, progress);

                    float intensity = (core + halo + trail) * envelope;
                    vec3 color = mix(uColorWarm, uColorCore, clamp(core + halo, 0.0, 1.0));

                    accColor += color * intensity;
                    accIntensity += intensity;
                }

                if (accIntensity <= 0.0) discard;
                vec3 finalColor = accColor / max(accIntensity, 1e-4);
                gl_FragColor = vec4(finalColor, clamp(accIntensity, 0.0, 0.92));
            }
        `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    return mesh;
}
