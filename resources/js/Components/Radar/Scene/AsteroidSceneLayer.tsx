/**
 * Camada de asteroides da cena radar.
 *
 * Responsabilidade: preparar posições atuais e estados derivados de trajetória
 * para os marcadores visuais, mantendo os corpos de `Bodies/Asteroid` focados
 * apenas em renderização, hover, seleção e rótulos.
 */

import { useCallback } from 'react';
import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, UnifiedApproach } from '@/types';
import { OBJECT_PALETTE } from '@/lib/radar/palette';
import { currentPositionInHelioScene, makeHelioLinearProjector, trajectoryFramePoints } from '@/lib/radar/trajectorySampling';
import type { EarthHelioAU } from '@/lib/radar/trajectorySampling';
import { AsteroidMarker } from '../Bodies/Asteroid/AsteroidMarker';
import { NowTrajectory } from '../Trajectory/NowTrajectory';
import { framingForBody } from './cameraFraming';
import type { FocusFraming } from './cameraFraming';

/**
 * Asteroides e trajetórias na cena, na régua única heliocêntrica linear em UA (Sol na origem): os
 * NEOs caem na posição verdadeira ao redor do Sol, sem offset da Terra.
 *
 * Esta camada prepara posição atual e estados derivados de trajetória antes de
 * enviar os dados para `Bodies/Asteroid`, mantendo os corpos apenas renderizando.
 */
export function AsteroidSceneLayer({
    closestNowObjects,
    selectedId,
    hasSelection,
    onSelect,
    showLabels,
    showLabelForObject,
    onFocusTrajectoryPoint,
    panelBiasX = 0,
    panelBiasY = 0,
    earthHelioAU = null,
    skipObjectId = null,
}: {
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    hasSelection: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    showLabels: boolean;
    showLabelForObject: (id: string) => boolean;
    onFocusTrajectoryPoint?: (framing: FocusFraming) => void;
    /** Frações do canvas cobertas por painéis: o zoom out de trajetória enquadra só a área livre. */
    panelBiasX?: number;
    panelBiasY?: number;
    /** Posição heliocêntrica da Terra (AU). Sem ela (efeméride não resolvida) a camada não renderiza. */
    earthHelioAU?: EarthHelioAU | null;
    /**
     * [Modo linear] Id do objeto cuja rocha é desenhada FORA desta camada, sobre a própria órbita
     * (RadarScene). Pulamos aqui para não duplicar o corpo: a posição amostrada da elipse e o ponto
     * Horizons divergem, e renderizar os dois mostraria duas rochas.
     */
    skipObjectId?: string | null;
}) {
    // Os pontos da trajetória já chegam ABSOLUTOS (a régua heliocêntrica põe tudo no espaço do Sol),
    // então o enquadramento mira o vetor direto, sem offset de Terra.
    const handleFocusPoint = useCallback((vec: THREE.Vector3) => {
        if (!onFocusTrajectoryPoint) return;
        const framing = framingForBody(vec.clone(), 0.05, undefined, 60);
        onFocusTrajectoryPoint({ ...framing, transition: 'preserve_heading' });
    }, [onFocusTrajectoryPoint]);

    if (!earthHelioAU) return null;

    // Régua única heliocêntrica linear em UA: os NEOs caem na posição verdadeira ao redor do Sol.
    // Base honesta — a separação visual de objetos próximos vem do ZOOM de câmera, não de distorção
    // de escala. Projetor heliocêntrico fixo (a Terra mal se move no intervalo da trajetória): leva os
    // pontos geocêntricos do Horizons à régua linear, em coordenadas absolutas (Sol na origem).
    const helioProject = makeHelioLinearProjector(earthHelioAU);
    const selectedObject = selectedId
        ? closestNowObjects.find((o) => o.approach.id === selectedId) ?? null
        : null;

    // Trajetória curta só quando vem do Horizons. A versão sintética por Kepler (cometa famoso sem feed,
    // ex.: Halley) foi removida: no afélio o deslocamento de poucos dias é minúsculo, e a trilha/ticks
    // ficavam fora de escala/invertidos na cena. Para o Halley, a história fica na órbita completa
    // (botão "Ver a órbita"), não numa trilha curta.
    const selectedTrajectory: AsteroidTrajectory | null = selectedObject?.trajectory?.status === 'available'
        ? selectedObject.trajectory as AsteroidTrajectory
        : null;
    const selectedIndex = selectedObject
        ? closestNowObjects.findIndex((o) => o.approach.id === selectedObject.approach.id)
        : -1;
    return (
        <group>
            {closestNowObjects.map((object, index) => {
                if (object.approach.id === skipObjectId) return null;
                const position = currentPositionInHelioScene(object, earthHelioAU);
                if (!position) return null;
                const isSelected = object.approach.id === selectedId;
                // Lupa de "ver trajetória" no NEO focado: pontos da trajetória curta projetados na
                // régua heliocêntrica (absolutos, sem offset de Terra). Só o selecionado recebe.
                const trajectory = isSelected && object.trajectory?.status === 'available'
                    ? object.trajectory as AsteroidTrajectory
                    : null;
                const zoomProps = trajectory
                    ? {
                        zoomWorldPosition: new THREE.Vector3(...position),
                        zoomFramePoints: trajectoryFramePoints(trajectory, 78, helioProject),
                    }
                    : {};
                return (
                    <AsteroidMarker
                        key={object.approach.id}
                        object={object}
                        position={position}
                        isSelected={isSelected}
                        dimmed={hasSelection && !isSelected}
                        onSelect={onSelect}
                        showLabel={showLabelForObject(object.approach.id)}
                        protectLabelFromFocus={!isSelected}
                        paletteColor={OBJECT_PALETTE[index % OBJECT_PALETTE.length].future}
                        showLabels={showLabels}
                        panelBiasX={panelBiasX}
                        panelBiasY={panelBiasY}
                        {...zoomProps}
                    />
                );
            })}

            {/* Trajetória curta geocêntrica do NEO focado, projetada na régua heliocêntrica (fiel à
                escala): trecho de poucos dias perto da Terra, como o NASA Eyes mostra. Fica
                fisicamente pequena, aparecendo ao dar zoom na Terra. Em coordenadas absolutas — o
                projetor já põe os pontos no espaço do Sol, então NÃO há offset de Terra aqui.
                onFocusPoint enquadra a câmera no tick clicado. */}
            {showLabels && selectedObject && selectedTrajectory ? (
                <NowTrajectory
                    trajectory={selectedTrajectory}
                    palette={OBJECT_PALETTE[Math.max(0, selectedIndex) % OBJECT_PALETTE.length]}
                    emphasized
                    dimmed={false}
                    project={helioProject}
                    onFocusPoint={handleFocusPoint}
                />
            ) : null}
        </group>
    );
}

