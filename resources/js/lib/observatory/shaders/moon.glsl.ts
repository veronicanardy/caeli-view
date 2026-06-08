export const MOON_VERT = /* glsl */ `
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

export const MOON_FRAG = /* glsl */ `
    uniform sampler2D surfaceMap;
    uniform vec3 sunDir;
    uniform vec3 earthDir;
    uniform float phaseFraction;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
    vec3 toSRGB(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);
        vec3 earth = normalize(earthDir);

        vec3 albedo = toLinear(texture2D(surfaceMap, vUv).rgb);

        float lambert = dot(normal, sun);
        float lit = clamp(lambert, 0.0, 1.0);
        float dayAmount = smoothstep(-0.10, 0.42, lambert);
        vec3 dayColor = albedo * (0.05 + 1.22 * pow(lit, 0.9));

        float earthFacing = max(dot(normal, earth), 0.0);
        float nightAmount = 1.0 - dayAmount;
        float earthshine = nightAmount * pow(earthFacing, 1.3) * mix(0.018, 0.06, 1.0 - clamp(phaseFraction, 0.0, 1.0));
        vec3 nightColor = albedo * (0.008 + earthshine) + vec3(0.002, 0.003, 0.005);

        vec3 color = mix(nightColor, dayColor, dayAmount);

        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.02, 0.9, viewFacing);
        color *= mix(0.48, 1.0, limb);

        gl_FragColor = vec4(toSRGB(color), 1.0);
    }
`;
