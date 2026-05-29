/**
 * Shaders GLSL da superfície de Marte.
 *
 * Marte tem atmosfera muito tênue (CO₂, ~0.6% da pressão terrestre), então o terminador
 * dia/noite é abrupto — mais duro que Vênus, ligeiramente mais suave que Mercúrio.
 * A superfície avermelhada de óxido de ferro domina; o shader enfatiza o tom ferrugem.
 *
 * Não há conversão manual de sRGB — a textura é carregada como `srgb`.
 */

export const MARS_VERT = /* glsl */ `
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

export const MARS_FRAG = /* glsl */ `
    uniform sampler2D surfaceMap;
    uniform vec3 sunDir;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);

        float lambert = dot(normal, sun);

        // Atmosfera tênue → terminador mais duro que Vênus, levemente suavizado vs Mercúrio.
        float dayAmount = smoothstep(-0.08, 0.20, lambert);

        vec3 surfColor = texture2D(surfaceMap, vUv).rgb;

        // Lado diurno: ferrugem avermelhada sob luz solar intensa.
        // Marte recebe ~43% da irradiância solar da Terra (distância ~1.52 AU).
        // Piso mais alto que Mercúrio pois a névoa atmosférica difunde alguma luz.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = surfColor * (0.45 + 0.80 * pow(lit, 0.80));

        // Lado noturno: muito escuro — atmosfera fina não retém calor nem luz.
        vec3 nightLit = surfColor * 0.10;

        vec3 color = mix(nightLit, dayLit, dayAmount);

        // Limb: halo avermelhado/rosado muito sutil — atmosfera fina mas perceptível.
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.65, viewFacing);

        // Tinge a borda com vermelho-rosado que simula o espalhamento da poeira marciana.
        vec3 limbColor = mix(vec3(0.55, 0.25, 0.18), color, limb);
        color = limbColor;

        color *= mix(0.35, 1.0, limb);

        gl_FragColor = vec4(color, 1.0);
    }
`;
