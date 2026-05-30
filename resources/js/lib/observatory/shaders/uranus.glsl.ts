/**
 * Shaders GLSL da superfície de Urano.
 *
 * Urano é um gigante de gelo — a atmosfera é H₂/He com cerca de 2,3% de metano,
 * que absorve comprimentos de onda vermelhos e dá ao planeta sua cor ciano-azulada
 * característica. A textura mostra a aparência homogênea da atmosfera superior,
 * notavelmente sem bandas visíveis (ao contrário de Júpiter/Saturno).
 *
 * Peculiaridades físicas incorporadas no shader:
 *   - Terminador suavizado: smoothstep -0.10 a 0.30 — atmosfera espessa de H₂/He/CH₄
 *     difunde amplamente a luz, similar a Júpiter mas com albedo de Bond maior (0.300).
 *   - Lado noturno levemente elevado (0.08): Urano quase não irradia calor interno
 *     (único gigante sem excesso de calor detectável) — piso baixo, mas não zero.
 *   - Irradiância calibrada para 19.2 AU: recebe ~0.27% da irradiância solar da Terra.
 *     Muito mais frio que Saturno — piso 0.18 + ganho 0.50, máx ~0.68.
 *   - Limb ciano-azulado: espalhamento de metano nas bordas — marca registrada de Urano,
 *     distinto do dourado-ocre de Saturno e do azul-cinza de Júpiter.
 *
 * Não há conversão manual de sRGB — a textura é carregada como `srgb`.
 */

export const URANUS_VERT = /* glsl */ `
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

export const URANUS_FRAG = /* glsl */ `
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
        float dayAmount = smoothstep(-0.10, 0.30, lambert);

        vec3 surfColor = texture2D(surfaceMap, vUv).rgb;

        // Lado diurno: Urano a 19.2 AU recebe ~0.27% da irradiância da Terra.
        // Muito mais frio que Saturno — piso e ganho reduzidos.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = surfColor * (0.18 + 0.50 * pow(lit, 0.85));

        // Lado noturno: Urano não irradia calor interno detectável — piso mínimo.
        vec3 nightLit = surfColor * 0.08;

        vec3 color = mix(nightLit, dayLit, dayAmount);

        // Limb: halo ciano-azulado — metano atmosférico absorve vermelho nas bordas,
        // intensificando a cor ciano característica de Urano.
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.60, viewFacing);

        vec3 limbColor = mix(vec3(0.30, 0.68, 0.72), color, limb);
        color = limbColor;

        color *= mix(0.22, 1.0, limb);

        gl_FragColor = vec4(color, 1.0);
    }
`;
