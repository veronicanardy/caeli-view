/**
 * Camada de asteroides da cena radar.
 *
 * Responsabilidade: preparar posições atuais e estados derivados de trajetória
 * para os marcadores visuais, mantendo os corpos de `Bodies/Asteroid` focados
 * apenas em renderização, hover, seleção e rótulos.
 */

import { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, UnifiedApproach } from '@/types';
import { OBJECT_PALETTE } from '@/lib/radar/palette';
import { currentPositionInHelioScene, currentPositionInScene, makeHelioLinearProjector, trajectoryFramePoints } from '@/lib/radar/trajectorySampling';
import type { EarthHelioAU } from '@/lib/radar/trajectorySampling';
import { AsteroidMarker } from '../Bodies/Asteroid/AsteroidMarker';
import { NowTrajectory } from '../Trajectory/NowTrajectory';
import { framingForBody } from './cameraFraming';
import type { FocusFraming } from './cameraFraming';
import type { SceneVector } from './scenePositions';

/**
 * Asteroides e trajetórias na cena.
 *
 * No caminho padrão (helioScene) os NEOs caem na régua linear heliocêntrica em UA (Sol na origem),
 * sem offset da Terra. Só atrás de `?log` eles são log-comprimidos e offsetados pela Terra.
 *
 * Esta camada prepara posição atual e estados derivados de trajetória antes de
 * enviar os dados para `Bodies/Asteroid`, mantendo os corpos apenas renderizando.
 */
export function AsteroidSceneLayer({
    closestNowObjects,
    selectedId,
    hasSelection,
    earthPos,
    onSelect,
    showLabels,
    showLabelForObject,
    onFocusTrajectoryPoint,
    panelBiasX = 0,
    panelBiasY = 0,
    helioScene = false,
    earthHelioAU = null,
    skipObjectId = null,
}: {
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    hasSelection: boolean;
    earthPos: SceneVector;
    onSelect: (approach: UnifiedApproach) => void;
    showLabels: boolean;
    showLabelForObject: (id: string) => boolean;
    onFocusTrajectoryPoint?: (framing: FocusFraming) => void;
    /** Frações do canvas cobertas por painéis: o zoom out de trajetória enquadra só a área livre. */
    panelBiasX?: number;
    panelBiasY?: number;
    /** [Modo linear] Plota os NEOs na régua heliocêntrica linear em UA (Sol na origem). */
    helioScene?: boolean;
    /** Posição heliocêntrica da Terra (AU), necessária no modo helioScene. */
    earthHelioAU?: EarthHelioAU | null;
    /**
     * [Modo linear] Id do objeto cuja rocha é desenhada FORA desta camada, sobre a própria órbita
     * (RadarScene). Pulamos aqui para não duplicar o corpo: a posição amostrada da elipse e o ponto
     * Horizons divergem, e renderizar os dois mostraria duas rochas.
     */
    skipObjectId?: string | null;
}) {
    const handleFocusPoint = useCallback((vec: THREE.Vector3) => {
        if (!onFocusTrajectoryPoint) return;
        const abs = new THREE.Vector3(earthPos[0] + vec.x, earthPos[1] + vec.y, earthPos[2] + vec.z);
        const framing = framingForBody(abs, 0.05, undefined, 60);
        onFocusTrajectoryPoint({ ...framing, transition: 'preserve_heading' });
    }, [earthPos, onFocusTrajectoryPoint]);

    const makeZoomProps = useCallback((position: SceneVector, object: ClosestNowObject) => {
        const trajectory = object.trajectory?.status === 'available' ? object.trajectory as AsteroidTrajectory : null;
        const worldPos = new THREE.Vector3(earthPos[0] + position[0], earthPos[1] + position[1], earthPos[2] + position[2]);
        // Trecho que o zoom out deve enquadrar (até o marcador −72h), em coordenadas absolutas.
        const zoomFramePoints = trajectory
            ? trajectoryFramePoints(trajectory).map((vec) =>
                new THREE.Vector3(earthPos[0] + vec.x, earthPos[1] + vec.y, earthPos[2] + vec.z))
            : [];
        return { zoomFramePoints, zoomWorldPosition: worldPos };
    }, [earthPos]);

    const renderableAsteroids = useMemo(() => {
        return closestNowObjects
            .map((object) => {
                const position = currentPositionInScene(object);
                if (!position) return null;
                return { object, position };
            })
            .filter((entry): entry is { object: ClosestNowObject; position: SceneVector } => entry !== null);
    }, [closestNowObjects]);

    // [Modo linear] Régua única heliocêntrica linear em UA: os NEOs caem na posição verdadeira ao
    // redor do Sol. Base honesta — a separação visual de objetos próximos vem do ZOOM de câmera, não
    // de distorção de escala.
    if (helioScene && earthHelioAU) {
        // Projetor heliocêntrico fixo (a Terra mal se move no intervalo da trajetória): leva os pontos
        // geocêntricos do Horizons à régua linear, em coordenadas absolutas (Sol na origem).
        const helioProject = makeHelioLinearProjector(earthHelioAU);
        const selectedObject = selectedId
            ? closestNowObjects.find((o) => o.approach.id === selectedId) ?? null
            : null;
        const selectedTrajectoryAvailable = selectedObject?.trajectory?.status === 'available';
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
                    // régua heliocêntrica (absolutos, sem offset de Terra). Mesma UX do log; aqui só
                    // muda a projeção. Só o selecionado recebe, igual ao log.
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

                {/* [Modo linear] Trajetória curta geocêntrica do NEO focado, projetada na régua
                    heliocêntrica (fiel à escala): é o trecho de poucos dias perto da Terra, como o
                    NASA Eyes mostra. Fica fisicamente pequena (sem a compressão log que estica o
                    radar), aparecendo ao dar zoom na Terra. Em coordenadas absolutas — o projetor já
                    põe os pontos no espaço do Sol, então NÃO há offset de Terra aqui. */}
                {showLabels && selectedObject && selectedTrajectoryAvailable ? (
                    <NowTrajectory
                        trajectory={selectedObject.trajectory as AsteroidTrajectory}
                        palette={OBJECT_PALETTE[Math.max(0, selectedIndex) % OBJECT_PALETTE.length]}
                        emphasized
                        dimmed={false}
                        project={helioProject}
                    />
                ) : null}
            </group>
        );
    }

    return (
        <group position={earthPos}>
            {renderableAsteroids.map(({ object, position }, index) => {
                const isSelected = object.approach.id === selectedId;
                const zoomCallbacks = isSelected ? makeZoomProps(position, object) : {};
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
                        {...zoomCallbacks}
                    />
                );
            })}

            {showLabels && closestNowObjects
                .map((object, index) => ({ object, palette: OBJECT_PALETTE[index % OBJECT_PALETTE.length] }))
                .filter(({ object }) => object.trajectory && object.trajectory.status === 'available' && object.approach.id === selectedId)
                .map(({ object, palette }) => {
                    const activeTrajectory = object.approach.id === selectedId;
                    return (
                        <NowTrajectory
                            key={`traj-${object.approach.id}`}
                            trajectory={object.trajectory as AsteroidTrajectory}
                            palette={palette}
                            emphasized={activeTrajectory}
                            dimmed={hasSelection && !activeTrajectory}
                            onFocusPoint={activeTrajectory ? handleFocusPoint : undefined}
                        />
                    );
                })}
        </group>
    );
}
