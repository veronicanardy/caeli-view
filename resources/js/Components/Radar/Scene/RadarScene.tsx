/**
 * Compositor principal da cena radar.
 *
 * Responsabilidade: arbitrar entre modo radar e modo órbita, montar corpos,
 * camadas, labels, oclusores e câmera a partir de dados já preparados. Não busca
 * APIs, não calcula ranking e não transforma dados orbitais em nova verdade física.
 */

import { OrbitControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import { LINEAR_AU_SCALE, LINEAR_SCALE_FACTOR, buildHeliocentricOrbit, scaleEphemerisForLinear } from '@/lib/sceneEphemeris';
import { focusedOrbitSamplePosition } from '@/lib/radar/trajectorySampling';
import { OrbitLineHelio } from '../Trajectory/HeliocentricLines';
import { AsteroidMarker } from '../Bodies/Asteroid/AsteroidMarker';
import { OBJECT_PALETTE } from '@/lib/radar/palette';
import { EARTH_RADIUS_DL } from '@/lib/radar/bodyScale';
import { Sun } from '../Bodies/Sun/Sun';
import { Earth } from '../Bodies/Earth/Earth';
import { Moon } from '../Bodies/Moon/Moon';
import { MoonOrbit } from '../Bodies/Moon/MoonOrbit';
import { SceneRingsLayer } from '../Overlays/SceneRingsLayer';
import { StarField } from '../Overlays/StarField';
import { LabelOccluderContext, SceneObjectOccludersContext, useCompactLabelMode, useHideAsteroidLabelsMode } from '../Overlays/SceneLabels';
import { HeliocentricScene } from './HeliocentricScene';
import { AsteroidSceneLayer } from './AsteroidSceneLayer';
import { CameraRig } from './CameraRig';
import { MAX_CAMERA_DISTANCE } from './cameraConstants';
import type { FocusFraming } from './cameraFraming';
import type { CameraIntent } from './cameraIntent';
import { InertialZoom } from './InertialZoom';
import { KeyboardPan } from './KeyboardPan';
import { TouchGestures } from './TouchGestures';
import { PlanetLayer } from './PlanetLayer';
import { PlanetOrbitLayer } from './PlanetOrbitLayer';
import { computeLabelOccluder, focusedObjectScenePosition, shouldShowLabelForObject, shouldUseHelioScene } from './sceneFocus';
import { SUN_RADIUS_SCENE } from '../Bodies/bodyRenderConstants';
import { computeSceneObjectOccluders } from './sceneOcclusion';
import { SceneWarmup } from './SceneWarmup';
import { LabelBackdropGate } from './LabelBackdropGate';
import { computeEarthPosition, computeMoonGeoPosition, computeMoonPosition, computeSunDirection, planetScenePositions } from './scenePositions';
import { useBodyFocus } from './useBodyFocus';
import { KnownAsteroidsLayer } from './KnownAsteroidsLayer';
import { knownAsteroidId } from '../Bodies/Asteroid/knownAsteroids';
import { linearModeEnabled } from './linearMode';
// --------------- Scene ---------------

type RadarSceneProps = {
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    orbitMode: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    cameraIntent: CameraIntent;
    focusTarget: FocusFraming | null;
    panelBiasX?: number;
    panelBiasY?: number;
    ephemeris: SceneEphemeris | null;
    /** Direção Terra→Sol semeada pelo servidor até a efeméride resolver. Nunca é vetor arbitrário. */
    fallbackSunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    onFocusMercury: () => void;
    isMercuryFocused: boolean;
    onFocusVenus: () => void;
    isVenusFocused: boolean;
    onFocusMars: () => void;
    isMarsFocused: boolean;
    onFocusJupiter: () => void;
    isJupiterFocused: boolean;
    onFocusSaturn: () => void;
    isSaturnFocused: boolean;
    onFocusUranus: () => void;
    isUranusFocused: boolean;
    onFocusNeptune: () => void;
    isNeptuneFocused: boolean;
    /** Chamado quando Terra ou Lua são focados de dentro da cena (clique no label/hitbox). */
    onFocusBody: (body: 'earth' | 'moon') => void;
    onFocusSun?: () => void;
    isSunFocused?: boolean;
    /** Quando false, todas as labels 3D (planetas, asteroides, Terra, Lua) ficam ocultas. */
    showLabels?: boolean;
    /** Mostra os asteroides conhecidos (modelo exclusivo) na régua dos planetas. */
    showKnownAsteroids?: boolean;
    /** Chamado uma única vez após o primeiro frame da cena ser renderizado na GPU. */
    onFirstFrame?: () => void;
    onFocusTrajectoryPoint?: (framing: FocusFraming) => void;
};

function FirstFrameNotifier({ onFirstFrame }: { onFirstFrame: () => void }) {
    const fired = useRef(false);
    useFrame(() => {
        if (fired.current) return;
        fired.current = true;
        onFirstFrame();
    });
    return null;
}

export function RadarScene({ closestNowObjects, selectedId, orbitMode, onSelect, cameraIntent, focusTarget, panelBiasX = 0, panelBiasY = 0, ephemeris: ephemerisRaw, fallbackSunDirection, locale, onFocusMercury, isMercuryFocused, onFocusVenus, isVenusFocused, onFocusMars, isMarsFocused, onFocusJupiter, isJupiterFocused, onFocusSaturn, isSaturnFocused, onFocusUranus, isUranusFocused, onFocusNeptune, isNeptuneFocused, onFocusBody, onFocusSun, isSunFocused = false, showLabels = true, showKnownAsteroids = false, onFirstFrame, onFocusTrajectoryPoint }: RadarSceneProps) {
    // No modo linear, a cena heliocêntrica usa a escala própria (LINEAR_AU_SCALE): reescalamos o
    // ephemeris UMA vez aqui, e todos os consumidores (planetas, Terra, Lua, órbitas, câmera) herdam.
    const linearScene = linearModeEnabled();
    const ephemeris = useMemo(
        () => (linearScene && ephemerisRaw ? scaleEphemerisForLinear(ephemerisRaw) : ephemerisRaw),
        [linearScene, ephemerisRaw],
    );
    const hasSelection = selectedId !== null;
    const focusedObject = useMemo(
        () => closestNowObjects.find((object) => object.approach.id === selectedId) ?? null,
        [closestNowObjects, selectedId],
    );
    // Famosos que já têm posição real do Horizons (trajectory disponível): a camada de fallback
    // Kepler (KnownAsteroidsLayer) pula esses e só desenha os que o Horizons não resolveu, evitando
    // duplicar a rocha (uma do AsteroidSceneLayer, outra do Kepler).
    const knownWithRealPosition = useMemo(
        () => new Set(
            closestNowObjects
                .filter((o) => o.trajectory?.status === 'available')
                .map((o) => o.approach.id),
        ),
        [closestNowObjects],
    );
    // A seleção exibe a trajetória geocêntrica local. A órbita Kepleriana solar aparece somente
    // após o usuário solicitar o enquadramento recuado de órbita.
    const selectedHasOrbit = useMemo(
        () => closestNowObjects.some((object) => object.approach.id === selectedId && Boolean(object.trajectory?.orbitalElements)),
        [closestNowObjects, selectedId],
    );
    // sunDir: vetor Terra→Sol, unitário. Usado pelo shader dia/noite da Terra e fase da Lua.
    // No modelo heliocêntrico (Sol na origem), sunDir = normalize(-earthScenePosition).
    // Enquanto a efeméride não resolve, usa o fallback do servidor para não ficar escuro.
    const sunDir = useMemo(() => computeSunDirection(ephemeris, fallbackSunDirection), [ephemeris, fallbackSunDirection]);

    // Posição da Terra na cena heliocêntrica. Fallback: ~1 AU na direção oposta ao Sol do servidor.
    const earthPos = useMemo(() => computeEarthPosition(ephemeris, fallbackSunDirection), [ephemeris, fallbackSunDirection]);

    // Vetor geocêntrico da Lua — usado por orientMoonTidal e MoonOrbit. No linear vai na régua
    // heliocêntrica real (mesma dos NEOs); no log, comprimido. Recebe o ephemeris CRU para a régua
    // linear ser aplicada uma única vez (evita a dupla escala de scaleEphemerisForLinear).
    const moonGeoPos = useMemo(
        () => computeMoonGeoPosition(linearScene ? ephemerisRaw : ephemeris, linearScene),
        [linearScene, ephemerisRaw, ephemeris],
    );

    // Posição absoluta da Lua em coordenadas de mundo (earthPos + geocêntrico).
    // Usada para posicionar o <group> da Lua, labels e framing de câmera.
    const moonPos = useMemo(() => computeMoonPosition(earthPos, moonGeoPos), [earthPos, moonGeoPos]);

    // Normal real do plano orbital da Lua. Fallback: norte eclíptico (anel plano) até resolver.
    const moonOrbitNormal = useMemo<[number, number, number]>(
        () => ephemeris?.moonOrbitNormal ?? [0, 1, 0],
        [ephemeris],
    );

    const planetPositions = useMemo(() => planetScenePositions(ephemeris), [ephemeris]);
    const compactLabels = useCompactLabelMode();
    const hideAsteroidLabels = useHideAsteroidLabelsMode();

    // Foco Terra/Lua fica em hook local para preservar a precedência: seleção > corpo > preset.
    // useCallback evita que funções novas sejam criadas a cada render de RadarScene.
    const focusEarth = useCallback(() => onFocusBody('earth'), [onFocusBody]);
    const focusMoon  = useCallback(() => onFocusBody('moon'),  [onFocusBody]);
    const { bodyFocus, activeFocus, focusNonce } = useBodyFocus({
        cameraIntent,
        focusTarget,
        earthPos,
        moonPos,
        sunDir,
    });

    const orbitLabelsOnly = orbitMode && selectedHasOrbit;

    // Labels visíveis para todos os objetos enquanto a câmera não estiver muito afastada.
    // Só some quando hideAsteroidLabels (câmera muito longe) — independente do limite de objetos.
    // Também respeita o toggle global showLabels.
    const showLabelForObject = useCallback(
        (id: string) => shouldShowLabelForObject({ id, selectedId, showLabels, orbitLabelsOnly, hideAsteroidLabels }),
        [selectedId, showLabels, orbitLabelsOnly, hideAsteroidLabels],
    );

    // useMemo evita que novos objetos sejam criados a cada render, prevenindo
    // invalidação desnecessária dos contextos LabelOccluder e SceneObjectOccluders.
    const focusedObjectPosition = useMemo(
        () => focusedObjectScenePosition(focusedObject, earthPos),
        [focusedObject, earthPos],
    );
    const labelOccluder = useMemo(
        () => computeLabelOccluder({ bodyFocus, earthPos, moonPos, focusedObjectPosition }),
        [bodyFocus, earthPos, moonPos, focusedObjectPosition],
    );
    // No modo linear NUNCA trocamos para a cena heliocêntrica isolada (HeliocentricScene): o linear
    // já é a cena heliocêntrica real, com a Terra de contexto. Aqui `orbitMode` deixa de "trocar de
    // cena" e passa a só REVELAR a órbita completa do NEO sobreposta (linearShowFullOrbit, abaixo).
    const useHelioScene = !linearScene && shouldUseHelioScene(orbitMode, selectedHasOrbit, focusedObject);
    // [Modo linear] Órbita heliocêntrica completa só sob demanda (botão "Ver a órbita ao redor do
    // Sol"). Por padrão mostramos só a trajetória curta de aproximação (pergunta-radar).
    const linearShowFullOrbit = linearScene && orbitMode;
    const sceneObjectOccluders = useMemo(
        () => computeSceneObjectOccluders({
            useHelioScene,
            earthPos,
            moonPos,
            planetPositions,
        }),
        [earthPos, moonPos, planetPositions, useHelioScene],
    );

    // Arbitragem de modo: a cena solar-orbital toma conta quando (a) o usuário pediu modo órbita
    // E (b) o objeto selecionado tem elementos osculadores com época utilizável (tpJd ≠ 0).
    // Caso contrário permanece no modo radar. Misturar ambas as camadas no mesmo
    // frame era o bug corrigido pela separação de modos: o asteroide nunca ficava sobre sua elipse
    // desenhada pois viviam em regras de escala diferentes.
    const focusedElements = focusedObject?.trajectory?.orbitalElements ?? null;
    const focusedPalette = focusedObject
        ? OBJECT_PALETTE[Math.max(0, closestNowObjects.findIndex((o) => o.approach.id === focusedObject.approach.id)) % OBJECT_PALETTE.length]
        : OBJECT_PALETTE[0];

    // [Modo linear] Órbita heliocêntrica COMPLETA do NEO selecionado, ao redor do Sol (como os
    // planetas). Construída na escala normal (ORBIT_AU_SCALE) e reescalada pelo grupo abaixo para
    // bater com a régua linear — reusa a mesma geometria dos planetas, sem duplicar matemática.
    const linearFocusOrbit = useMemo(
        () => (linearScene && focusedElements ? buildHeliocentricOrbit(focusedElements) : null),
        [linearScene, focusedElements],
    );

    // [Modo linear] Posição da rocha focada AMOSTRADA NA PRÓPRIA órbita desenhada (não no ponto
    // Horizons), igual aos planetas: cai exatamente sobre a linha. Vem em ORBIT_AU_SCALE, então
    // aplicamos LINEAR_SCALE_FACTOR aqui — a MESMA transformação que o <group> aplica à linha.
    // Só vale quando a órbita está VISÍVEL (sob demanda): aí a rocha deve coincidir com a elipse.
    // Sem a órbita, a rocha volta a vir do Horizons (AsteroidSceneLayer), no fim da trajetória curta.
    const linearFocusBodyPosition = useMemo<[number, number, number] | null>(() => {
        if (!linearShowFullOrbit || !focusedElements) return null;
        const sample = focusedOrbitSamplePosition(focusedElements);
        if (!sample) return null;
        return [sample[0] * LINEAR_SCALE_FACTOR, sample[1] * LINEAR_SCALE_FACTOR, sample[2] * LINEAR_SCALE_FACTOR];
    }, [linearShowFullOrbit, focusedElements]);

    return (
        <SceneObjectOccludersContext.Provider value={sceneObjectOccluders}>
            <LabelOccluderContext.Provider value={labelOccluder}>
                <color attach="background" args={['#03060d']} />
                {/* Campo estelar estático — contexto visual de profundidade espacial. */}
                <StarField />
                {/* Iluminação global compartilhada por todos os asteroides da cena.
                    Intensidades somadas a partir do rig anterior por marcador (ambient 0.28 + hemi 0.12)
                    mais a base de cena (0.16), centralizadas aqui para evitar N luzes duplicadas. */}
                {/* Ambient mais baixo = sombras mais profundas; direcional mais alto = mais contraste. */}
                <ambientLight intensity={0.28} />
                <hemisphereLight intensity={0.10} color="#6a7e92" groundColor="#1e1a16" />
                <directionalLight position={[1.7, 0.5, 2.3]} intensity={0.52} color="#e8dcc8" />
                <pointLight position={[-1.6, -0.3, -1.2]} intensity={0.1} distance={3.1} color="#5a6a7a" />
                <pointLight position={[-1.4, 0.9, 1.6]} intensity={0.18} distance={3.2} color="#8aa0b4" />

            {useHelioScene && focusedElements && focusedObject ? (
                <HeliocentricScene
                    elements={focusedElements}
                    asteroidName={focusedObject.approach.displayName ?? focusedObject.approach.name}
                    color={focusedPalette.future}
                    locale={locale}
                />
            ) : (
                <>
                    {/* Sol na origem da cena heliocêntrica. */}
                    <Sun
                        position={[0, 0, 0]}
                        radius={SUN_RADIUS_SCENE}
                        locale={locale}
                        withLighting
                        onFocus={onFocusSun}
                        isFocused={isSunFocused}
                        showLabel={showLabels}
                    />
                    {/* [Modo linear] No modo órbita Kepler deixamos só o Sol e a rocha focada com sua
                        elipse: Terra, Lua e os demais planetas (e suas órbitas) somem para a elipse do
                        objeto ser lida sem ruído. Fora do modo órbita, a cena completa volta. */}
                    {!linearShowFullOrbit ? (
                        <>
                            {/* Terra na posição heliocêntrica real. */}
                            <group position={earthPos}>
                                <Earth
                                    onFocus={focusEarth}
                                    sunDirection={sunDir}
                                    subsolarLatDeg={ephemeris?.subsolarLatDeg ?? 0}
                                    subsolarLonDeg={ephemeris?.subsolarLonDeg ?? 0}
                                    showLabel={showLabels && !orbitLabelsOnly}
                                    protectLabelFromFocus={bodyFocus?.body !== 'earth'}
                                    isFocused={bodyFocus?.body === 'earth'}
                                />
                                <SceneRingsLayer onEarthFocus={focusEarth} showLabels={showLabels && !compactLabels && !orbitLabelsOnly} />
                            </group>
                            {/* Lua: position absoluto para o grupo 3D e labels; geocentricPosition para tidal lock. */}
                            <Moon onFocus={focusMoon} position={moonPos} geocentricPosition={moonGeoPos} compactLabel={compactLabels} showLabel={showLabels && !orbitLabelsOnly} protectLabelFromFocus={bodyFocus?.body !== 'moon'} isFocused={bodyFocus?.body === 'moon'} isApproximate={!ephemeris} locale={locale} illuminatedFraction={ephemeris?.moonIlluminatedFraction} radiusScale={linearScene ? 0.54 : 1} />
                            {showLabels ? <MoonOrbit moonPos={moonPos} earthPos={earthPos} orbitNormal={moonOrbitNormal} /> : null}
                            {/* Planetas — posições heliocêntricas reais, Sol na origem. */}
                            <PlanetLayer
                                {...planetPositions}
                                locale={locale}
                                showLabels={showLabels}
                                onFocusMercury={onFocusMercury}
                                isMercuryFocused={isMercuryFocused}
                                onFocusVenus={onFocusVenus}
                                isVenusFocused={isVenusFocused}
                                onFocusMars={onFocusMars}
                                isMarsFocused={isMarsFocused}
                                onFocusJupiter={onFocusJupiter}
                                isJupiterFocused={isJupiterFocused}
                                onFocusSaturn={onFocusSaturn}
                                isSaturnFocused={isSaturnFocused}
                                onFocusUranus={onFocusUranus}
                                isUranusFocused={isUranusFocused}
                                onFocusNeptune={onFocusNeptune}
                                isNeptuneFocused={isNeptuneFocused}
                            />
                            {/* Elipses orbitais — longitude do periélio calculada dinamicamente da efeméride. */}
                            <PlanetOrbitLayer ephemeris={ephemeris} show={showLabels && !orbitLabelsOnly} />
                        </>
                    ) : null}

                    {/* [Modo linear] Órbita completa do NEO ao redor do Sol — só sob demanda (botão
                        "Ver a órbita ao redor do Sol" → orbitMode). Por padrão a cena mostra apenas a
                        trajetória curta de aproximação. O grupo reescala a geometria (ORBIT_AU_SCALE)
                        para a régua linear. */}
                    {linearShowFullOrbit && linearFocusOrbit ? (
                        <group scale={LINEAR_SCALE_FACTOR}>
                            <OrbitLineHelio points={linearFocusOrbit} color={focusedPalette.future} opacity={0.5} />
                        </group>
                    ) : null}

                    {/* [Modo linear] Rocha focada SOBRE a própria órbita (amostrada da polilinha, não
                        do ponto Horizons): cai exatamente na linha. Fora do <group> escalado porque a
                        posição já leva o LINEAR_SCALE_FACTOR; assim o ponto coincide com a linha sem
                        que a escala do grupo também aumente o tamanho do modelo. */}
                    {linearFocusBodyPosition && focusedObject ? (
                        <AsteroidMarker
                            object={focusedObject}
                            position={linearFocusBodyPosition}
                            isSelected
                            dimmed={false}
                            onSelect={onSelect}
                            showLabel={showLabelForObject(focusedObject.approach.id)}
                            protectLabelFromFocus={false}
                            paletteColor={focusedPalette.future}
                            showLabels={showLabels}
                        />
                    ) : null}

                    {/* Asteroides e trajetórias: vetores Horizons log-comprimidos, offsetados pela Terra na cena.
                        No modo órbita Kepler (elipse visível) a camada inteira some: a rocha focada já é
                        desenhada sobre a elipse (linearFocusBodyPosition acima), e queremos só ela + o Sol,
                        sem os demais objetos nem a trilha curta. */}
                    {!(linearShowFullOrbit && linearFocusOrbit) ? (
                        <AsteroidSceneLayer
                            closestNowObjects={closestNowObjects}
                            selectedId={selectedId}
                            hasSelection={hasSelection}
                            earthPos={earthPos}
                            onSelect={onSelect}
                            showLabels={showLabels}
                            showLabelForObject={showLabelForObject}
                            onFocusTrajectoryPoint={onFocusTrajectoryPoint}
                            panelBiasX={panelBiasX}
                            panelBiasY={panelBiasY}
                            helioScene={linearModeEnabled()}
                            earthHelioAU={ephemeris?.earthHelioPositionAU ?? null}
                            skipObjectId={linearFocusBodyPosition ? focusedObject?.approach.id ?? null : null}
                        />
                    ) : null}

                    {/* Conhecidos com modelo exclusivo: fallback de posição. Os famosos agora fluem
                        pelo AsteroidSceneLayer com posição real do Horizons. Esta camada só desenha
                        (via Kepler local) os famosos cujo Horizons falhou (trajectory null) — para que
                        nenhum famoso suma da cena. Os que têm posição real são pulados via skipIds. */}
                    {showKnownAsteroids && !(linearShowFullOrbit && linearFocusOrbit) ? (
                        <KnownAsteroidsLayer
                            showLabels={showLabels}
                            selectedId={selectedId}
                            auScale={linearModeEnabled() ? LINEAR_AU_SCALE : undefined}
                            skipIds={knownWithRealPosition}
                            onSelect={(known) => {
                                const object = closestNowObjects.find((o) => o.approach.id === knownAsteroidId(known));
                                if (object) onSelect(object.approach);
                            }}
                        />
                    ) : null}
                </>
            )}

            {onFirstFrame && <FirstFrameNotifier onFirstFrame={onFirstFrame} />}

            {/* Pré-compila shaders e sobe texturas em momentos ociosos para que revelar
                objetos novos ao rotacionar a câmera não congele o main thread. */}
            <SceneWarmup revision={`${closestNowObjects.length}:${useHelioScene ? 'helio' : 'geo'}`} />

            {/* Suspende o backdrop-blur dos labels enquanto a câmera se move (caro de compor). */}
            <LabelBackdropGate />

            <OrbitControls
                makeDefault
                enablePan
                enableDamping
                // Menor damping = deslize mais longo e suave após rotação/pan.
                dampingFactor={0.05}
                // O zoom é tratado pelo <InertialZoom> abaixo (dolly deslizante), então o zoom
                // de roda nativo está desabilitado para evitar dois sistemas conflitando no dolly.
                enableZoom={false}
                // Não deixa a câmera mergulhar na Terra: mantém distância mínima acima do brilho.
                minDistance={EARTH_RADIUS_DL * 2.2}
                // Recua o suficiente para ver órbitas completas de asteroides selecionados.
                maxDistance={MAX_CAMERA_DISTANCE}
                rotateSpeed={0.8}
                panSpeed={0.6}
            />

            <InertialZoom minDistance={EARTH_RADIUS_DL * 2.2} maxDistance={MAX_CAMERA_DISTANCE} />
            <TouchGestures minDistance={EARTH_RADIUS_DL * 2.2} maxDistance={MAX_CAMERA_DISTANCE} />
            <KeyboardPan />

                <CameraRig
                    view={cameraIntent.view}
                    viewNonce={cameraIntent.kind === 'preset' ? cameraIntent.nonce : 0}
                    focusTarget={activeFocus}
                    focusNonce={focusNonce}
                    earthPos={earthPos}
                    sunDir={sunDir}
                    panelBiasX={panelBiasX}
                    panelBiasY={panelBiasY}
                />
            </LabelOccluderContext.Provider>
        </SceneObjectOccludersContext.Provider>
    );
}
