/**
 * Shaders GLSL da superfície de Júpiter.
 *
 * Júpiter não tem superfície sólida — a textura mostra bandas de nuvens (amônia e água)
 * na troposfera superior. A atmosfera é espessa o suficiente para suavizar o terminador
 * dia/noite de forma perceptível, mas menos que Vênus porque Júpiter gira rapidamente
 * (menos de 10 h) e as bandas zonais dominam a aparência visual.
 *
 * Peculiaridades físicas incorporadas no shader:
 *   - Terminador suavizado: smoothstep -0.10 a 0.28 — mais suave que Marte, menos que Vênus.
 *   - Lado noturno não é totalmente negro: albedo interno de calor (Júpiter emite ~1.7×
 *     mais energia do que recebe do Sol) levanta o piso do noturno para 0.18.
 *   - Limb glow esfumado em azul-cinza frio: espalhamento Rayleigh na atmosfera profunda
 *     de H₂/He vista de tangente.
 *   - Brilho diurno calibrado para a irradiância em 5.2 AU: Júpiter recebe ~3.7% da
 *     irradiância solar da Terra — superficie mais fria e escura que os planetas internos.
 *
 * Não há conversão manual de sRGB — a textura é carregada como `srgb`.
 */

export const JUPITER_VERT = /* glsl */ `
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

export const JUPITER_FRAG = /* glsl */ `
    uniform sampler2D surfaceMap;
    uniform vec3 sunDir;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);

        float lambert = dot(normal, sun);

        // Atmosfera densa de H₂/He → terminador levemente suavizado, mais amplo que Marte.
        float dayAmount = smoothstep(-0.10, 0.28, lambert);

        vec3 surfColor = texture2D(surfaceMap, vUv).rgb;

        // Lado diurno: Júpiter a 5.2 AU recebe pouca luz solar — calibrado mais frio/escuro
        // que os planetas internos (piso 0.38 + ganho 0.72, máx ~1.10).
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = surfColor * (0.38 + 0.72 * pow(lit, 0.85));

        // Lado noturno: piso elevado (0.18) — Júpiter irradia calor interno residual da
        // contração gravitacional, tornando o lado noturno levemente mais visível.
        vec3 nightLit = surfColor * 0.18;

        vec3 color = mix(nightLit, dayLit, dayAmount);

        // Limb: halo azul-cinza frio — espalhamento Rayleigh em H₂/He visto de tangente.
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.60, viewFacing);

        // Borda tingida com azul-acinzentado suave — mais frio que o laranja/bege das bandas.
        vec3 limbColor = mix(vec3(0.30, 0.35, 0.45), color, limb);
        color = limbColor;

        color *= mix(0.30, 1.0, limb);

        gl_FragColor = vec4(color, 1.0);
    }
`;
