/**
 * Shaders GLSL da superfície da Terra e da camada de nuvens.
 *
 * A superfície mistura mapa diurno, mapa noturno e luzes urbanas usando a direção
 * do Sol para definir o terminador entre dia e noite.
 *
 * A camada de nuvens usa um mapa em tons de cinza para controlar brilho e
 * opacidade. As nuvens desaparecem gradualmente no lado noturno para evitar que
 * pareçam brilhar no escuro.
 *
 * Observação sobre sRGB:
 * os mapas diurno e noturno da Terra são carregados como RAW, sem
 * THREE.SRGBColorSpace. O próprio shader faz a conversão sRGB → linear para
 * calcular a iluminação e depois converte de volta para sRGB na saída.
 *
 * Isso evita que o lado diurno fique escuro demais. Se as texturas fossem
 * marcadas como sRGB e o shader também fizesse a conversão manual, ocorreria
 * double-decode.
 */

/**
 * Vertex shader da Terra.
 *
 * Envia para o fragment shader:
 * - UV da textura;
 * - normal em espaço de mundo;
 * - posição do vértice em espaço de mundo.
 *
 * A posição em espaço de mundo permite calcular a direção da câmera no fragment
 * shader e aplicar escurecimento suave nas laterais do globo.
 */
export const EARTH_VERT = /* glsl */ `
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

/**
 * Fragment shader da superfície da Terra.
 *
 * Responsabilidades:
 * - calcular o lado diurno/noturno usando dot(worldNormal, sunDir);
 * - suavizar o terminador entre dia e noite;
 * - exibir luzes urbanas principalmente no hemisfério escuro;
 * - manter um piso mínimo de iluminação no lado diurno;
 * - escurecer suavemente as laterais da esfera para dar mais volume;
 * - adicionar uma borda atmosférica azul discreta.
 */
export const EARTH_FRAG = /* glsl */ `
    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform vec3 sunDir;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    vec3 toLinear(vec3 c) { return pow(c, vec3(2.2)); }
    vec3 toSRGB(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);

        float lambert = dot(normal, sun);

        // O lado diurno começa mais tarde e a transição fica mais longa.
        // Isso faz o lado escuro "tomar" mais da Terra e evita corte duro.
        float dayAmount = smoothstep(0.04, 0.30, lambert);

        vec3 dayColor = toLinear(texture2D(dayMap, vUv).rgb);
        vec3 nightTex = toLinear(texture2D(nightMap, vUv).rgb);

        // Lado diurno: mantém leitura, mas sem estourar demais.
        float lit = clamp(lambert, 0.0, 1.0);
        vec3 dayLit = dayColor * (0.48 + 0.95 * pow(lit, 0.78));

        // Lado noturno: permanece por mais área e some de forma mais gradual.
        float nightAmount = 1.0 - smoothstep(-0.04, 0.22, lambert);
        vec3 cityLights = nightTex * nightAmount * 1.18;
        vec3 nightLit = dayColor * 0.012 + cityLights;

        vec3 color = mix(nightLit, dayLit, dayAmount);

        // Escurecimento lateral sem adicionar brilho.
        // Isso dá volume, mas não cria aura azul na borda.
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.82, viewFacing);

        color *= mix(0.42, 1.0, limb);

        gl_FragColor = vec4(toSRGB(color), 1.0);
    }
`;

/**
 * Fragment shader da camada de nuvens.
 *
 * O mapa de nuvens em tons de cinza controla tanto a cor quanto a opacidade:
 * - regiões escuras do mapa ficam transparentes;
 * - regiões claras aparecem como nuvens.
 *
 * As nuvens usam a mesma direção do Sol da superfície. Elas ficam mais visíveis
 * no lado diurno e desaparecem gradualmente no lado noturno para não parecerem
 * iluminadas artificialmente.
 *
 * Também há um esmaecimento leve nas laterais para acompanhar o volume da Terra.
 */
export const CLOUDS_FRAG = /* glsl */ `
    uniform sampler2D cloudMap;
    uniform vec3 sunDir;

    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 sun = normalize(sunDir);

        float cloudDensity = texture2D(cloudMap, vUv).r;
        float lambert = dot(normal, sun);

        // A nuvem continua existindo no planeta todo.
        // A iluminação muda com o Sol, mas ela não desaparece no lado noturno.
        float light = 0.22 + 0.78 * clamp(lambert, 0.0, 1.0);

        // Esmaecimento leve nas laterais da esfera.
        vec3 viewDir = normalize(cameraPosition - vWorldPosition);
        float viewFacing = max(dot(normal, viewDir), 0.0);
        float limb = smoothstep(0.0, 0.72, viewFacing);

        // Alpha não depende mais do lado diurno.
        float alpha = cloudDensity * 0.72 * mix(0.36, 1.0, limb);

        gl_FragColor = vec4(vec3(light), alpha);
    }
`;
