/**
 * Campo estelar procedural da cena 3D.
 *
 * As estrelas se espalham em várias CAMADAS de profundidade (ver `lib/radar/starField`):
 * as próximas são maiores e mais nítidas, as distantes viram poeira fina e apagada. Essa
 * gradação de tamanho e brilho por estrela é o que dá a sensação de profundidade, em vez
 * de uma casca uniforme. O grupo segue a câmera para o limite da esfera nunca aparecer no
 * zoom out. Puramente decorativo, não afeta cálculos orbitais.
 *
 * O `pointsMaterial` padrão não suporta tamanho nem opacidade POR estrela, então usamos um
 * `ShaderMaterial` mínimo: o vertex shader aplica o tamanho da estrela com atenuação por
 * distância, e o fragment shader pinta um disco macio com a opacidade dela.
 *
 * Anti-cintilação (importante): pontos abaixo de ~1px e blending aditivo fazem as estrelas
 * "piscarem" ao mover/zoomar (aliasing de subpixel + soma de transparências). Por isso o
 * tamanho é travado num piso de 1.5px e o blending é normal, não aditivo. O grupo segue a
 * câmera, então a profundidade relativa é estável e a atenuação varia pouco quadro a quadro.
 *
 * O RNG é determinístico (seed fixo = 42) para que o campo seja idêntico entre renders e
 * sessões, sem depender de Math.random().
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildStarField } from '@/lib/radar/starField';

const vertexShader = /* glsl */ `
    attribute float aSize;
    attribute float aOpacity;
    varying vec3 vColor;
    varying float vOpacity;
    void main() {
        vColor = color;
        vOpacity = aOpacity;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        /* Atenuação por distância: pontos mais longe ficam menores (profundidade). O fator
           300 calibra o tamanho em pixels para a faixa de raios do campo (~300..900).
           Piso de 1.5px: abaixo de ~1px o ponto vira subpixel e "pisca" (aliasing) ao
           zoomar/mover. Travar o mínimo mata a cintilação sem achatar a profundidade, que
           já vem do brilho e da densidade das camadas. */
        gl_PointSize = max(1.5, aSize * (300.0 / -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = /* glsl */ `
    varying vec3 vColor;
    varying float vOpacity;
    void main() {
        /* Disco macio: alpha cai do centro para a borda, sem recorte duro de quadrado. */
        float d = distance(gl_PointCoord, vec2(0.5));
        float alpha = smoothstep(0.5, 0.1, d) * vOpacity;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor, alpha);
    }
`;

export function StarField() {
    const groupRef = useRef<THREE.Group>(null);

    const geo = useMemo(() => {
        const { positions, colors, sizes, opacities } = buildStarField();
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
        g.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));
        return g;
    }, []);

    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                vertexColors: true,
                transparent: true,
                depthWrite: false,
                /* Blending normal (não aditivo): o aditivo soma transparências sobrepostas e
                   faz as estrelas "piscarem" quando se cruzam no zoom. Normal mantém o céu
                   estável e sóbrio. */
                blending: THREE.NormalBlending,
            }),
        [],
    );

    useFrame(({ camera }) => {
        if (groupRef.current) {
            groupRef.current.position.copy(camera.position);
        }
    });

    return (
        <group ref={groupRef}>
            <points geometry={geo} material={material} renderOrder={-1} />
        </group>
    );
}
