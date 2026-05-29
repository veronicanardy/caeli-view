/**
 * Shaders GLSL da superfície de Vênus.
 *
 * Vênus é coberto por nuvens densas de ácido sulfúrico — a superfície real nunca
 * é visível. O shader simula o topo da camada de nuvens com iluminação lambertiana
 * e um halo atmosférico espesso na borda (limb glow) em âmbar/laranja pálido.
 *
 * A inclinação axial de Vênus é 177.36° (rotação retrógrada), mas para a textura
 * de nuvens isso é apenas visual — o sentido de rotação é o oposto ao padrão.
 *
 * A textura é carregada como `srgb`, NÃO se faz conversão manual.
 */

export const VENUS_VERT = /* glsl */ `
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

export const VENUS_FRAG = /* glsl */ `
    uniform sampler2D surfaceMap;
    uniform vec3 sunDir;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);

        float lambert = dot(normal, sun);

        // Terminador mais suave que Mercúrio: a atmosfera densa de Vênus difunde a luz
        // pelo lado noturno, alargando a transição dia/noite.
        float dayAmount = smoothstep(-0.25, 0.35, lambert);

        vec3 cloudColor = texture2D(surfaceMap, vUv).rgb;

        // Lado diurno: albedo alto mas sem estourar — piso + ganho reduzidos.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = cloudColor * (0.55 + 0.65 * pow(lit, 0.75));

        // Lado noturno: escuro mas não preto — difusão atmosférica retém alguma luz.
        vec3 nightLit = cloudColor * 0.28;

        vec3 color = mix(nightLit, dayLit, dayAmount);

        // Limb glow: atmosfera densa cria anel âmbar/alaranjado visível na borda.
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.70, viewFacing);

        // Tinge a borda com âmbar suave (simula espalhamento atmosférico).
        vec3 limbColor = mix(vec3(0.72, 0.55, 0.22), color, limb);
        color = limbColor;

        color *= mix(0.45, 1.0, limb);

        gl_FragColor = vec4(color, 1.0);
    }
`;
