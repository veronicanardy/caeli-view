import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SUN_FRAG, SUN_GLOW_FRAG, SUN_GLOW_VERT, SUN_VERT } from '@/lib/observatory/shaders/sun.glsl';
import { ScreenLabel } from '../../Overlays/SceneLabels';

interface SunProps {
    position: [number, number, number];
    radius: number;
    locale: 'pt-BR' | 'en';
    /**
     * Quando verdadeiro, anexa uma luz direcional e uma luz pontual em `position`
     * para que o Sol ilumine o restante da cena. A camada heliocêntrica injeta sua
     * própria iluminação separadamente e passa `false` para evitar luzes duplicadas.
     */
    withLighting?: boolean;
}

/**
 * O Sol visual. Componente unificado usado por:
 *  - a cena de radar (passa a posição projetada em SUN_DISPLAY_DL e ativa a luz
 *    direcional + ponto quente na direção real do Sol);
 *  - a cena heliocêntrica (passa a origem [0, 0, 0] sem iluminação — a cena
 *    heliocêntrica fornece sua própria iluminação na posição do Sol).
 *
 * Anteriormente havia dois componentes quase idênticos (Sun e SunAtOrigin).
 * Unificá-los removeu cerca de 50 linhas de duplicação.
 */
export function Sun({
    position,
    radius,
    locale,
    withLighting = false,
}: SunProps) {
    const en = locale === 'en';
    const surfaceMat = useRef<THREE.ShaderMaterial>(null);

    // Fotosfera animada (granulação + manchas solares) — uma estrela com vida, não
    // um disco plano.
    const surfaceMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader: SUN_VERT,
            fragmentShader: SUN_FRAG,
        }),
        [],
    );

    // Brilho da corona como uma única casca fresnel: uma esfera de faces voltadas para
    // dentro cuja opacidade cai suavemente em direção à borda. Isso produz um halo suave
    // que some gradualmente — sem um disco translúcido duro que se espalha como uma mancha
    // amarela quando o Sol está fora do quadro.
    const glowMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            uniforms: { uColor: { value: new THREE.Color('#ffb84d') } },
            vertexShader: SUN_GLOW_VERT,
            fragmentShader: SUN_GLOW_FRAG,
            transparent: true,
            side: THREE.BackSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        }),
        [],
    );

    useEffect(() => {
        return () => {
            surfaceMaterial.dispose();
            glowMaterial.dispose();
        };
    }, [surfaceMaterial, glowMaterial]);

    useFrame(({ clock }) => {
        if (surfaceMat.current) surfaceMat.current.uniforms.uTime.value = clock.getElapsedTime();
    });

    return (
        <group>
            {withLighting ? (
                <>
                    <directionalLight position={position} intensity={2.2} color="#fff6e8" />
                    <pointLight position={position} intensity={0.5} distance={80} color="#ffdca8" />
                </>
            ) : null}

            <group position={position}>
                <mesh>
                    <sphereGeometry args={[radius, 160, 96]} />
                    <primitive ref={surfaceMat} object={surfaceMaterial} attach="material" />
                </mesh>
                <mesh scale={1.018}>
                    <sphereGeometry args={[radius, 96, 64]} />
                    <meshBasicMaterial color="#ffd27a" transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
                </mesh>
                <mesh scale={1.18}>
                    <sphereGeometry args={[radius, 96, 64]} />
                    <primitive object={glowMaterial} attach="material" />
                </mesh>
                <SunProminences radius={radius} />
                <ScreenLabel position={[0, radius + 0.42, 0]} protectFromFocus={false}>
                    <span className="font-semibold">{en ? 'Sun' : 'Sol'}</span>
                </ScreenLabel>
            </group>
        </group>
    );
}

/**
 * Prominências solares animadas.
 *
 * Geradas proceduralmente como linhas que orbitam suavemente em torno do Sol.
 */
function SunProminences({ radius }: { radius: number }) {
    const groupRef = useRef<THREE.Group>(null);
    const arcs = useMemo(() => {
        const configs = [
            { start: 0.35, height: 0.18, span: 0.36, tilt: 0.1 },
            { start: 2.15, height: 0.13, span: 0.28, tilt: -0.18 },
            { start: 4.7, height: 0.16, span: 0.32, tilt: 0.22 },
        ];

        return configs.map((config) => {
            const points: THREE.Vector3[] = [];
            for (let i = 0; i <= 28; i += 1) {
                const t = i / 28;
                const a = config.start + (t - 0.5) * config.span;
                const lift = Math.sin(Math.PI * t) * config.height * radius;
                points.push(new THREE.Vector3(
                    Math.cos(a) * (radius + lift),
                    Math.sin(config.tilt) * lift + Math.sin(a * 1.7) * radius * 0.04,
                    Math.sin(a) * (radius + lift),
                ));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: '#ffb45c',
                transparent: true,
                opacity: 0.42,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const line = new THREE.Line(geometry, material);
            return line;
        });
    }, [radius]);

    useEffect(() => () => {
        arcs.forEach((line) => {
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
        });
    }, [arcs]);

    useFrame((_, delta) => {
        if (groupRef.current) groupRef.current.rotation.y += delta * 0.012;
    });

    return (
        <group ref={groupRef}>
            {arcs.map((line, index) => (
                <primitive key={index} object={line} />
            ))}
        </group>
    );
}
