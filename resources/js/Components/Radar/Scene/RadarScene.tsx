/**
 * Compositor principal da cena radar.
 *
 * Responsabilidade: arbitrar entre modo radar e modo órbita, montar corpos,
 * camadas, labels, oclusores e câmera a partir de dados já preparados. Não busca
 * APIs, não calcula ranking e não transforma dados orbitais em nova verdade física.
 */

import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import { LINEAR_AU_SCALE, buildHeliocentricOrbit } from '@/lib/sceneEphemeris';
import { currentPositionInHelioScene, focusedOrbitSamplePosition, hasRenderableHelioPosition } from '@/lib/radar/trajectorySampling';
import { allBodyTexturesSettled, getBodyTextureProgress } from '@/lib/radar/bodyTextureRegistry';
import { OrbitLineHelio } from '../Trajectory/HeliocentricLines';
import { AsteroidMarker, symbolicRockRadiusForApproach } from '../Bodies/Asteroid/AsteroidMarker';
import { OBJECT_PALETTE } from '@/lib/radar/palette';
import { Sun } from '../Bodies/Sun/Sun';
import { Earth } from '../Bodies/Earth/Earth';
import { Moon } from '../Bodies/Moon/Moon';
import { MoonOrbit } from '../Bodies/Moon/MoonOrbit';
import { SceneRingsLayer } from '../Overlays/SceneRingsLayer';
import { StarField } from '../Overlays/StarField';
import { LabelOccluderContext, RadarLabelResolutionProvider, SceneObjectOccludersContext, useCompactLabelMode } from '../Overlays/SceneLabels';
import { AsteroidSceneLayer } from './AsteroidSceneLayer';
import { CameraRig } from './CameraRig';
import { MAX_CAMERA_DISTANCE, resolveMinZoomDistance } from './cameraConstants';
import type { FocusFraming } from './cameraFraming';
import type { CameraIntent } from './cameraIntent';
import { InertialZoom } from './InertialZoom';
import { KeyboardPan } from './KeyboardPan';
import { TouchGestures } from './TouchGestures';
import { PlanetLayer } from './PlanetLayer';
import type { PlanetId } from './planetConfig';
import { PlanetOrbitLayer } from './PlanetOrbitLayer';
import { computeLabelOccluder, focusedObjectScenePosition, shouldShowLabelForObject } from './sceneFocus';
import { SUN_RADIUS_SCENE } from '../Bodies/bodyRenderConstants';
import { computeSceneObjectOccluders } from './sceneOcclusion';
import { SceneWarmup } from './SceneWarmup';
import { warmupSceneOnce } from './sceneWarmupGpu';
import { LabelBackdropGate } from './LabelBackdropGate';
import { computeEarthPosition, computeMoonGeoPosition, computeMoonPosition, computeSunDirection, planetScenePositions } from './scenePositions';
import { useBodyFocus } from './useBodyFocus';
import { KnownAsteroidsLayer } from './KnownAsteroidsLayer';
import { KnownCometsLayer } from './KnownCometsLayer';
import { KnownSpacecraftLayer } from './KnownSpacecraftLayer';
import { knownAsteroidId } from '../Bodies/Asteroid/knownAsteroids';
import { knownCometById, knownCometId } from '../Bodies/Comet/knownComets';
import { SPACECRAFT_VISUAL_SCALE, type KnownSpacecraft, type LiveSpacecraftPositions } from '../Bodies/Spacecraft/knownSpacecraft';
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
    /** Foca a câmera no planeta clicado (label/hitbox da cena). */
    onFocusPlanet: (id: PlanetId) => void;
    /** Planeta com card aberto (realce de foco), ou null. */
    focusedPlanetId?: PlanetId | null;
    /** Chamado quando Terra ou Lua são focados de dentro da cena (clique no label/hitbox). */
    onFocusBody: (body: 'earth' | 'moon') => void;
    onFocusSun?: () => void;
    isSunFocused?: boolean;
    /** Quando false, todas as labels 3D (planetas, asteroides, Terra, Lua) ficam ocultas. */
    showLabels?: boolean;
    /** Quando false, pan/rotate/zoom/teclado da cena ficam bloqueados pelo tutorial. */
    sceneNavigationEnabled?: boolean;
    /** Mostra os asteroides conhecidos (modelo exclusivo) na régua dos planetas. */
    showKnownAsteroids?: boolean;
    /** Id da nave selecionada (knownSpacecraftId), realça o marcador na cena. */
    selectedSpacecraftId?: string | null;
    /** Foca/seleciona uma nave a partir do clique no marcador da cena. */
    onFocusSpacecraft?: (craft: KnownSpacecraft) => void;
    /** Posições ao vivo das naves (Horizons). Naves ausentes usam o vetor fixo local. */
    spacecraftPositions?: LiveSpacecraftPositions;
    /** Chamado uma única vez após o primeiro frame da cena ser renderizado na GPU. */
    onFirstFrame?: () => void;
    onFocusTrajectoryPoint?: (framing: FocusFraming) => void;
};

/**
 * Tempo máximo (ms) que o "Pronto" espera pelas texturas dos corpos depois do primeiro
 * frame. Rede de segurança: se uma textura demorar demais ou nunca chegar (mesmo já
 * contando falhas como resolvidas), a barra conclui assim mesmo, nunca prendendo o
 * usuário no carregamento. Em condições normais as texturas resolvem antes disso.
 */
const TEXTURE_WAIT_TIMEOUT_MS = 8000;

/**
 * Tempo máximo (ms) que o "Pronto" espera o aquecimento da GPU (compilar shaders + subir
 * texturas) depois das texturas baixadas. Outra rede de segurança: se o `compileAsync`
 * travar ou demorar, conclui assim mesmo em vez de prender o usuário no carregamento.
 */
const WARMUP_TIMEOUT_MS = 6000;

/**
 * Dispara `onFirstFrame` (conclusão da barra de carregamento) só depois de:
 *   1. o primeiro frame ter pintado;
 *   2. as texturas dos corpos terem baixado (evita o "estalo" de ver Terra, Lua, Sol e
 *      planetas vestirem a textura depois que a barra some);
 *   3. a GPU estar AQUECIDA (shaders compilados e texturas enviadas via `warmupSceneOnce`),
 *      pago atrás do overlay para não congelar o primeiro gesto de câmera após entrar.
 *
 * Cada espera tem timeout de segurança próprio, então nada prende o usuário no carregamento.
 */
function FirstFrameNotifier({ onFirstFrame }: { onFirstFrame: () => void }) {
    const gl = useThree((s) => s.gl);
    const scene = useThree((s) => s.scene);
    const camera = useThree((s) => s.camera);
    const uploadedTextures = useRef(new WeakSet<THREE.Texture>());

    const fired = useRef(false);
    // Etapa 2→3: aquecimento iniciado e concluído.
    const warmupStarted = useRef(false);
    const warmupDone = useRef(false);
    // Timeouts de segurança de cada etapa.
    const texturesDeadline = useRef(false);
    const warmupDeadline = useRef(false);

    useEffect(() => {
        const t = setTimeout(() => { texturesDeadline.current = true; }, TEXTURE_WAIT_TIMEOUT_MS);
        return () => clearTimeout(t);
    }, []);

    useFrame(() => {
        if (fired.current) return;

        // Etapa 2: o primeiro frame já pintou (cena visível, ainda com materiais de
        // fallback). Espera as texturas dos corpos baixarem antes de aquecer.
        const texturesReady = allBodyTexturesSettled(getBodyTextureProgress());
        if (!texturesReady && !texturesDeadline.current) return;

        // Etapa 3: texturas baixadas. Aquece a GPU UMA vez, atrás do overlay; o engasgo
        // de upload/compilação acontece aqui, escondido, em vez de no primeiro gesto.
        if (!warmupStarted.current) {
            warmupStarted.current = true;
            const warmupTimer = setTimeout(() => { warmupDeadline.current = true; }, WARMUP_TIMEOUT_MS);
            warmupSceneOnce(gl, scene, camera, uploadedTextures.current)
                .finally(() => {
                    clearTimeout(warmupTimer);
                    warmupDone.current = true;
                });
        }

        if (!warmupDone.current && !warmupDeadline.current) return;

        fired.current = true;
        onFirstFrame();
    });
    return null;
}

export function RadarScene({ closestNowObjects, selectedId, orbitMode, onSelect, cameraIntent, focusTarget, panelBiasX = 0, panelBiasY = 0, ephemeris, fallbackSunDirection, locale, onFocusPlanet, focusedPlanetId = null, onFocusBody, onFocusSun, isSunFocused = false, showLabels = true, sceneNavigationEnabled = true, showKnownAsteroids = false, selectedSpacecraftId = null, onFocusSpacecraft, spacecraftPositions, onFirstFrame, onFocusTrajectoryPoint }: RadarSceneProps) {
    // A cena heliocêntrica usa a régua única em UA (LINEAR_AU_SCALE): a efeméride já chega nela
    // (computeSceneEphemeris gera as posições direto na régua), sem reescalonamento intermediário.
    const hasSelection = selectedId !== null;
    const focusedObject = useMemo(
        () => closestNowObjects.find((object) => object.approach.id === selectedId) ?? null,
        [closestNowObjects, selectedId],
    );
    // Famosos que o AsteroidSceneLayer realmente vai desenhar (ponto do Horizons dentro do limite de
    // render): a camada de fallback Kepler (KnownAsteroidsLayer/KnownCometsLayer) pula esses e só
    // desenha os demais, evitando duplicar o corpo. Usa hasRenderableHelioPosition (não só
    // status==='available') porque cometas distantes têm trajetória disponível mas ponto além do
    // limite: o feed os descarta, então o fallback Kepler PRECISA desenhá-los, senão somem da cena.
    const knownWithRealPosition = useMemo(
        () => new Set(
            closestNowObjects
                .filter((o) => hasRenderableHelioPosition(o))
                .map((o) => o.approach.id),
        ),
        [closestNowObjects],
    );
    // Naves NÃO passam pelo AsteroidSceneLayer: o AsteroidMarker só sabe desenhar rocha/cometa e
    // pintaria uma nave como rocha. Elas são SEMPRE desenhadas pela KnownSpacecraftLayer (marcador
    // estilizado), com a posição heliocêntrica fixa. Removê-las aqui evita o corpo duplicado/errado.
    const naturalBodyObjects = useMemo(
        () => closestNowObjects.filter((o) => o.approach.objectType !== 'spacecraft'),
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

    // Vetor geocêntrico da Lua — usado por orientMoonTidal e MoonOrbit. Vai na régua heliocêntrica
    // real (mesma dos NEOs): computeMoonGeoPosition converte os DL crus de moonScenePosition para
    // unidades da régua única (LINEAR_UNITS_PER_DL).
    const moonGeoPos = useMemo(
        () => computeMoonGeoPosition(ephemeris),
        [ephemeris],
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

    // Piso de zoom: chegar perto é igual para todo corpo (mesmo das rochas/famosas). O piso BASE é único
    // (ROCK_MIN_DISTANCE), mas precisa contar o raio do corpo colável selecionado: uma rocha grande/
    // desconhecida (ou a nave) furava o near plane antes de a câmera bater no piso fixo, então o piso é
    // empurrado para `near + raio + folga` quando há um corpo selecionado com raio não-desprezível. Sem
    // seleção colável (planeta/Terra/Lua/Sol focam longe via raio × 12), o raio é 0 e fica no piso base.
    const selectedBodyRadius = useMemo(() => {
        if (focusedObject) return symbolicRockRadiusForApproach(focusedObject.approach);
        if (selectedSpacecraftId) return SPACECRAFT_VISUAL_SCALE;
        return 0;
    }, [focusedObject, selectedSpacecraftId]);
    const minZoomDistance = resolveMinZoomDistance(selectedBodyRadius);

    // Labels visíveis para todos os objetos enquanto a câmera não estiver muito afastada.
    // No modo "Asteroides famosos" o enquadramento começa longe de propósito; nesse caso
    // mantemos os nomes ligados para os corpos serem identificáveis sem seleção.
    // Também respeita o toggle global showLabels.
    const showLabelForObject = useCallback(
        (id: string) => shouldShowLabelForObject({
            id,
            selectedId,
            showLabels,
            orbitLabelsOnly,
        }),
        [selectedId, showLabels, orbitLabelsOnly],
    );

    // useMemo evita que novos objetos sejam criados a cada render, prevenindo
    // invalidação desnecessária dos contextos LabelOccluder e SceneObjectOccluders.
    const focusedObjectPosition = useMemo(
        () => focusedObjectScenePosition(focusedObject, ephemeris?.earthHelioPositionAU ?? null),
        [focusedObject, ephemeris?.earthHelioPositionAU],
    );
    const labelOccluder = useMemo(
        () => computeLabelOccluder({ bodyFocus, earthPos, moonPos, focusedObjectPosition }),
        [bodyFocus, earthPos, moonPos, focusedObjectPosition],
    );
    // A cena nunca troca para a cena heliocêntrica isolada: a régua linear já É a cena heliocêntrica
    // real, com a Terra de contexto. `orbitMode` apenas REVELA a órbita completa do NEO sobreposta
    // (showFullOrbit, abaixo), sob demanda (botão "Ver a órbita ao redor do Sol").
    const showFullOrbit = orbitMode;
    const sceneObjectOccluders = useMemo(
        () => {
            const bodyOccluders = computeSceneObjectOccluders({
                earthPos,
                moonPos,
                planetPositions,
            });
            const asteroidOccluders = ephemeris?.earthHelioPositionAU
                ? closestNowObjects.flatMap((object) => {
                    const position = currentPositionInHelioScene(object, ephemeris.earthHelioPositionAU);
                    if (!position) return [];
                    return [{
                        id: `asteroid:${object.approach.id}`,
                        center: new THREE.Vector3(...position),
                        radius: Math.max(symbolicRockRadiusForApproach(object.approach), 0.05),
                    }];
                })
                : [];
            return [...bodyOccluders, ...asteroidOccluders];
        },
        [closestNowObjects, earthPos, ephemeris?.earthHelioPositionAU, moonPos, planetPositions],
    );

    // Arbitragem de modo: a cena solar-orbital toma conta quando (a) o usuário pediu modo órbita
    // E (b) o objeto selecionado tem elementos osculadores com época utilizável (tpJd ≠ 0).
    // Caso contrário permanece no modo radar. Misturar ambas as camadas no mesmo
    // frame era o bug corrigido pela separação de modos: o asteroide nunca ficava sobre sua elipse
    // desenhada pois viviam em regras de escala diferentes.
    // Elementos da órbita: do Horizons quando há; senão, do catálogo local (cometa famoso sem feed, ex.:
    // Halley). Assim o botão "Ver a órbita" funciona pro Halley igual aos outros — temos a órbita dele.
    const focusedElements = focusedObject?.trajectory?.orbitalElements
        ?? (focusedObject ? knownCometById(focusedObject.approach.id)?.elements ?? null : null);
    const focusedPalette = focusedObject
        ? OBJECT_PALETTE[Math.max(0, closestNowObjects.findIndex((o) => o.approach.id === focusedObject.approach.id)) % OBJECT_PALETTE.length]
        : OBJECT_PALETTE[0];

    // Órbita heliocêntrica COMPLETA do NEO selecionado, ao redor do Sol (como os planetas).
    // Construída na régua única (LINEAR_AU_SCALE) — reusa a mesma geometria dos planetas, sem
    // duplicar matemática.
    const focusOrbit = useMemo(
        () => (focusedElements ? buildHeliocentricOrbit(focusedElements) : null),
        [focusedElements],
    );

    // Posição da rocha focada AMOSTRADA NA PRÓPRIA órbita desenhada (não no ponto Horizons), igual
    // aos planetas: cai exatamente sobre a linha (já na régua única). Só vale quando a órbita está
    // VISÍVEL (sob demanda): aí a rocha deve coincidir com a elipse. Sem a órbita, a rocha volta a
    // vir do Horizons (AsteroidSceneLayer), no fim da trajetória curta.
    const focusBodyPosition = useMemo<[number, number, number] | null>(() => {
        if (!showFullOrbit || !focusedElements) return null;
        return focusedOrbitSamplePosition(focusedElements);
    }, [showFullOrbit, focusedElements]);

    return (
        <SceneObjectOccludersContext.Provider value={sceneObjectOccluders}>
            <LabelOccluderContext.Provider value={labelOccluder}>
                <RadarLabelResolutionProvider>
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
                    {/* No modo órbita Kepler deixamos só o Sol e a rocha focada com sua elipse: Terra,
                        Lua e os demais planetas (e suas órbitas) somem para a elipse do objeto ser lida
                        sem ruído. Fora do modo órbita, a cena completa volta. */}
                    {!showFullOrbit ? (
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
                                    locale={locale}
                                />
                                <SceneRingsLayer onEarthFocus={focusEarth} showLabels={showLabels && !compactLabels && !orbitLabelsOnly} />
                            </group>
                            {/* Lua: position absoluto para o grupo 3D e labels; geocentricPosition para tidal lock. */}
                            <Moon onFocus={focusMoon} position={moonPos} geocentricPosition={moonGeoPos} compactLabel={compactLabels} showLabel={showLabels && !orbitLabelsOnly} protectLabelFromFocus={bodyFocus?.body !== 'moon'} isFocused={bodyFocus?.body === 'moon'} isApproximate={!ephemeris} locale={locale} illuminatedFraction={ephemeris?.moonIlluminatedFraction} radiusScale={0.54} />
                            {showLabels ? <MoonOrbit moonPos={moonPos} earthPos={earthPos} orbitNormal={moonOrbitNormal} /> : null}
                            {/* Planetas — posições heliocêntricas reais, Sol na origem. */}
                            <PlanetLayer
                                positions={planetPositions}
                                locale={locale}
                                showLabels={showLabels}
                                onFocusPlanet={onFocusPlanet}
                                focusedPlanetId={focusedPlanetId}
                            />
                            {/* Elipses orbitais — longitude do periélio calculada dinamicamente da efeméride. */}
                            <PlanetOrbitLayer ephemeris={ephemeris} show={showLabels && !orbitLabelsOnly} />
                        </>
                    ) : null}

                    {/* Órbita completa do NEO ao redor do Sol — só sob demanda (botão "Ver a órbita ao
                        redor do Sol" → orbitMode). Por padrão a cena mostra apenas a trajetória curta de
                        aproximação. Já construída na régua única, sem reescalonamento. */}
                    {showFullOrbit && focusOrbit ? (
                        <OrbitLineHelio points={focusOrbit} color={focusedPalette.future} opacity={0.5} />
                    ) : null}

                    {/* Rocha focada SOBRE a própria órbita (amostrada da polilinha, não do ponto
                        Horizons): cai exatamente na linha, ambas já na régua única. */}
                    {focusBodyPosition && focusedObject ? (
                        <AsteroidMarker
                            object={focusedObject}
                            position={focusBodyPosition}
                            isSelected
                            dimmed={false}
                            onSelect={onSelect}
                            showLabel={showLabelForObject(focusedObject.approach.id)}
                            protectLabelFromFocus={false}
                            paletteColor={focusedPalette.future}
                            showLabels={showLabels}
                        />
                    ) : null}

                    {/* Asteroides e trajetórias. Os vetores Horizons caem na régua heliocêntrica linear
                        (Sol na origem, sem compressão).
                        No modo órbita Kepler (elipse visível) a camada inteira some: a rocha focada já é
                        desenhada sobre a elipse (focusBodyPosition acima), e queremos só ela + o Sol,
                        sem os demais objetos nem a trilha curta. */}
                    {!(showFullOrbit && focusOrbit) ? (
                        <AsteroidSceneLayer
                            closestNowObjects={naturalBodyObjects}
                            selectedId={selectedId}
                            hasSelection={hasSelection}
                            onSelect={onSelect}
                            showLabels={showLabels}
                            showLabelForObject={showLabelForObject}
                            onFocusTrajectoryPoint={onFocusTrajectoryPoint}
                            panelBiasX={panelBiasX}
                            panelBiasY={panelBiasY}
                            earthHelioAU={ephemeris?.earthHelioPositionAU ?? null}
                            skipObjectId={focusBodyPosition ? focusedObject?.approach.id ?? null : null}
                        />
                    ) : null}

                    {/* Conhecidos com modelo exclusivo: fallback de posição. Os famosos agora fluem
                        pelo AsteroidSceneLayer com posição real do Horizons. Esta camada só desenha
                        (via Kepler local) os famosos cujo Horizons falhou (trajectory null) — para que
                        nenhum famoso suma da cena. Os que têm posição real são pulados via skipIds. */}
                    {showKnownAsteroids && !(showFullOrbit && focusOrbit) ? (
                        <KnownAsteroidsLayer
                            showLabels={showLabels}
                            selectedId={selectedId}
                            auScale={LINEAR_AU_SCALE}
                            skipIds={knownWithRealPosition}
                            onSelect={(known) => {
                                const object = closestNowObjects.find((o) => o.approach.id === knownAsteroidId(known));
                                if (object) onSelect(object.approach);
                            }}
                        />
                    ) : null}

                    {/* Cometas famosos: mesmo fallback Kepler dos asteroides conhecidos, para que nenhum
                        cometa suma quando o Horizons falha. Modelo genérico recolorido (sem GLB próprio). */}
                    {showKnownAsteroids && !(showFullOrbit && focusOrbit) ? (
                        <KnownCometsLayer
                            showLabels={showLabels}
                            selectedId={selectedId}
                            auScale={LINEAR_AU_SCALE}
                            skipIds={knownWithRealPosition}
                            onSelect={(comet) => {
                                const object = closestNowObjects.find((o) => o.approach.id === knownCometId(comet));
                                if (object) onSelect(object.approach);
                            }}
                        />
                    ) : null}

                    {/* Naves famosas: SEMPRE na cena, como os planetas (não dependem do modo famosos).
                        Modelo real na posição do Horizons (ou fallback local). earthHelioAU habilita o
                        caminho preciso Terra_exata + geoAU (James Webb a 0,01 UA da Terra). Fora da régua
                        de órbita Kepler (showFullOrbit), que isola um único corpo + Sol. Clique foca a
                        câmera e abre o card. */}
                    {!(showFullOrbit && focusOrbit) ? (
                        <KnownSpacecraftLayer
                            showLabels={showLabels}
                            selectedId={selectedSpacecraftId}
                            auScale={LINEAR_AU_SCALE}
                            livePositions={spacecraftPositions}
                            earthHelioAU={ephemeris?.earthHelioPositionAU}
                            onSelect={onFocusSpacecraft}
                        />
                    ) : null}

            {onFirstFrame && <FirstFrameNotifier onFirstFrame={onFirstFrame} />}

            {/* Pré-compila shaders e sobe texturas em momentos ociosos para que revelar
                objetos novos ao rotacionar a câmera não congele o main thread. */}
            <SceneWarmup revision={String(closestNowObjects.length)} />

            {/* Suspende o backdrop-blur dos labels enquanto a câmera se move (caro de compor). */}
            <LabelBackdropGate />

            <OrbitControls
                makeDefault
                enabled={sceneNavigationEnabled}
                enablePan
                enableDamping
                // Menor damping = deslize mais longo e suave após rotação/pan.
                dampingFactor={0.05}
                // O zoom é tratado pelo <InertialZoom> abaixo (dolly deslizante), então o zoom
                // de roda nativo está desabilitado para evitar dois sistemas conflitando no dolly.
                enableZoom={false}
                // Piso de zoom: colado na rocha selecionada, ou acima do brilho da Terra ao navegar.
                minDistance={minZoomDistance}
                // Recua o suficiente para ver órbitas completas de asteroides selecionados.
                maxDistance={MAX_CAMERA_DISTANCE}
                rotateSpeed={0.8}
                panSpeed={0.6}
            />

            {sceneNavigationEnabled ? (
                <>
                    <InertialZoom minDistance={minZoomDistance} maxDistance={MAX_CAMERA_DISTANCE} />
                    <TouchGestures minDistance={minZoomDistance} maxDistance={MAX_CAMERA_DISTANCE} />
                    <KeyboardPan />
                </>
            ) : null}

                <CameraRig
                    view={cameraIntent.view}
                    viewNonce={cameraIntent.kind === 'preset' ? cameraIntent.nonce : 0}
                    focusTarget={activeFocus}
                    focusNonce={focusNonce}
                    earthPos={earthPos}
                    sunDir={sunDir}
                    // earthPos/sunDir são fallback do servidor enquanto ephemeris for null.
                    ephemerisReady={ephemeris !== null}
                    panelBiasX={panelBiasX}
                    panelBiasY={panelBiasY}
                />
                </RadarLabelResolutionProvider>
            </LabelOccluderContext.Provider>
        </SceneObjectOccludersContext.Provider>
    );
}
