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
import { ScreenLabel } from '../../Overlays/SceneLabels';
import { BodyHitbox } from '../BodyHitbox';
import RealAsteroidModel from './RealAsteroidModel';
import { asteroidRenderableModelFor } from './asteroidModelRegistry';
import { ZoomHint } from './ZoomHint';

const DIMMED_OPACITY = 0.4;
const FULL_OPACITY = 1;
const HITBOX_RADIUS = 0.14;
const HITBOX_SEGMENTS = 16;
const LABEL_POSITION: [number, number, number] = [0, 0.04, 0];

function rockScaleFromDiameter(a: UnifiedApproach): number {
    const dMin = a.estimatedDiameterMinMeters
        ?? (a.absoluteMagnitude != null ? (1329 / Math.sqrt(0.25)) * Math.pow(10, -a.absoluteMagnitude / 5) * 1000 : null);
    const dMax = a.estimatedDiameterMaxMeters
        ?? (a.absoluteMagnitude != null ? (1329 / Math.sqrt(0.05)) * Math.pow(10, -a.absoluteMagnitude / 5) * 1000 : null);
    const d = a.diameterMeters
        ?? (dMin != null && dMax != null ? Math.round((dMin + dMax) / 2) : dMax ?? dMin)
        ?? null;
    if (d == null) return 0.013;
    if (d < 10)   return 0.006;
    if (d < 50)   return 0.008;
    if (d < 150)  return 0.010;
    if (d < 500)  return 0.013;
    if (d < 1000) return 0.017;
    return 0.022;
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
    zoomOutTarget?: THREE.Vector3;
    zoomOutDistance?: number;
    zoomWorldPosition?: THREE.Vector3;
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
    zoomOutTarget,
    zoomOutDistance,
    zoomWorldPosition,
}: AsteroidMarkerProps) {
    const [hovered, setHovered] = useState(false);
    const renderModel = useMemo(() => asteroidRenderableModelFor(object), [object]);

    const rockScale = rockScaleFromDiameter(object.approach);
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
            {isSelected && showLabels && zoomOutTarget && zoomOutDistance && zoomWorldPosition ? (
                <ZoomHint worldPosition={zoomWorldPosition} zoomOutTarget={zoomOutTarget} zoomOutDistance={zoomOutDistance} />
            ) : null}

            {(showLabel || hovered) ? (
                <ScreenLabel
                    position={LABEL_POSITION}
                    emphasized={isSelected || hovered}
                    protectFromFocus={protectLabelFromFocus}
                    allowSceneOverlap={isSelected}
                    onClick={() => onSelect(object.approach)}
                    tooltip={isSelected && object.currentDistanceKm != null ? (
                        <><span>O asteroide está aqui agora</span><br /><span className="text-white/50">{new Intl.NumberFormat('pt-BR').format(Math.round(object.currentDistanceKm))} km da Terra</span></>
                    ) : undefined}
                >
                    {object.approach.displayName ?? object.approach.name}
                </ScreenLabel>
            ) : null}
        </group>
    );
}
