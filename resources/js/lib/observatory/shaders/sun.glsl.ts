/**
 * GLSL shaders for the Sun: animated photosphere (granulation + sunspots + fresnel limb) and a
 * soft corona shell whose alpha fades to nothing toward the rim.
 *
 * The /* glsl */ /* comment-marker on each template literal is what the GLSL Language Server and
 * VS Code's WebGL GLSL extensions look for to enable syntax highlighting and validation.
 */

/** Photosphere vertex shader: gentle "boil" displacement driven by uTime + Perlin-ish sine sum. */
export const SUN_VERT = /* glsl */ `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
        float t = uTime * 0.08;
        vec3 unit = normalize(position);
        float boil =
            sin(unit.x * 18.0 + t) * 0.006 +
            sin(unit.y * 23.0 - t * 1.4) * 0.004 +
            sin(unit.z * 29.0 + t * 0.7) * 0.003;
        vec3 displaced = position + normal * boil;
        vPos = displaced;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
    }
`;

/** Photosphere fragment shader: fbm noise → orange-to-yellow ramp + sunspots + fresnel rim. */
export const SUN_FRAG = /* glsl */ `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec3 vView;

    float hash(vec3 p) {
        p = fract(p * 0.3183099 + 0.1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
    }
    float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    }
    // Fractal brownian motion: several octaves of noise summed → rich, organic granulation.
    float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
            v += a * noise(p);
            p *= 2.02;
            a *= 0.5;
        }
        return v;
    }
    void main() {
        vec3 p = normalize(vPos);
        float t = uTime * 0.12;

        float latBand = sin((p.y + fbm(p * 2.0)) * 9.0 + t * 0.5) * 0.08;
        float gran = fbm(p * 12.0 + vec3(t, t * 0.6, -t));
        float fil = fbm(p * 34.0 - vec3(t * 1.4, t, t * 0.5));
        float cells = abs(gran - 0.5) * 2.0;
        float n = gran * 0.48 + fil * 0.34 + cells * 0.16 + latBand;

        // Color ramp: deep orange troughs → bright yellow-white peaks.
        vec3 deep = vec3(0.78, 0.22, 0.035);
        vec3 mid  = vec3(1.0, 0.48, 0.08);
        vec3 hot  = vec3(1.0, 0.9, 0.58);
        vec3 whiteHot = vec3(1.0, 0.98, 0.86);
        vec3 col = mix(deep, mid, smoothstep(0.22, 0.52, n));
        col = mix(col, hot, smoothstep(0.48, 0.78, n));
        col = mix(col, whiteHot, smoothstep(0.78, 0.96, n));

        // Sunspots: sparse dark cooler patches from a low-frequency noise threshold.
        float spotField = fbm(p * 3.4 + vec3(9.0, 3.0, 13.0));
        float spotMask = smoothstep(0.76, 0.86, spotField) * smoothstep(0.08, 0.55, abs(p.y));
        col *= mix(1.0, 0.36, spotMask);

        // Subtle magnetic lanes.
        float lanes = smoothstep(0.66, 0.95, fil) * 0.22;
        col += lanes * vec3(1.0, 0.55, 0.18);

        // Fresnel limb brightening for a glowing edge.
        float fres = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 2.5);
        col += fres * vec3(1.0, 0.62, 0.24) * 0.42;

        gl_FragColor = vec4(col, 1.0);
    }
`;

/** Corona shell vertex shader: trivial pass-through, just exposes view-space normal/view vectors. */
export const SUN_GLOW_VERT = /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
    }
`;

/**
 * Corona shell fragment shader: back-facing sphere whose alpha falls off smoothly toward the rim
 * (fresnel), so the halo fades to nothing instead of being a hard translucent disc that smears
 * across the screen when the Sun sits off-frame.
 */
export const SUN_GLOW_FRAG = /* glsl */ `
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
        float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vView)), 0.0), 3.8);
        float coreFade = smoothstep(0.12, 0.95, rim);
        float alpha = coreFade * 0.24;
        vec3 col = mix(uColor, vec3(1.0, 0.86, 0.55), rim);
        gl_FragColor = vec4(col, alpha);
    }
`;
