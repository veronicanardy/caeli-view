/**
 * GLSL shaders for the Sun: animated photosphere (granulation + sunspots + fresnel limb) and a
 * soft corona shell whose alpha fades to nothing toward the rim.
 */

export const SUN_VERT = /* glsl */ `
    uniform float uTime;
    varying vec3 vPos;
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
        float t = uTime * 0.08;
        vec3 unit = normalize(position);
        float boil =
            sin(unit.x * 18.0 + t) * 0.007 +
            sin(unit.y * 23.0 - t * 1.4) * 0.005 +
            sin(unit.z * 29.0 + t * 0.7) * 0.004 +
            sin((unit.x + unit.z) * 14.0 + t * 1.1) * 0.003;
        vec3 displaced = position + normal * boil;
        vPos = displaced;
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
    }
`;

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
    float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
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
    float fbm(vec3 p) {
        float v = 0.0; float a = 0.5;
        for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.02; a *= 0.48; }
        return v;
    }
    // Célula de Voronoi simplificada — bordas das células de convecção.
    float voronoi(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        float minDist = 8.0;
        for (int x = -1; x <= 1; x++)
        for (int y = -1; y <= 1; y++)
        for (int z = -1; z <= 1; z++) {
            vec3 neighbor = vec3(float(x), float(y), float(z));
            vec3 point = neighbor + vec3(
                hash(i + neighbor),
                hash(i + neighbor + vec3(7.3, 0.0, 0.0)),
                hash(i + neighbor + vec3(0.0, 13.7, 0.0))
            );
            minDist = min(minDist, length(f - point));
        }
        return minDist;
    }

    void main() {
        vec3 p = normalize(vPos);
        float t = uTime * 0.10;

        // Granulação base via fbm
        float gran = fbm(p * 11.0 + vec3(t, t * 0.6, -t * 0.8));
        // Filamentos magnéticos de alta frequência
        float fil = fbm(p * 38.0 - vec3(t * 1.6, t * 0.9, t * 0.5));
        // Células de convecção via Voronoi — bordas escuras entre células brilhantes
        float cell = voronoi(p * 7.0 + vec3(t * 0.3, 0.0, t * 0.2));
        float cellEdge = smoothstep(0.0, 0.28, cell); // 0 = borda, 1 = centro da célula
        // Bandas de latitude (correntes de plasma)
        float latBand = sin((p.y + fbm(p * 1.8 + vec3(t * 0.2))) * 11.0 + t * 0.4) * 0.06;

        float n = gran * 0.38 + fil * 0.22 + cellEdge * 0.28 + latBand + 0.12;

        // Ramp de cor: laranja profundo → amarelo quente → branco quente
        vec3 deep    = vec3(0.72, 0.16, 0.02);
        vec3 mid     = vec3(1.00, 0.42, 0.05);
        vec3 hot     = vec3(1.00, 0.82, 0.38);
        vec3 whiteHot = vec3(1.00, 0.97, 0.82);
        vec3 col = mix(deep, mid, smoothstep(0.18, 0.50, n));
        col = mix(col, hot, smoothstep(0.46, 0.76, n));
        col = mix(col, whiteHot, smoothstep(0.74, 0.96, n));

        // Borda das células de convecção — intergranular lanes escuros
        col *= mix(0.55, 1.0, cellEdge);

        // Manchas solares — regiões frias e magnéticas
        float spotBase = fbm(p * 3.2 + vec3(9.0, 3.0, 13.0));
        float spotMask = smoothstep(0.74, 0.87, spotBase) * smoothstep(0.06, 0.50, abs(p.y));
        // Umbra (núcleo escuro) e penumbra (borda com filamentos)
        float umbra = smoothstep(0.80, 0.90, spotBase) * spotMask;
        float penumbra = spotMask - umbra;
        col *= mix(1.0, 0.28, umbra);
        col *= mix(1.0, 0.60, penumbra);
        // Filamentos na penumbra
        col += penumbra * fil * 0.15 * vec3(1.0, 0.55, 0.15);

        // Faixas magnéticas brilhantes (plages)
        float plage = smoothstep(0.72, 0.92, fil) * (1.0 - spotMask) * 0.28;
        col += plage * vec3(1.0, 0.68, 0.28);

        // Limb darkening físico — bordas mais frias que o centro
        float cosTheta = max(dot(normalize(vNormal), normalize(vView)), 0.0);
        float limbDark = 1.0 - 0.6 * (1.0 - sqrt(max(cosTheta, 0.0)));
        col *= limbDark;

        // Rim glow coronal suave nas bordas
        float fres = pow(1.0 - cosTheta, 3.2);
        col += fres * vec3(1.0, 0.55, 0.18) * 0.35;

        gl_FragColor = vec4(col, 1.0);
    }
`;

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

export const SUN_GLOW_FRAG = /* glsl */ `
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vView;

    void main() {
        float cosA = max(dot(normalize(vNormal), normalize(vView)), 0.0);
        // rim = 0 no centro, 1 na borda
        float rim = 1.0 - cosA;

        // Fade suave: cresce rápido na borda, some completamente no centro e na extremidade
        // pow alto = fade concentrado na borda; smoothstep duplo = sem artefato de borda dura
        float inner = smoothstep(0.0, 0.4, rim);   // evita glow no centro
        float outer = smoothstep(1.0, 0.55, rim);  // fade suave para zero na extremidade
        float fade = inner * outer;

        // Intensidade principal com queda exponencial suave
        float alpha = pow(rim, 2.2) * fade * 0.55;

        // Raios coronais sutis — modulam levemente sem criar pixelação
        vec3 n = normalize(vNormal);
        float angle = atan(n.y, n.x);
        float rays = 0.78 + 0.22 * (
            sin(angle * 7.0)  * 0.5 +
            sin(angle * 13.0 + 1.1) * 0.3 +
            sin(angle * 23.0 - 0.8) * 0.2
        );
        // Raios só aparecem perto da borda onde o fade é alto
        alpha *= mix(1.0, rays, smoothstep(0.3, 0.85, rim) * 0.4);

        // Cor: laranja intenso perto da superfície, dourado pálido na corona exterior
        vec3 innerCol = vec3(1.0, 0.45, 0.10);
        vec3 outerCol = vec3(1.0, 0.82, 0.45);
        vec3 col = mix(innerCol, outerCol, smoothstep(0.3, 0.9, rim));

        gl_FragColor = vec4(col, alpha);
    }
`;
