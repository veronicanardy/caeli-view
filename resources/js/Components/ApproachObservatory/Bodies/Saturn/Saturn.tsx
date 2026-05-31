/**
 * Saturno na cena do radar orbital.
 *
 * Responsabilidade: renderizar o planeta e seu sistema de anéis como corpo ambiente
 * focável, já posicionado pela efeméride da cena. O componente mantém aparência,
 * rotação, inclinação, anéis texturizados, iluminação, hitbox e rótulo.
 *
 * Posição: `SceneEphemeris.saturnScenePosition`.
 * Rotação: período sideral de 0,44401 dias (10 h 39 min), ancorado em J2000.
 * Inclinação axial: 26,73° (IAU WGCCRE 2015), aplicada ao grupo do polo.
 * Escala: raio físico de 0,15597 DL; raio visual de 0,16 DL, quase sem exagero.
 * Anéis: disco anular texturizado com UV radial e raios relativos reais.
 * Iluminação: shader próprio com atmosfera densa e limb dourado-ocre.
 */

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { cursorPointerEnter, cursorPointerLeave } from '@/lib/observatory/cursor';
import { SATURN } from '@/lib/observatory/planetData';
import { SATURN_FRAG, SATURN_VERT } from '@/lib/observatory/shaders/saturn.glsl';
import { SUN_DISPLAY_DL } from '@/lib/sceneEphemeris';
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BODY_ROTATION_EPOCH_UNIX_S } from '../bodyRenderConstants';
import { useEarthTexture } from '../Earth/Earth';

// --------------- Constantes ---------------------------------------------------------------

const SATURN_SPIN_RATE_RAD_PER_S = (2 * Math.PI) / SATURN.rotationPeriodS;

const SATURN_TILT_QUAT = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    (SATURN.axialTiltDeg * Math.PI) / 180,
);


// Raios dos anéis (IAU): inner = borda interna do anel C, outer = borda externa do anel A.
// A textura 2k_saturn_ring_alpha.png cobre todo esse intervalo de inner a outer.
const RING_INNER_RADIUS = SATURN.visualRadiusDl * 1.11;
const RING_OUTER_RADIUS = SATURN.visualRadiusDl * 2.27;

// --------------- Ring geometry helper ----------------------------------------------------

/**
 * Constrói a geometria de disco anular com UVs corretos para a textura do anel de Saturno.
 *
 * A textura é uma faixa horizontal (u = posição radial: 0=inner, 1=outer).
 * Para cada anel de vértices: inner → u=0, outer → u=1. O v é fixo em 0.5
 * para amostrar a linha central da textura de 125px de altura.
 */
function buildRingGeometry(innerRadius: number, outerRadius: number, segments = 192): THREE.BufferGeometry {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Vértice inner: u=0 (borda interna da textura)
        positions.push(cos * innerRadius, 0, sin * innerRadius);
        uvs.push(0, 0.5);

        // Vértice outer: u=1 (borda externa da textura)
        positions.push(cos * outerRadius, 0, sin * outerRadius);
        uvs.push(1, 0.5);
    }

    for (let i = 0; i < segments; i++) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        indices.push(a, b, c, b, d, c);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
}

// --------------- Componente ---------------------------------------------------------------

interface SaturnProps {
    position: [number, number, number];
    sunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    onFocus: () => void;
    isFocused?: boolean;
    showLabel?: boolean;
}

export function Saturn({ position, sunDirection, locale, onFocus, isFocused = false, showLabel = true }: SaturnProps) {
    const [hovered, setHovered] = useState(false);

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        cursorPointerEnter();
    };
    const handlePointerOut = () => {
        setHovered(false);
        cursorPointerLeave();
    };
    const handleClick = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        onFocus();
    };

    const texture = useEarthTexture(SATURN.texturePath ?? '', 'srgb');
    const ringTexture = useEarthTexture('/images/saturn/saturn-ring-8k.png', 'srgb');

    const poleGroupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const matRef = useRef<THREE.ShaderMaterial>(null);

    useEffect(() => {
        if (poleGroupRef.current) poleGroupRef.current.quaternion.copy(SATURN_TILT_QUAT);
    }, []);

    useFrame(() => {
        if (!meshRef.current) return;
        const nowS = Date.now() / 1000;
        meshRef.current.rotation.y = SATURN_SPIN_RATE_RAD_PER_S * (nowS - BODY_ROTATION_EPOCH_UNIX_S);

        if (matRef.current) {
            const sunWorld = new THREE.Vector3(0, 0, 0);
            const saturnWorld = new THREE.Vector3(...position);
            const dirToSun = sunWorld.sub(saturnWorld).normalize();
            (matRef.current.uniforms.sunDir.value as THREE.Vector3).copy(dirToSun);
        }
    });

    useEffect(() => { return () => { texture?.dispose(); }; }, [texture]);
    useEffect(() => { return () => { ringTexture?.dispose(); }; }, [ringTexture]);

    const material = useMemo(() => {
        const sunWorld = new THREE.Vector3(...sunDirection).multiplyScalar(SUN_DISPLAY_DL);
        const saturnWorld = new THREE.Vector3(...position);
        const initialSunDir = sunWorld.sub(saturnWorld).normalize();

        if (texture) {
            return new THREE.ShaderMaterial({
                uniforms: {
                    surfaceMap: { value: texture },
                    sunDir: { value: initialSunDir },
                },
                vertexShader: SATURN_VERT,
                fragmentShader: SATURN_FRAG,
            });
        }
        return new THREE.MeshStandardMaterial({ color: SATURN.fallbackColor, roughness: 0.85, metalness: 0.0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [texture]);

    useEffect(() => { return () => { material.dispose(); }; }, [material]);

    const ringMaterial = useMemo(() => {
        const mat = new THREE.MeshBasicMaterial({
            map: ringTexture ?? null,
            // Sem textura: disco semitransparente dourado como fallback
            color: ringTexture ? '#ffffff' : '#d4c090',
            transparent: true,
            opacity: ringTexture ? 1.0 : 0.45,
            side: THREE.DoubleSide,
            depthWrite: false,
            alphaTest: 0.01,
        });
        return mat;
    }, [ringTexture]);

    useEffect(() => { return () => { ringMaterial.dispose(); }; }, [ringMaterial]);

    const ringGeo = useMemo(() => buildRingGeometry(RING_INNER_RADIUS, RING_OUTER_RADIUS), []);
    useEffect(() => { return () => { ringGeo.dispose(); }; }, [ringGeo]);

    const labelPos: [number, number, number] = [0, RING_OUTER_RADIUS + 0.10, 0];

    return (
        <>
            <group position={position}>
                <group ref={poleGroupRef}>
                    {/* Globo de Saturno */}
                    <mesh ref={meshRef}>
                        <sphereGeometry args={[SATURN.visualRadiusDl, 48, 32]} />
                        {material instanceof THREE.ShaderMaterial ? (
                            <primitive ref={matRef} object={material} attach="material" />
                        ) : (
                            <primitive object={material} attach="material" />
                        )}
                    </mesh>

                    {/* Anéis — textura 2k_saturn_ring_alpha.png com canal alpha real (gap de Cassini etc). */}
                    <mesh geometry={ringGeo}>
                        <primitive object={ringMaterial} attach="material" />
                    </mesh>
                </group>

                {/* Brilho de borda: halo dourado-ocre da atmosfera de Saturno. */}
                <mesh scale={1.06}>
                    <sphereGeometry args={[SATURN.visualRadiusDl, 24, 16]} />
                    <meshBasicMaterial
                        color="#c8b060"
                        transparent
                        opacity={0.07}
                        side={THREE.BackSide}
                        depthWrite={false}
                    />
                </mesh>

                {!isFocused ? (
                    <mesh
                        onPointerOver={handlePointerOver}
                        onPointerOut={handlePointerOut}
                        onClick={handleClick}
                    >
                        {/* Hitbox maior que o globo, cobrindo também os anéis para facilitar o clique. */}
                        <sphereGeometry args={[RING_OUTER_RADIUS * 1.1, 12, 8]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </mesh>
                ) : null}

                {showLabel ? (
                    <ScreenLabel position={labelPos} protectFromFocus={false} onClick={isFocused ? undefined : onFocus}>
                        <span className="font-semibold">{locale === 'en' ? 'Saturn' : 'Saturno'}</span>
                    </ScreenLabel>
                ) : null}
            </group>
        </>
    );
}
