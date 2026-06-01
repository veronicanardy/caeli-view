import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import { KM_PER_LD } from '@/lib/sceneEphemeris';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { JUPITER, MARS, MERCURY, NEPTUNE, SATURN, URANUS, VENUS } from '@/lib/observatory/planetData';
import { Sun } from '../Bodies/Sun/Sun';
import { Earth } from '../Bodies/Earth/Earth';
import { Moon } from '../Bodies/Moon/Moon';
import { MoonOrbit } from '../Bodies/Moon/MoonOrbit';
import { SceneRingsLayer } from '../Overlays/SceneRingsLayer';
import { LabelOccluderContext, SceneObjectOccludersContext, useCompactLabelMode, useHideAsteroidLabelsMode } from '../Overlays/SceneLabels';
import { HeliocentricScene } from './HeliocentricScene';
import { AsteroidSceneLayer } from './AsteroidSceneLayer';
import { CameraRig } from './CameraRig';
import { MAX_CAMERA_DISTANCE } from './cameraConstants';
import { framingForBody } from './cameraFraming';
import type { FocusFraming } from './cameraFraming';
import type { CameraIntent } from './cameraIntent';
import { InertialZoom } from './InertialZoom';
import { PlanetLayer } from './PlanetLayer';
import { PlanetOrbitLayer } from './PlanetOrbitLayer';
import { computeLabelOccluder, focusedObjectScenePosition, shouldShowLabelForObject, shouldUseHelioScene } from './sceneFocus';
import type { BodyFocus } from './sceneFocus';
import { computeEarthPosition, computeMoonGeoPosition, computeMoonPosition, computeSunDirection, planetScenePositions } from './scenePositions';

const SUN_RADIUS_KM = 695_700;
const SUN_RADIUS_SCENE = SUN_RADIUS_KM / KM_PER_LD;
// --------------- Scene ---------------

type RadarSceneProps = {
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    orbitMode: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    cameraIntent: CameraIntent;
    focusTarget: FocusFraming | null;
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
};

export function RadarScene({ closestNowObjects, selectedId, orbitMode, onSelect, cameraIntent, focusTarget, ephemeris, fallbackSunDirection, locale, onFocusMercury, isMercuryFocused, onFocusVenus, isVenusFocused, onFocusMars, isMarsFocused, onFocusJupiter, isJupiterFocused, onFocusSaturn, isSaturnFocused, onFocusUranus, isUranusFocused, onFocusNeptune, isNeptuneFocused, onFocusBody, onFocusSun, isSunFocused = false, showLabels = true }: RadarSceneProps) {
    const hasSelection = selectedId !== null;
    const focusedObject = useMemo(
        () => closestNowObjects.find((object) => object.approach.id === selectedId) ?? null,
        [closestNowObjects, selectedId],
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

    // Vetor geocêntrico da Lua (log-comprimido) — usado por orientMoonTidal e MoonOrbit.
    const moonGeoPos = useMemo(() => computeMoonGeoPosition(ephemeris), [ephemeris]);

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

    // Clicar na Terra ou na Lua re-enquadra a câmera naquele corpo sem "selecioná-lo". Ambos usam
    // o mesmo enquadramento próximo (framingForBody), então o comportamento é idêntico seja
    // disparado da cena 3D, dos botões de anel ou da lista lateral. Uma seleção de objeto
    // (focusTarget) sempre vence e limpa qualquer foco de corpo.
    const [bodyFocus, setBodyFocus] = useState<BodyFocus | null>(null);
    const focusEarth = () => onFocusBody('earth');
    const focusMoon = () => onFocusBody('moon');

    // Reagir a um foco de Terra/Lua solicitado de fora da cena. Chaveado pelo nonce de intenção
    // para que o mesmo corpo possa ser re-focado; usa o enquadramento próximo para ambos.
    useEffect(() => {
        if (cameraIntent.kind !== 'body') return;
        if (cameraIntent.body === 'earth') {
            setBodyFocus({ body: 'earth', framing: framingForBody(new THREE.Vector3(...earthPos), EARTH_RADIUS_DL), nonce: cameraIntent.nonce });
        } else {
            setBodyFocus({ body: 'moon', framing: framingForBody(new THREE.Vector3(...moonPos), MOON_RADIUS_DL), nonce: cameraIntent.nonce });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraIntent.kind === 'body' ? cameraIntent.nonce : -1]);

    // Selecionar um objeto limpa qualquer foco de corpo pendente para os dois não conflitarem.
    useEffect(() => {
        if (focusTarget) setBodyFocus(null);
    }, [focusTarget]);

    // Escolher uma visão predefinida (Superior/Lateral/Resetar) limpa qualquer foco de corpo ativo.
    useEffect(() => {
        if (cameraIntent.kind !== 'preset') return;
        setBodyFocus(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraIntent.kind === 'preset' ? cameraIntent.nonce : -1]);

    // Seleção de objeto tem precedência; depois foco de corpo; depois a visão predefinida.
    const activeFocus = focusTarget ?? bodyFocus?.framing ?? null;
    const focusNonce = focusTarget ? cameraIntent.nonce : bodyFocus?.nonce ?? 0;
    const orbitLabelsOnly = orbitMode && selectedHasOrbit;

    // Labels visíveis para todos os objetos enquanto a câmera não estiver muito afastada.
    // Só some quando hideAsteroidLabels (câmera muito longe) — independente do limite de objetos.
    // Também respeita o toggle global showLabels.
    const showLabelForObject = (id: string) => shouldShowLabelForObject({
        id,
        selectedId,
        showLabels,
        orbitLabelsOnly,
        hideAsteroidLabels,
    });

    const focusedObjectPosition = focusedObjectScenePosition(focusedObject, earthPos);
    const labelOccluder = computeLabelOccluder({ bodyFocus, earthPos, moonPos, focusedObjectPosition });
    const useHelioScene = shouldUseHelioScene(orbitMode, selectedHasOrbit, focusedObject);
    const sceneObjectOccluders = useMemo(() => {
        if (useHelioScene) {
            return [{ center: new THREE.Vector3(0, 0, 0), radius: SUN_RADIUS_SCENE }];
        }

        const occluders = [
            { center: new THREE.Vector3(0, 0, 0), radius: SUN_RADIUS_SCENE },
            { center: new THREE.Vector3(...earthPos), radius: EARTH_RADIUS_DL },
            { center: new THREE.Vector3(...moonPos), radius: MOON_RADIUS_DL },
            ...(planetPositions.mercuryPos ? [{ center: new THREE.Vector3(...planetPositions.mercuryPos), radius: MERCURY.visualRadiusDl }] : []),
            ...(planetPositions.venusPos ? [{ center: new THREE.Vector3(...planetPositions.venusPos), radius: VENUS.visualRadiusDl }] : []),
            ...(planetPositions.marsPos ? [{ center: new THREE.Vector3(...planetPositions.marsPos), radius: MARS.visualRadiusDl }] : []),
            ...(planetPositions.jupiterPos ? [{ center: new THREE.Vector3(...planetPositions.jupiterPos), radius: JUPITER.visualRadiusDl }] : []),
            ...(planetPositions.saturnPos ? [{ center: new THREE.Vector3(...planetPositions.saturnPos), radius: SATURN.visualRadiusDl * 2.3 }] : []),
            ...(planetPositions.uranusPos ? [{ center: new THREE.Vector3(...planetPositions.uranusPos), radius: URANUS.visualRadiusDl }] : []),
            ...(planetPositions.neptunePos ? [{ center: new THREE.Vector3(...planetPositions.neptunePos), radius: NEPTUNE.visualRadiusDl }] : []),
        ];

        return occluders;
    }, [earthPos, moonPos, planetPositions, useHelioScene]);

    // Arbitragem de modo: a cena solar-orbital toma conta quando (a) o usuário pediu modo órbita
    // E (b) o objeto selecionado tem elementos osculadores com época utilizável (tpJd ≠ 0).
    // Caso contrário permanece na camada de radar geocêntrico. Misturar ambas as camadas no mesmo
    // frame era o bug corrigido pela separação de modos: o asteroide nunca ficava sobre sua elipse
    // desenhada pois viviam em regras de escala diferentes.
    const focusedElements = focusedObject?.trajectory?.orbitalElements ?? null;
    const focusedPalette = focusedObject
        ? OBJECT_PALETTE[Math.max(0, closestNowObjects.findIndex((o) => o.approach.id === focusedObject.approach.id)) % OBJECT_PALETTE.length]
        : OBJECT_PALETTE[0];

    return (
        <SceneObjectOccludersContext.Provider value={sceneObjectOccluders}>
            <LabelOccluderContext.Provider value={labelOccluder}>
                <color attach="background" args={['#03060d']} />
                <ambientLight intensity={0.16} />

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
                    <Moon onFocus={focusMoon} position={moonPos} geocentricPosition={moonGeoPos} sunDirection={sunDir} compactLabel={compactLabels} showLabel={showLabels && !orbitLabelsOnly} protectLabelFromFocus={bodyFocus?.body !== 'moon'} isFocused={bodyFocus?.body === 'moon'} isApproximate={!ephemeris} locale={locale} />
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

                    {/* Asteroides e trajetórias: geocêntricos log-comprimidos, offsetados pela Terra. */}
                    <AsteroidSceneLayer
                        closestNowObjects={closestNowObjects}
                        selectedId={selectedId}
                        hasSelection={hasSelection}
                        earthPos={earthPos}
                        onSelect={onSelect}
                        locale={locale}
                        showLabels={showLabels}
                        showLabelForObject={showLabelForObject}
                    />
                </>
            )}

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

                <CameraRig
                    view={cameraIntent.view}
                    viewNonce={cameraIntent.kind === 'preset' ? cameraIntent.nonce : 0}
                    focusTarget={activeFocus}
                    focusNonce={focusNonce}
                    earthPos={earthPos}
                />
            </LabelOccluderContext.Provider>
        </SceneObjectOccludersContext.Provider>
    );
}
