/**
 * Shaders GLSL da superfície de Netuno.
 *
 * Netuno é um gigante de gelo similar a Urano — atmosfera de H₂/He com ~2% de metano,
 * mas aparece num azul mais profundo e intenso que Urano. A diferença de cor (Netuno mais
 * azul que Urano) ainda não é completamente explicada — provavelmente há um cromóforo
 * adicional ainda não identificado além do metano.
 *
 * Peculiaridades físicas incorporadas no shader:
 *   - Terminador suavizado: smoothstep -0.12 a 0.32 — atmosfera de H₂/He/CH₄ similar a
 *     Urano, mas Netuno tem vento mais vigoroso (2100 km/h — o mais forte do SS), criando
 *     gradiente de temperatura ligeiramente diferente no terminador.
 *   - Lado noturno levemente elevado (0.10): Netuno emite ~2.6× mais calor do que recebe
 *     do Sol (calor interno residual — ao contrário de Urano, que tem quase nenhum).
 *   - Irradiância calibrada para 30.1 AU: recebe ~0.11% da irradiância solar da Terra.
 *     O mais frio e escuro dos planetas — piso 0.14 + ganho 0.44, máx ~0.58.
 *   - Limb azul-profundo: metano absorve vermelho + eventual cromóforo adicional → azul
 *     mais saturado que Urano nas bordas; distinto visualmente do ciano mais pálido.
 *
 * Não há conversão manual de sRGB — a textura é carregada como `srgb`.
 */

export const NEPTUNE_VERT = /* glsl */ `
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

export const NEPTUNE_FRAG = /* glsl */ `
    uniform sampler2D surfaceMap;
    uniform vec3 sunDir;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);

        float lambert = dot(normal, sun);

        // Atmosfera espessa de H₂/He/CH₄ → terminador suavizado.
        // Transição ligeiramente mais ampla que Urano — ventos vigorosos redistribuem calor.
        float dayAmount = smoothstep(-0.12, 0.32, lambert);

        vec3 surfColor = texture2D(surfaceMap, vUv).rgb;

        // Lado diurno: Netuno a 30.1 AU recebe ~0.11% da irradiância da Terra.
        // O mais escuro de todos os planetas — piso e ganho mínimos.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = surfColor * (0.14 + 0.44 * pow(lit, 0.80));

        // Lado noturno: Netuno irradia 2.6× mais calor do que recebe — piso elevado
        // em relação a Urano (0.08), refletindo o calor interno residual detectável.
        vec3 nightLit = surfColor * 0.10;

        vec3 color = mix(nightLit, dayLit, dayAmount);

        // Limb: halo azul-profundo — metano + cromóforo adicional absorvem vermelho
        // nas bordas de forma mais intensa que Urano, dando azul mais saturado.
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.58, viewFacing);

        vec3 limbColor = mix(vec3(0.18, 0.38, 0.75), color, limb);
        color = limbColor;

        color *= mix(0.20, 1.0, limb);

        gl_FragColor = vec4(color, 1.0);
    }
`;
