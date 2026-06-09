/**
 * Shaders GLSL da superfície de Plutão.
 *
 * Plutão é um planeta anão com superfície de nitrogênio, metano e monóxido de carbono
 * congelados. As imagens da New Horizons (2015) revelaram um mundo surpreendentemente
 * variado: o coração de Tombaugh (Sputnik Planitia) de nitrogênio brilhante, campos de
 * montanhas de água gelada e regiões escuras cobertas de tholins avermelhados.
 *
 * Peculiaridades físicas incorporadas no shader:
 *   - Superfície direta (sem atmosfera densa para suavizar o terminador): transição
 *     mais abrupta que os gigantes de gelo, parecida com Marte.
 *   - Irradiância calibrada para ~39.5 AU: recebe ~0.065% da irradiância da Terra.
 *     O mais frio e escuro do sistema solar visível — piso 0.10 + ganho 0.36.
 *   - Lado noturno muito escuro (0.06): sem calor interno significativo e sem atmosfera
 *     para reter energia — contraste dia/noite mais pronunciado que qualquer planeta.
 *   - Limb bege-frio: nitrogênio e metano congelados nas bordas dão tom levemente
 *     acinzentado, sem o ciano dos gigantes de gelo.
 *
 * Não há conversão manual de sRGB — a textura é carregada como `srgb`.
 */

export const PLUTO_VERT = /* glsl */ `
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

export const PLUTO_FRAG = /* glsl */ `
    uniform sampler2D surfaceMap;
    uniform vec3 sunDir;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);

        float lambert = dot(normal, sun);

        // Terminador mais abrupto que gigantes de gelo — sem atmosfera densa
        // para suavizar a transição dia/noite.
        float dayAmount = smoothstep(-0.08, 0.30, lambert);

        vec3 surfColor = texture2D(surfaceMap, vUv).rgb;

        // Plutão a ~39.5 AU recebe ~0.065% da irradiância da Terra.
        // Piso mínimo e ganho contido para preservar o caráter frio e distante.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = surfColor * (0.10 + 0.36 * pow(lit, 0.85));

        // Lado noturno quase negro — sem calor interno (diferente de Netuno)
        // e sem atmosfera para redistribuir energia.
        vec3 nightLit = surfColor * 0.06;

        vec3 color = mix(nightLit, dayLit, dayAmount);

        // Limb: bege-acinzentado frio — nitrogênio e metano congelados nas bordas,
        // sem a saturação azul dos gigantes de gelo.
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.55, viewFacing);

        vec3 limbColor = mix(vec3(0.55, 0.50, 0.44), color, limb);
        color = limbColor;

        color *= mix(0.18, 1.0, limb);

        gl_FragColor = vec4(color, 1.0);
    }
`;
