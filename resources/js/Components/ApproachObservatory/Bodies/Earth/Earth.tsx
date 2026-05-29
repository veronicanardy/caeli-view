import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { orientEarth } from '@/lib/observatory/earthOrientation';
import { CLOUDS_FRAG, EARTH_FRAG, EARTH_VERT } from '@/lib/observatory/shaders/earth.glsl';
import { EARTH_HITBOX_DL, EARTH_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { ScreenLabel } from '../../Overlays/SceneLabels';

const CLOUD_LAYER_SCALE = 1.012;
const ATMOSPHERE_OUTER_SCALE = 1.06;
const ATMOSPHERE_INNER_SCALE = 1.18;
const ATMOSPHERE_OUTER_OPACITY = 0.16;
const ATMOSPHERE_INNER_OPACITY = 0.06;
const ATMOSPHERE_OUTER_COLOR = '#6fd0ff';
const ATMOSPHERE_INNER_COLOR = '#3aa0ff';
const ATMOSPHERE_SIDES = THREE.BackSide;
const CLOUD_MATERIAL_DEPTH_WRITE = false;
const EARTH_SPHERE_SEGMENTS = 64;
const ATMOSPHERE_SPHERE_SEGMENTS = 48;
const HITBOX_SPHERE_SEGMENTS = 16;
const LABEL_POSITION: [number, number, number] = [0, EARTH_RADIUS_DL + 0.14, 0];

interface EarthProps {
    onFocus: () => void;
    sunDirection: [number, number, number];
    subsolarLatDeg: number;
    subsolarLonDeg: number;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    /** When true, the Earth is the current camera focus — disable click/hover. */
    isFocused?: boolean;
}

function safeSetCursor(value: string) {
    if (typeof document !== 'undefined') {
        document.body.style.cursor = value;
    }
}

function disposeMaterial(material: THREE.ShaderMaterial | null) {
    material?.dispose();
}

/**
 * Renderiza a Terra na cena 3D do observatório/radar orbital.
 *
 * Responsabilidades:
 * - carregar as texturas de dia, noite e nuvens;
 * - aplicar shader próprio para misturar lado diurno e noturno;
 * - orientar o globo para que o ponto subsolar real aponte para o Sol;
 * - atualizar a direção do Sol nos shaders a cada frame;
 * - renderizar atmosfera, nuvens, hitbox invisível e rótulo opcional.
 *
 * Observação científica:
 * a orientação do globo depende de `sunDirection`, `subsolarLatDeg` e
 * `subsolarLonDeg`. A coerência dia/noite deve ser validada principalmente em
 * `orientEarth` e nos cálculos que fornecem o ponto subsolar. Este componente
 * apenas aplica essa orientação e renderiza o resultado.
 */
export function Earth({
    onFocus,
    sunDirection,
    subsolarLatDeg,
    subsolarLonDeg,
    showLabel,
    protectLabelFromFocus,
    isFocused = false,
}: EarthProps) {
    /**
     * Textura diurna da Terra. Usa `raw` porque o shader customizado controla
     * manualmente a conversão de cor.
     */
    const day = useEarthTexture('/images/earth/blue-marble-land-shallow-topo-2048.jpg', 'raw');

    /**
     * Textura noturna com luzes urbanas. Também usa `raw` por ser consumida pelo
     * shader customizado da Terra.
     */
    const night = useEarthTexture('/images/earth/earth-night-lights-2048.jpg', 'raw');

    /**
     * Mapa de nuvens. Usa `srgb` porque a textura alimenta diretamente o shader
     * visual de nuvens.
     */
    const clouds = useEarthTexture('/images/earth/earth-clouds-2048.jpg', 'srgb');

    /**
     * Grupo que contém a superfície e a camada de nuvens.
     * A orientação real da Terra é aplicada neste grupo.
     */
    const groupRef = useRef<THREE.Group>(null);

    /**
     * Referência do material das nuvens para atualizar a direção do Sol por frame.
     */
    const cloudsMatRef = useRef<THREE.ShaderMaterial>(null);

    /**
     * Referência do material principal da Terra para atualizar a direção do Sol por frame.
     */
    const matRef = useRef<THREE.ShaderMaterial>(null);

    /**
     * Estado usado apenas para enfatizar o rótulo e ajustar o cursor no hover.
     */
    const [hovered, setHovered] = useState(false);

    /**
     * Evita que o cursor fique preso como pointer caso a Terra seja desmontada
     * enquanto o mouse ainda está sobre a hitbox.
     */
    useEffect(() => {
        return () => {
            safeSetCursor('');
        };
    }, []);

    // Shader da camada de nuvens: o mapa em tons de cinza controla brilho e opacidade.
    // A iluminação usa dot(normal, sun), escurecendo as nuvens no lado noturno para
    // evitar que elas brilhem artificialmente no escuro.
    // A esfera fica logo acima da superfície e dentro do grupo orientado, então as nuvens
    // acompanham a rotação/orientação do globo.
    const cloudsMaterial = useMemo(() => {
        if (!clouds) return null;

        return new THREE.ShaderMaterial({
            uniforms: {
                cloudMap: { value: clouds },
                sunDir: { value: new THREE.Vector3(...sunDirection) },
            },
            vertexShader: EARTH_VERT,
            fragmentShader: CLOUDS_FRAG,
            transparent: true,
            depthWrite: CLOUD_MATERIAL_DEPTH_WRITE,
        });

        // `sunDirection` é atualizado por frame via uniform, então não precisa
        // recriar o material a cada mudança desse vetor.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clouds]);

    // Abordagem de coerência: o dia/noite no shader é calculado por dot(worldNormal, sunDir),
    // então o hemisfério iluminado sempre aponta para o Sol visível.
    // Para colocar os continentes corretos nesse hemisfério iluminado, o globo é orientado
    // para que o ponto subsolar real (lat/lon onde o Sol está a pino agora) aponte fisicamente
    // para o Sol. A função orientEarth() monta essa rotação considerando o ponto subsolar,
    // a direção do Sol e a convenção UV da textura.
    const material = useMemo(() => {
        if (!day || !night) return null;

        return new THREE.ShaderMaterial({
            uniforms: {
                dayMap: { value: day },
                nightMap: { value: night },
                sunDir: { value: new THREE.Vector3(...sunDirection) },
            },
            vertexShader: EARTH_VERT,
            fragmentShader: EARTH_FRAG,
        });

        // `sunDirection` é atualizado por frame via uniform, então não precisa
        // recriar o material a cada mudança desse vetor.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [day, night]);

    /**
     * Descarta o material principal quando ele deixa de ser usado.
     */
    useEffect(() => {
        return () => {
            disposeMaterial(material);
        };
    }, [material]);

    /**
     * Descarta o material das nuvens quando ele deixa de ser usado.
     */
    useEffect(() => {
        return () => {
            disposeMaterial(cloudsMaterial);
        };
    }, [cloudsMaterial]);

    /**
     * Atualização por frame:
     * - reorienta o globo conforme ponto subsolar e direção do Sol;
     * - atualiza o uniforme `sunDir` nos shaders para manter dia/noite e nuvens
     *   coerentes com a posição solar atual da cena.
     */
    useFrame(() => {
        if (groupRef.current) {
            orientEarth(groupRef.current, sunDirection, subsolarLatDeg, subsolarLonDeg);
        }

        if (matRef.current) {
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).set(...sunDirection);
        }

        if (cloudsMatRef.current) {
            (cloudsMatRef.current.uniforms.sunDir.value as THREE.Vector3).set(...sunDirection);
        }
    });

    const handlePointerOver = (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        setHovered(true);
        safeSetCursor('pointer');
    };

    const handlePointerOut = () => {
        setHovered(false);
        safeSetCursor('');
    };

    const handleClick = (event: { stopPropagation: () => void }) => {
        event.stopPropagation();
        onFocus();
    };

    return (
        <group>
            {/* Globo orientado: a rotação do grupo é definida a cada frame por orientEarth(),
                de modo que o ponto subsolar real fique voltado para o Sol.
                As camadas de brilho e a hitbox permanecem sem essa rotação. */}
            <group ref={groupRef}>
                <mesh>
                    <sphereGeometry args={[EARTH_RADIUS_DL, EARTH_SPHERE_SEGMENTS, EARTH_SPHERE_SEGMENTS]} />
                    {material ? (
                        <primitive ref={matRef} object={material} attach="material" />
                    ) : (
                        // Fallback azul iluminado enquanto as texturas carregam — evita uma esfera preta.
                        <meshStandardMaterial
                            color="#2f6fb0"
                            emissive="#0a2a4a"
                            emissiveIntensity={0.5}
                            roughness={0.85}
                        />
                    )}
                </mesh>

                {/* Camada de nuvens logo acima da superfície; escurecida no lado noturno pelo shader. */}
                {cloudsMaterial ? (
                    <mesh>
                        <sphereGeometry args={[EARTH_RADIUS_DL * CLOUD_LAYER_SCALE, EARTH_SPHERE_SEGMENTS, EARTH_SPHERE_SEGMENTS]} />
                        <primitive ref={cloudsMatRef} object={cloudsMaterial} attach="material" />
                    </mesh>
                ) : null}
            </group>

            {/* Brilho atmosférico — duas cascas traseiras suaves para sugerir uma borda tipo Fresnel. */}
            <mesh>
                <sphereGeometry args={[EARTH_RADIUS_DL * ATMOSPHERE_OUTER_SCALE, ATMOSPHERE_SPHERE_SEGMENTS, ATMOSPHERE_SPHERE_SEGMENTS]} />
                <meshBasicMaterial
                    color={ATMOSPHERE_OUTER_COLOR}
                    transparent
                    opacity={ATMOSPHERE_OUTER_OPACITY}
                    side={ATMOSPHERE_SIDES}
                />
            </mesh>

            <mesh>
                <sphereGeometry args={[EARTH_RADIUS_DL * ATMOSPHERE_INNER_SCALE, ATMOSPHERE_SPHERE_SEGMENTS, ATMOSPHERE_SPHERE_SEGMENTS]} />
                <meshBasicMaterial
                    color={ATMOSPHERE_INNER_COLOR}
                    transparent
                    opacity={ATMOSPHERE_INNER_OPACITY}
                    side={ATMOSPHERE_SIDES}
                />
            </mesh>

            {/* Hitbox invisível para facilitar hover/clique.
                Clicar na Terra recentraliza a câmera nela como atalho de visão.
                A Terra é contexto da cena, então não abre painel de foco.
                Quando já está em foco, o hitbox é removido para evitar hover/clique. */}
            {!isFocused ? (
                <mesh
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                    onClick={handleClick}
                >
                    <sphereGeometry args={[EARTH_HITBOX_DL, HITBOX_SPHERE_SEGMENTS, HITBOX_SPHERE_SEGMENTS]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
            ) : null}

            {showLabel ? (
                <ScreenLabel
                    position={LABEL_POSITION}
                    emphasized={hovered}
                    protectFromFocus={protectLabelFromFocus}
                    onClick={isFocused ? undefined : onFocus}
                    title={isFocused ? undefined : 'Voltar para a visão geral'}
                >
                    <span className="font-semibold">Terra</span>
                </ScreenLabel>
            ) : null}
        </group>
    );
}

/**
 * Carrega uma textura de forma imperativa e retorna null enquanto ela não está pronta.
 *
 * Este hook evita o `useLoader` do drei/R3F porque ele usa Suspense. Na prática,
 * um try/catch ao redor de `useLoader` não resolve falhas ou lentidão de carga de
 * forma limpa. Em ambiente Docker/dev, uma textura lenta ou com erro podia deixar
 * o globo preto. Com este hook, o componente chamador consegue renderizar um
 * fallback visual enquanto o bitmap real não foi decodificado.
 *
 * Contrato:
 * - retorna `null` enquanto a textura ainda não carregou ou se houver falha;
 * - retorna uma `THREE.Texture` quando o carregamento termina com sucesso;
 * - não lança erro para a UI;
 * - deixa o chamador decidir qual fallback renderizar.
 *
 * Uso de colorSpace:
 * - `srgb`: para materiais comuns do Three.js que fazem o decode sRGB;
 * - `raw`: para shaders customizados que fazem a conversão manualmente.
 *
 * Exportado também para permitir que outros corpos, como a Lua, reutilizem o
 * mesmo contrato de carregamento/fallback.
 *
 * @param url Caminho da imagem a ser carregada.
 * @param colorSpace Espaço de cor desejado para a textura.
 * @returns Textura carregada ou null enquanto ela não está disponível.
 */
export function useEarthTexture(
    url: string,
    colorSpace: 'srgb' | 'raw' = 'srgb',
): THREE.Texture | null {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        /**
         * Flag de segurança para evitar `setState` depois que o componente
         * desmontou ou depois que a URL/colorSpace mudou.
         */
        let active = true;

        /**
         * Textura efetivamente carregada nesta execução do effect.
         * Usada para liberar memória de GPU no cleanup.
         */
        let loadedTexture: THREE.Texture | null = null;

        const loader = new TextureLoader();

        loader.load(
            url,
            (tex) => {
                tex.colorSpace = colorSpace === 'srgb'
                    ? THREE.SRGBColorSpace
                    : THREE.NoColorSpace;

                if (!active) {
                    tex.dispose();
                    return;
                }

                loadedTexture = tex;
                setTexture(tex);
            },
            undefined,
            () => {
                // Mantém null → fallback azul iluminado.
            },
        );

        return () => {
            active = false;

            if (loadedTexture) {
                loadedTexture.dispose();
            }
        };
    }, [url, colorSpace]);

    return texture;
}