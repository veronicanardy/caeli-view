/**
 * GLSL shaders for the Earth surface (day/night with sun-driven terminator + city lights) and the
 * cloud shell (greyscale map drives both brightness and opacity; clouds vanish on the night side).
 *
 * sRGB note: Earth's day and night maps are loaded as RAW (no THREE.SRGBColorSpace), and the shader
 * itself converts sRGB → linear for shading and back to sRGB on output. Doing the conversion by
 * hand is what stops the day side from rendering near-black; tagging the textures as sRGB would
 * cause a double-decode.
 */

/** Earth vertex shader: passes world-space normal to the fragment for honest lambertian lighting. */
export const EARTH_VERT = /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

/**
 * Earth fragment shader: day/night blend driven by dot(worldNormal, sunDir).
 * - Tight ±0.05 terminator: matches the real ~0.5° solar penumbra at Earth's distance.
 * - City-lights mask: night map appears only on the dark hemisphere (multiplied by 1 - dayAmount).
 * - Ambient floor on the day side keeps the lit hemisphere readable when the Sun grazes the limb.
 */
export const EARTH_FRAG = /* glsl */ `
    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform vec3 sunDir;
    varying vec2 vUv;
    varying vec3 vWorldNormal;

    vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
    vec3 toSRGB(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

    void main() {
        float lambert = dot(normalize(vWorldNormal), normalize(sunDir));
        float dayAmount = smoothstep(-0.05, 0.05, lambert);

        vec3 dayColor = toLinear(texture2D(dayMap, vUv).rgb);
        vec3 nightTex = toLinear(texture2D(nightMap, vUv).rgb);

        // Day side: bright daylight with a higher ambient floor; gentle gamma on lambert keeps the
        // terminator soft.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = dayColor * (0.62 + 0.95 * pow(lit, 0.7));

        // Night side: very dim base + city lights, only on the dark hemisphere.
        vec3 cityLights = nightTex * (1.0 - dayAmount) * 1.2;
        vec3 nightLit = dayColor * 0.025 + cityLights;

        vec3 color = mix(nightLit, dayLit, dayAmount);
        gl_FragColor = vec4(toSRGB(color), 1.0);
    }
`;

/**
 * Cloud shell fragment shader. The greyscale cloud map's brightness is BOTH the cloud color and
 * its opacity, so the sky-areas of the map render fully transparent. Clouds are lit by the same
 * sun dot as the surface and fade out on the night side so they never glow in the dark.
 */
export const CLOUDS_FRAG = /* glsl */ `
    uniform sampler2D cloudMap;
    uniform vec3 sunDir;
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    void main() {
        float c = texture2D(cloudMap, vUv).r;          // cloud density 0..1
        float lambert = dot(normalize(vWorldNormal), normalize(sunDir));
        float dayAmount = smoothstep(-0.05, 0.3, lambert);
        float light = 0.15 + 0.9 * clamp(lambert, 0.0, 1.0);
        float alpha = c * dayAmount * 0.85;            // transparent where no cloud / on night side
        gl_FragColor = vec4(vec3(light), alpha);
    }
`;
