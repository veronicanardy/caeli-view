/**
 * Shaders GLSL da superfície de Mercúrio.
 *
 * A iluminação é calculada por dot(worldNormal, sunDir), onde sunDir é passado
 * como uniform e aponta de Mercúrio para o Sol no espaço de mundo da cena.
 * Isso garante que o terminador dia/noite seja fisicamente coerente com o Sol
 * visível na cena — a mesma abordagem usada pela Terra.
 *
 * Mercúrio não tem atmosfera nem luzes urbanas, então o shader é mais simples:
 * apenas mapa diurno com iluminação lambertiana e escurecimento de borda (limb).
 *
 * A textura é carregada como `srgb`, então NÃO se faz conversão manual —
 * evita double-decode.
 */

export const MERCURY_VERT = /* glsl */ `
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
`;

export const MERCURY_FRAG = /* glsl */ `
    uniform sampler2D surfaceMap;
    uniform vec3 sunDir;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);

        float lambert = dot(normal, sun);

        // Terminador suavizado: -0.08 a +0.20 (transição mais estreita que a Terra —
        // sem atmosfera, a sombra é mais abrupta na realidade).
        float dayAmount = smoothstep(-0.08, 0.20, lambert);

        vec3 surfaceColor = texture2D(surfaceMap, vUv).rgb;

        // Lado diurno: iluminação lambertiana com piso elevado para não escurecer demais.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = surfaceColor * (0.7 + 1.20 * pow(lit, 0.72));

        // Lado noturno: leve reflexo ambiente (sem atmosfera, mas não pitch black).
        vec3 nightLit = surfaceColor * 0.2;

        vec3 color = mix(nightLit, dayLit, dayAmount);

        // Escurecimento de borda suave para dar volume sem escurecer demais.
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.80, viewFacing);

        color *= mix(0.55, 1.0, limb);

        gl_FragColor = vec4(color, 1.0);
    }
`;
