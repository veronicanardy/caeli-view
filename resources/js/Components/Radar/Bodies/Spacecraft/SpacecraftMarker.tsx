/**
 * Marcador estilizado de nave na cena do radar.
 *
 * Responsabilidade: desenhar uma forma 3D SIMBÓLICA e sóbria de sonda (corpo central, dois painéis
 * solares e uma antena), sem GLB. Nave de verdade tem poucos metros, sub-pixel em qualquer escala da
 * cena: o objetivo aqui não é fidelidade física, é dar uma silhueta reconhecível de "objeto artificial"
 * que se distingue de uma rocha sem competir com os corpos naturais. É o equivalente ao "genérico" dos
 * cometas; um modelo real por nave pode vir depois (padrão da skill).
 *
 * Não decide posição, foco nem seleção global: recebe escala/estado e só renderiza.
 */

import { useMemo } from 'react';
import * as THREE from 'three';

/** Tom metálico frio e discreto, alinhado ao visual sóbrio da cena (sem brilho chamativo). */
const SPACECRAFT_BODY_COLOR = '#c8d2dc';
const SPACECRAFT_PANEL_COLOR = '#2b3a55';
/** Realce na seleção/hover: leve emissivo, não um glow forte. */
const SPACECRAFT_EMISSIVE = '#7fa8d8';

type SpacecraftMarkerProps = {
    /** Estado de destaque (selecionado ou sob o cursor): acende um emissivo discreto. */
    emphasized: boolean;
    /** Opacidade do conjunto (esmaecimento quando há outra seleção). */
    opacity: number;
};

/**
 * Sonda simbólica: corpo central (cilindro), dois painéis solares (placas finas) e uma antena de prato
 * (cone raso). Dimensões em unidades do <group scale> que envolve o marcador (raio simbólico ~1), então
 * tudo aqui é relativo a esse 1.
 */
export function SpacecraftMarker({ emphasized, opacity }: SpacecraftMarkerProps) {
    const bodyMaterial = useMemo(
        () => new THREE.MeshStandardMaterial({
            color: SPACECRAFT_BODY_COLOR,
            metalness: 0.6,
            roughness: 0.4,
            emissive: new THREE.Color(SPACECRAFT_EMISSIVE),
            emissiveIntensity: emphasized ? 0.5 : 0.12,
            transparent: true,
            opacity,
        }),
        [emphasized, opacity],
    );
    const panelMaterial = useMemo(
        () => new THREE.MeshStandardMaterial({
            color: SPACECRAFT_PANEL_COLOR,
            metalness: 0.3,
            roughness: 0.6,
            emissive: new THREE.Color(SPACECRAFT_EMISSIVE),
            emissiveIntensity: emphasized ? 0.35 : 0.06,
            transparent: true,
            opacity,
            side: THREE.DoubleSide,
        }),
        [emphasized, opacity],
    );

    return (
        <group>
            {/* Corpo central */}
            <mesh material={bodyMaterial}>
                <cylinderGeometry args={[0.5, 0.5, 1.1, 12]} />
            </mesh>
            {/* Antena de prato no topo */}
            <mesh position={[0, 0.95, 0]} rotation={[Math.PI, 0, 0]} material={bodyMaterial}>
                <coneGeometry args={[0.7, 0.45, 16, 1, true]} />
            </mesh>
            {/* Painel solar esquerdo */}
            <mesh position={[-1.5, 0, 0]} material={panelMaterial}>
                <boxGeometry args={[1.9, 0.06, 0.9]} />
            </mesh>
            {/* Painel solar direito */}
            <mesh position={[1.5, 0, 0]} material={panelMaterial}>
                <boxGeometry args={[1.9, 0.06, 0.9]} />
            </mesh>
        </group>
    );
}
