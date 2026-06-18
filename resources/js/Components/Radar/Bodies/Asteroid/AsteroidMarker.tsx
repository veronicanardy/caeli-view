/**
 * Marcador visual de asteroide na cena 3D.
 *
 * Responsabilidade: posicionar modelo GLB real ou genérico, hitbox de interação
 * e rótulo de distância para um objeto próximo. Não decide ranking, seleção
 * global nem cálculo orbital.
 */

import { useMemo, useState } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import { estimateAsteroidDiameterMeters, symbolicRockRadiusFromDiameter } from '@/lib/radar/asteroidScale';
import { ResolvedScreenLabel } from '../../Overlays/SceneLabels';
import { BodyHitbox } from '../BodyHitbox';
import RealAsteroidModel from './RealAsteroidModel';
import { asteroidRenderableModelFor } from './asteroidModelRegistry';
import { ZoomHint } from './ZoomHint';

const DIMMED_OPACITY = 0.4;
const FULL_OPACITY = 1;
const HITBOX_RADIUS = 0.14;
const HITBOX_SEGMENTS = 16;
const LABEL_POSITION: [number, number, number] = [0, 0.04, 0];

/**
 * Raio visual SIMBÓLICO de um asteroide do feed.
 *
 * Adaptador fino sobre a política central (lib/radar/asteroidScale): estima o diâmetro a partir
 * do que o feed traz (diâmetro, faixa estimada ou magnitude absoluta H) e mapeia para o raio
 * visual em degraus. A mesma política é usada pelos asteroides conhecidos, garantindo que o
 * MESMO corpo tenha o MESMO tamanho independente do pipeline que o desenha.
 */
export function symbolicRockRadiusForApproach(a: UnifiedApproach): number {
    return symbolicRockRadiusFromDiameter(estimateAsteroidDiameterMeters(a));
}

/**
 * Propriedades usadas para renderizar um marcador de asteroide no radar 3D.
 */
type AsteroidMarkerProps = {
    object: ClosestNowObject;
    position: [number, number, number];
    isSelected: boolean;
    dimmed: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    showLabel: boolean;
    protectLabelFromFocus: boolean;
    paletteColor: string;
    showLabels: boolean;
    /** Trecho absoluto da trajetória que o zoom out deve enquadrar (vazio = sem trajetória). */
    zoomFramePoints?: THREE.Vector3[];
    zoomWorldPosition?: THREE.Vector3;
    panelBiasX?: number;
    panelBiasY?: number;
};

/**
 * Renderiza um marcador de asteroide na cena 3D do radar orbital.
 *
 * Responsabilidades:
 * - receber posição e estados de proximidade já preparados pela camada de cena;
 * - decidir entre modelo real conhecido ou rocha procedural genérica;
 * - aplicar uma rotação visual lenta para reforçar a percepção 3D;
 * - renderizar hitbox local, hover/seleção e rótulo.
 *
 * Observação científica:
 * este componente não calcula mecânica orbital nem amostra trajetória. Qualquer
 * validação física ou matemática deve acontecer na camada de trajetória/amostragem.
 */
export function AsteroidMarker({
    object,
    position,
    isSelected,
    dimmed,
    onSelect,
    showLabel,
    protectLabelFromFocus,
    paletteColor,
    showLabels,
    zoomFramePoints,
    zoomWorldPosition,
    panelBiasX = 0,
    panelBiasY = 0,
}: AsteroidMarkerProps) {
    const [hovered, setHovered] = useState(false);
    const renderModel = useMemo(() => asteroidRenderableModelFor(object), [object]);

    const rockScale = symbolicRockRadiusForApproach(object.approach);
    const opacity = dimmed ? DIMMED_OPACITY : FULL_OPACITY;

    return (
        <group position={position}>
            <group scale={rockScale} renderOrder={1}>
                <RealAsteroidModel asset={renderModel.asset} opacity={opacity} seed={object.approach.id} selected={isSelected} outlineColor={paletteColor} showOutline={showLabels} />
            </group>

            {!isSelected ? (
                <BodyHitbox
                    radius={HITBOX_RADIUS}
                    segments={[HITBOX_SEGMENTS, HITBOX_SEGMENTS]}
                    onClick={() => onSelect(object.approach)}
                    onHoverChange={setHovered}
                />
            ) : null}

            {/* Mostra label quando: (a) sempre visível por config, ou (b) hover — mesmo com labels suprimidos.
                Apenas o nome: identificação rápida. Detalhes (posição estimada, máxima aproximação)
                pertencem ao card do painel lateral, não à cena 3D. */}
            {isSelected && showLabels && zoomFramePoints && zoomWorldPosition ? (
                <ZoomHint
                    worldPosition={zoomWorldPosition}
                    zoomFramePoints={zoomFramePoints}
                    panelBiasX={panelBiasX}
                    panelBiasY={panelBiasY}
                />
            ) : null}

            {(showLabel || hovered) ? (
                <ResolvedScreenLabel
                    position={LABEL_POSITION}
                    labelId={`asteroid:${object.approach.id}`}
                    labelKind="asteroid"
                    emphasized={isSelected || hovered}
                    selected={isSelected}
                    hovered={hovered}
                    protectFromFocus={protectLabelFromFocus}
                    onClick={() => onSelect(object.approach)}
                    tooltip={isSelected && object.currentDistanceKm != null ? (
                        <><span>O asteroide está aqui agora</span><br /><span className="text-white/50">{new Intl.NumberFormat('pt-BR').format(Math.round(object.currentDistanceKm))} km da Terra</span></>
                    ) : undefined}
                >
                    {object.approach.displayName ?? object.approach.name}
                </ResolvedScreenLabel>
            ) : null}
        </group>
    );
}
