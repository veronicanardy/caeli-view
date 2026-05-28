// Single-canvas cosmic backdrop for the hero.
//
// Renders, in one Three.js scene behind the Earth:
//   1. A distant nebula shell — procedural FBM noise in cool blue tones.
//   2. Two static star layers (dust + mid) — no twinkle, drift only with the mouse.
//   3. A thin atmospheric halo that physically tracks the Earth disc on screen.
//
// Why one file: previous setup had Earth, atmosphere, stars and CSS glow
// scattered across 4+ places. Consolidating means tweaking the look only
// requires editing the TUNING block below.

import { useEffect, useRef } from 'react';

// ── TUNING ──────────────────────────────────────────────────────────────────
const TUNING = {
    nebula: {
        colorVoid: 0x02050d,
        colorBase: 0x0a1a3a,
        colorAccent: 0x1b4470,
        colorHighlight: 0x2c6e9a,
        cloudIntensity: 0.38,
        noiseScale: 1.4,
    },
    stars: {
        // Three depths read as real space. Farther = more numerous + dimmer + smaller.
        farCount: 4200,          // distant dust — fills the void
        midCount: 1500,          // mid-field
        nearCount: 360,          // foreground stars
        baseRadius: 22,
    },
    // Atmospheric halo behind Earth — sized and positioned at runtime to
    // match the .cinematic-earth-shell bounding box. Values here only shape
    // the falloff, not where it lives on screen.
    halo: {
        color: 0x7fb8d8,         // cooler, less saturated blue — less "cyan ring"
        // Inner edge sits exactly at Earth's visual radius; outer fades long.
        innerScale: 1.00,        // 1.0 = right at the Earth limb
        outerScale: 1.85,        // longer fade for elegance
        intensity: 0.22,         // much subtler peak
        falloffPower: 3.6,       // steeper drop = thin elegant edge, not a wash
    },
    parallax: {
        nebulaStrength: 0.03,
        starsStrength: 0.10,
        haloStrength: 0.04,      // Earth itself parallaxes; halo follows gently
        easing: 0.06,
    },
    comet: {
        // Rare cinematic event — a streak crosses the sky every so often.
        minIntervalSec: 25,      // soonest the next comet can appear
        maxIntervalSec: 60,      // latest it might wait
        durationSec: 2.2,        // seconds from spawn to disappear
        headSizePx: 3.5,         // bright leading point
        trailLengthPx: 220,      // how long the tail draws
        color: 0xeaf4ff,         // cool, almost-white
    },
} as const;

// The Earth's outer container — we read its bounding rect each frame so the
// halo stays glued to wherever CSS has placed the Earth (varies by breakpoint).
// We measure the inner mount (which holds the actual WebGL canvas) rather than
// the shell: the mount has a -7% bleed inset, so it's exactly the canvas box,
// and the Earth sphere fills that canvas symmetrically.
const EARTH_SHELL_SELECTOR = '.cinematic-earth-shell';

export function CinematicSpaceBackdrop() {
    const mountRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return undefined;

        let cleanup: (() => void) | undefined;
        let cancelled = false;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        void import('three').then((THREE) => {
            if (cancelled || !mount.isConnected) return;

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
            camera.position.set(0, 0, 0.01);
            camera.lookAt(0, 0, -1);

            const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.85));
            renderer.outputColorSpace = THREE.SRGBColorSpace;

            const canvas = renderer.domElement;
            canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
            mount.appendChild(canvas);

            // ── Groups for independent parallax ──────────────────────────────
            const nebulaGroup = new THREE.Group();
            const starsGroup = new THREE.Group();
            const haloGroup = new THREE.Group();
            scene.add(nebulaGroup, starsGroup, haloGroup);

            // ── Layers ───────────────────────────────────────────────────────
            const nebula = buildNebula(THREE);
            nebulaGroup.add(nebula);

            // Three star depths — farther layers are smaller, dimmer, denser.
            // Read together they sell depth: your eye picks out brighter foreground
            // points against a haze of distant dust.
            const far = buildStarLayer(THREE, {
                count: TUNING.stars.farCount,
                radius: TUNING.stars.baseRadius * 1.7,
                sizeMin: 0.008, sizeMax: 0.016,
                toneMin: 0.22, toneMax: 0.42,
            });
            const mid = buildStarLayer(THREE, {
                count: TUNING.stars.midCount,
                radius: TUNING.stars.baseRadius * 1.1,
                sizeMin: 0.018, sizeMax: 0.032,
                toneMin: 0.48, toneMax: 0.72,
            });
            const near = buildStarLayer(THREE, {
                count: TUNING.stars.nearCount,
                radius: TUNING.stars.baseRadius * 0.72,
                sizeMin: 0.030, sizeMax: 0.052,
                toneMin: 0.72, toneMax: 0.95,
            });
            starsGroup.add(far, mid, near);

            const halo = buildHalo(THREE);
            haloGroup.add(halo);

            // ── Comet (rare cinematic streak) ────────────────────────────────
            const comet = buildComet(THREE);
            scene.add(comet);
            const cometState = {
                active: false,
                startTime: 0,
                nextSpawnAt: performance.now() / 1000 + 8 + Math.random() * 10, // first one in 8-18s
                // Per-shot randomized trajectory in normalized canvas coords (0-1).
                startX: 0, startY: 0, endX: 0, endY: 0,
            };
            const scheduleNextComet = (now: number) => {
                const wait = TUNING.comet.minIntervalSec +
                    Math.random() * (TUNING.comet.maxIntervalSec - TUNING.comet.minIntervalSec);
                cometState.nextSpawnAt = now + wait;
            };
            const launchComet = () => {
                // Pick a random edge to start from, end on the opposite-ish side.
                // Bias trajectories to NOT cross the Earth disc on the right side.
                const fromTop = Math.random() < 0.5;
                if (fromTop) {
                    cometState.startX = 0.05 + Math.random() * 0.45;   // left half
                    cometState.startY = -0.05;
                    cometState.endX = cometState.startX + 0.25 + Math.random() * 0.3;
                    cometState.endY = 0.55 + Math.random() * 0.35;
                } else {
                    cometState.startX = -0.05;
                    cometState.startY = 0.05 + Math.random() * 0.55;
                    cometState.endX = 0.35 + Math.random() * 0.25;
                    cometState.endY = cometState.startY + 0.35 + Math.random() * 0.35;
                }
                cometState.active = true;
                cometState.startTime = performance.now() / 1000;
            };

            // ── Halo placement: track the Earth shell's bounding box ─────────
            // The shell is positioned with CSS translates that differ per breakpoint,
            // so we sample its rect and convert to UV coordinates inside the canvas.
            const haloUniforms = halo.material.uniforms;

            const placeHalo = () => {
                const mountRect = mount.getBoundingClientRect();
                const w = mountRect.width;
                const h = mountRect.height;
                if (w === 0 || h === 0) return;

                // Prefer measuring the actual Earth <canvas> element — that's where
                // the sphere pixels are. The shell can be partially off-screen due
                // to CSS translates, which would skew a shell-based measurement.
                const earthShell = document.querySelector(EARTH_SHELL_SELECTOR);
                const earthCanvas = earthShell?.querySelector('canvas');
                const target = earthCanvas ?? earthShell;

                let cx = 0.74;
                let cy = 0.50;
                let radius = Math.min(w, h) * 0.36;

                if (target) {
                    const r = target.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                        // The Earth canvas is square; sphere sits exactly at its center
                        // and fills the shorter side. Halo radius == half that side.
                        // Canvas already includes the 7% bleed, so the actual planet
                        // is ~93% of the canvas. Adjust radius accordingly.
                        const earthCx = r.left + r.width * 0.5;
                        const earthCy = r.top + r.height * 0.5;
                        cx = (earthCx - mountRect.left) / w;
                        cy = (earthCy - mountRect.top) / h;
                        // If we're measuring the canvas, the planet radius is 93% of half-width.
                        // If we fell back to the shell, the planet fills it 100%.
                        const bleedCompensation = earthCanvas ? (1 / 1.14) : 1.0;
                        radius = Math.min(r.width, r.height) * 0.5 * bleedCompensation;
                    }
                }

                haloUniforms.uCenterPx.value.set(cx * w, (1 - cy) * h);
                haloUniforms.uInnerPx.value = radius * TUNING.halo.innerScale;
                haloUniforms.uOuterPx.value = radius * TUNING.halo.outerScale;
                haloUniforms.uResolution.value.set(w, h);
            };

            // ── Resize ───────────────────────────────────────────────────────
            const resize = () => {
                const { clientWidth: w, clientHeight: h } = mount;
                renderer.setSize(w, h, false);
                camera.aspect = w / Math.max(h, 1);
                camera.updateProjectionMatrix();
                (comet.material as import('three').ShaderMaterial).uniforms.uResolution.value.set(w, h);
                placeHalo();
            };
            const observer = new ResizeObserver(resize);
            observer.observe(mount);
            const earthEl = document.querySelector(EARTH_SHELL_SELECTOR);
            if (earthEl) observer.observe(earthEl);
            resize();

            // The Earth canvas mounts asynchronously (lazy import + texture load),
            // so its initial bounds may not exist yet. Re-place once it appears.
            const mutationObserver = new MutationObserver(() => placeHalo());
            if (earthEl) {
                mutationObserver.observe(earthEl, { childList: true, subtree: true });
            }

            // ── Pointer parallax (no twinkle, no time-driven motion) ─────────
            const pointer = { x: 0, y: 0 };
            const target = { x: 0, y: 0 };
            const onPointerMove = (event: PointerEvent) => {
                if (reducedMotion) return;
                target.x = (event.clientX / window.innerWidth - 0.5) * 2;
                target.y = (event.clientY / window.innerHeight - 0.5) * 2;
            };
            window.addEventListener('pointermove', onPointerMove, { passive: true });

            // ── Animate ──────────────────────────────────────────────────────
            // Only thing animating: smooth parallax easing + occasional halo reposition
            // (in case Earth shell moves during expand/collapse transitions).
            let frame = 0;
            let recheckCounter = 0;
            const animate = () => {
                pointer.x += (target.x - pointer.x) * TUNING.parallax.easing;
                pointer.y += (target.y - pointer.y) * TUNING.parallax.easing;

                nebulaGroup.position.set(-pointer.x * TUNING.parallax.nebulaStrength, pointer.y * TUNING.parallax.nebulaStrength, 0);
                // Stars are 100% static — any sub-pixel motion makes anti-aliased
                // point sprites flicker pixel-to-pixel, which reads as twinkling.
                // Leave them locked in place; the nebula and halo carry the depth cue.
                haloGroup.position.set(-pointer.x * TUNING.parallax.haloStrength, pointer.y * TUNING.parallax.haloStrength, 0);

                // Re-place halo every ~10 frames — cheap and catches any CSS-driven
                // movement that ResizeObserver doesn't (e.g. transforms during expand).
                if (++recheckCounter >= 10) {
                    recheckCounter = 0;
                    placeHalo();
                }

                // Comet scheduling + per-frame uniforms.
                const nowSec = performance.now() / 1000;
                if (!cometState.active && nowSec >= cometState.nextSpawnAt && !reducedMotion) {
                    launchComet();
                }
                const cometMat = comet.material as import('three').ShaderMaterial;
                if (cometState.active) {
                    const elapsed = nowSec - cometState.startTime;
                    const progress = elapsed / TUNING.comet.durationSec;
                    if (progress >= 1) {
                        cometState.active = false;
                        cometMat.uniforms.uActive.value = 0;
                        scheduleNextComet(nowSec);
                    } else {
                        cometMat.uniforms.uActive.value = 1;
                        cometMat.uniforms.uProgress.value = progress;
                        cometMat.uniforms.uStart.value.set(cometState.startX, cometState.startY);
                        cometMat.uniforms.uEnd.value.set(cometState.endX, cometState.endY);
                    }
                } else {
                    cometMat.uniforms.uActive.value = 0;
                }

                renderer.render(scene, camera);
                frame = window.requestAnimationFrame(animate);
            };
            animate();

            cleanup = () => {
                window.cancelAnimationFrame(frame);
                window.removeEventListener('pointermove', onPointerMove);
                observer.disconnect();
                mutationObserver.disconnect();
                scene.traverse((object) => {
                    if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
                        object.geometry.dispose();
                        const m = object.material;
                        if (Array.isArray(m)) m.forEach((x) => x.dispose());
                        else m.dispose();
                    }
                });
                renderer.dispose();
                canvas.remove();
            };
        }).catch(() => {
            // Silent: if Three fails, backdrop simply doesn't render.
        });

        return () => {
            cancelled = true;
            cleanup?.();
        };
    }, []);

    return (
        <div
            ref={mountRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        />
    );
}

// ── Nebula ──────────────────────────────────────────────────────────────────
function buildNebula(THREE: typeof import('three')): import('three').Mesh {
    const geometry = new THREE.SphereGeometry(80, 48, 48);
    const material = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        transparent: true,
        uniforms: {
            uVoid: { value: new THREE.Color(TUNING.nebula.colorVoid) },
            uBase: { value: new THREE.Color(TUNING.nebula.colorBase) },
            uAccent: { value: new THREE.Color(TUNING.nebula.colorAccent) },
            uHighlight: { value: new THREE.Color(TUNING.nebula.colorHighlight) },
            uIntensity: { value: TUNING.nebula.cloudIntensity },
            uScale: { value: TUNING.nebula.noiseScale },
        },
        vertexShader: `
            varying vec3 vDir;
            void main() {
                vDir = normalize(position);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vDir;
            uniform vec3 uVoid;
            uniform vec3 uBase;
            uniform vec3 uAccent;
            uniform vec3 uHighlight;
            uniform float uIntensity;
            uniform float uScale;

            float hash(vec3 p) {
                p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
                p *= 17.0;
                return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
            }
            float vnoise(vec3 p) {
                vec3 i = floor(p);
                vec3 f = fract(p);
                f = f * f * (3.0 - 2.0 * f);
                return mix(
                    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
                    f.z);
            }
            float fbm(vec3 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.05; a *= 0.5; }
                return v;
            }
            void main() {
                vec3 d = normalize(vDir);
                float n1 = fbm(d * uScale);
                float n2 = fbm(d * uScale * 2.1 + vec3(0.0, 0.0, 5.0));
                float cloud = smoothstep(0.40, 0.78, n1);
                float core = smoothstep(0.55, 0.88, n1) * smoothstep(0.45, 0.85, n2);
                vec3 mid = mix(uBase, uAccent, smoothstep(0.3, 0.75, n2));
                vec3 nebColor = mix(mid, uHighlight, core * 0.7);
                vec3 col = mix(uVoid, nebColor, cloud * uIntensity);
                gl_FragColor = vec4(col, 1.0);
            }
        `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -10;
    return mesh;
}

// ── Static star layer (no twinkle, no animation) ────────────────────────────
type StarLayerOpts = {
    count: number;
    radius: number;
    sizeMin: number;
    sizeMax: number;
    toneMin: number;
    toneMax: number;
};
function buildStarLayer(THREE: typeof import('three'), opts: StarLayerOpts): import('three').Points {
    const positions = new Float32Array(opts.count * 3);
    const colors = new Float32Array(opts.count * 3);
    const sizes = new Float32Array(opts.count);

    for (let i = 0; i < opts.count; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * Math.PI * 2;
        const phi = Math.acos(2 * v - 1);
        const r = opts.radius * (0.85 + Math.random() * 0.3);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        const tone = opts.toneMin + Math.random() * (opts.toneMax - opts.toneMin);
        // Subtle cool tint
        colors[i * 3] = tone * (0.92 + Math.random() * 0.08);
        colors[i * 3 + 1] = tone * (0.95 + Math.random() * 0.05);
        colors[i * 3 + 2] = Math.min(1, tone * (1.0 + Math.random() * 0.05));

        sizes[i] = opts.sizeMin + Math.random() * (opts.sizeMax - opts.sizeMin);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        // NormalBlending (not additive) — overlapping stars don't compound into
        // bright spots, killing the "twinkling/glow" sensation entirely.
        blending: THREE.NormalBlending,
        uniforms: {
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2.0) },
        },
        vertexShader: `
            attribute vec3 aColor;
            attribute float aSize;
            uniform float uPixelRatio;
            varying vec3 vColor;
            void main() {
                vColor = aColor;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * 340.0 * uPixelRatio / max(-mv.z, 0.001);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                // Flat disc with a tiny anti-alias edge — no soft glow, no halo.
                vec2 uv = gl_PointCoord - vec2(0.5);
                float d = length(uv);
                float alpha = 1.0 - smoothstep(0.42, 0.5, d);
                if (alpha <= 0.0) discard;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
    });
    return new THREE.Points(geometry, material);
}

// ── Earth-tracking halo ─────────────────────────────────────────────────────
// A fullscreen quad in clip space. The shader receives Earth's pixel center
// and inner/outer radii (also in pixels). Falloff is a smooth ring that
// peaks at the inner radius and fades to zero at the outer.
function buildHalo(THREE: typeof import('three')): import('three').Mesh<import('three').PlaneGeometry, import('three').ShaderMaterial> {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uColor: { value: new THREE.Color(TUNING.halo.color) },
            uCenterPx: { value: new THREE.Vector2(0, 0) },
            uInnerPx: { value: 100 },
            uOuterPx: { value: 200 },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uIntensity: { value: TUNING.halo.intensity },
            uFalloff: { value: TUNING.halo.falloffPower },
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
            uniform vec3 uColor;
            uniform vec2 uCenterPx;
            uniform float uInnerPx;
            uniform float uOuterPx;
            uniform vec2 uResolution;
            uniform float uIntensity;
            uniform float uFalloff;
            void main() {
                vec2 fragPx = vUv * uResolution;
                float dist = distance(fragPx, uCenterPx);

                // Outside the outer radius: nothing.
                if (dist >= uOuterPx) discard;

                // Inside the planet disc: nothing (the Earth occupies this area).
                if (dist <= uInnerPx) discard;

                // Smooth ring fading from inner→outer.
                float t = (dist - uInnerPx) / (uOuterPx - uInnerPx);
                // Inverse power: brightest at the inner edge, soft fade outward.
                float falloff = pow(1.0 - t, uFalloff);
                float alpha = falloff * uIntensity;
                gl_FragColor = vec4(uColor, alpha);
            }
        `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -5;
    return mesh;
}

// ── Comet (rare streak across the canvas) ───────────────────────────────────
// Fullscreen quad. Shader computes the comet's head position along a line from
// uStart to uEnd, then shades pixels by distance-to-segment for the trail.
function buildComet(THREE: typeof import('three')): import('three').Mesh<import('three').PlaneGeometry, import('three').ShaderMaterial> {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uActive: { value: 0 },
            uProgress: { value: 0 },             // 0..1 along the trajectory
            uStart: { value: new THREE.Vector2(0, 0) },
            uEnd: { value: new THREE.Vector2(1, 1) },
            uResolution: { value: new THREE.Vector2(1, 1) },
            uColor: { value: new THREE.Color(TUNING.comet.color) },
            uHeadPx: { value: TUNING.comet.headSizePx },
            uTrailPx: { value: TUNING.comet.trailLengthPx },
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
            uniform vec3 uColor;
            uniform float uHeadPx;
            uniform float uTrailPx;

            // Distance from a 2D point to a finite line segment, in pixels.
            float distToSegment(vec2 p, vec2 a, vec2 b) {
                vec2 ab = b - a;
                float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
                vec2 closest = a + ab * t;
                return distance(p, closest);
            }

            void main() {
                if (uActive < 0.5) discard;

                vec2 fragPx = vUv * uResolution;
                // Note: shader UV.y goes 0 at bottom, 1 at top. Our uStart/uEnd
                // are screen-coords (0,0 top-left), so flip y when converting.
                vec2 startPx = vec2(uStart.x, 1.0 - uStart.y) * uResolution;
                vec2 endPx = vec2(uEnd.x, 1.0 - uEnd.y) * uResolution;

                // Comet head is the linearly-interpolated position at uProgress.
                vec2 headPx = mix(startPx, endPx, uProgress);
                // Tail tip trails behind the head, clamped to startPx so it
                // emerges from off-screen smoothly.
                vec2 fullDir = endPx - startPx;
                float fullLen = length(fullDir);
                vec2 dir = fullLen > 0.0 ? fullDir / fullLen : vec2(1.0, 0.0);
                vec2 tailPx = headPx - dir * min(uTrailPx, length(headPx - startPx));

                // Distance from fragment to the head (bright nucleus) and to the
                // tail segment (the fading trail).
                float headDist = distance(fragPx, headPx);
                float segDist = distToSegment(fragPx, tailPx, headPx);

                // Head: tight bright nucleus with soft glow.
                float headCore = exp(-headDist / uHeadPx);
                float headGlow = exp(-headDist / (uHeadPx * 4.0)) * 0.5;

                // Trail: thin streak. Width fades toward the tail tip.
                float along = clamp(dot(fragPx - tailPx, dir) / max(uTrailPx, 1.0), 0.0, 1.0);
                float trailWidth = mix(0.8, uHeadPx, along);
                float trailIntensity = exp(-segDist / trailWidth) * along * 0.85;

                // Global envelope: fade in fast, hold, fade out — keeps the
                // comet from "popping" at the start or hard-cutting at the end.
                float envelope = smoothstep(0.0, 0.08, uProgress) * smoothstep(1.0, 0.78, uProgress);

                float intensity = (headCore + headGlow + trailIntensity) * envelope;
                gl_FragColor = vec4(uColor, clamp(intensity, 0.0, 1.0));
            }
        `,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = -3;
    return mesh;
}
