/**
 * Shaders GLSL da superfície de Saturno.
 *
 * Saturno não tem superfície sólida — a textura mostra bandas de nuvens de amônia
 * na troposfera superior, mais apagadas e largas que as de Júpiter. A atmosfera é
 * espessa de H₂/He, suavizando o terminador, mas menos que Vênus.
 *
 * Peculiaridades físicas incorporadas no shader:
 *   - Terminador suavizado: smoothstep -0.08 a 0.26 — similar a Júpiter, ligeiramente
 *     mais abrupto (menor albedo interno, bandas zonais menos pronunciadas).
 *   - Lado noturno elevado (0.14): Saturno emite ~1.78× mais calor do que recebe
 *     do Sol (contração gravitacional), levantando o piso noturno acima de zero.
 *   - Irradiância calibrada para 9.54 AU: recebe ~1.1% da irradiância solar da Terra.
 *     Brilho diurno mais frio/fraco que Júpiter (piso 0.30 + ganho 0.62, máx ~0.92).
 *   - Limb dourado-ocre: espalhamento na atmosfera de H₂ tinge a borda com o amarelo
 *     pálido característico de Saturno — distinguível do azul-cinza de Júpiter.
 *
 * Não há conversão manual de sRGB — a textura é carregada como `srgb`.
 */

export const SATURN_VERT = /* glsl */ `
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

export const SATURN_FRAG = /* glsl */ `
    uniform sampler2D surfaceMap;
    uniform vec3 sunDir;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);

        float lambert = dot(normal, sun);

        // Atmosfera densa de H₂/He → terminador suavizado, similar a Júpiter.
        float dayAmount = smoothstep(-0.08, 0.26, lambert);

        vec3 surfColor = texture2D(surfaceMap, vUv).rgb;

        // Lado diurno: Saturno a 9.54 AU recebe ~1.1% da irradiância da Terra.
        // Mais frio e escuro que Júpiter — piso e ganho calibrados abaixo.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = surfColor * (0.30 + 0.62 * pow(lit, 0.90));

        // Lado noturno: piso elevado (0.14) — Saturno irradia calor interno residual.
        vec3 nightLit = surfColor * 0.14;

        vec3 color = mix(nightLit, dayLit, dayAmount);

        // Limb: halo dourado-ocre — espalhamento em H₂ tinge a borda com o amarelo
        // pálido característico de Saturno (distinto do azul-cinza de Júpiter).
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.62, viewFacing);

        vec3 limbColor = mix(vec3(0.55, 0.48, 0.30), color, limb);
        color = limbColor;

        color *= mix(0.28, 1.0, limb);

        gl_FragColor = vec4(color, 1.0);
    }
`;
