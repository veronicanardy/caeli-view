import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, ObjectLimit, UnifiedApproach } from '@/types';
import { compressDistanceDl, compressSceneVector, SUN_DISPLAY_DL, type SceneEphemeris } from '@/lib/sceneEphemeris';
import { currentPositionInScene } from '@/lib/observatory/trajectorySampling';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { Sun } from '../Bodies/Sun/Sun';
import { Earth } from '../Bodies/Earth/Earth';
import { Moon } from '../Bodies/Moon/Moon';
import { MoonOrbit } from '../Bodies/Moon/MoonOrbit';
import { Mercury } from '../Bodies/Mercury/Mercury';
import { Venus } from '../Bodies/Venus/Venus';
import { Mars } from '../Bodies/Mars/Mars';
import { Jupiter } from '../Bodies/Jupiter/Jupiter';
import { Saturn } from '../Bodies/Saturn/Saturn';
import { Uranus } from '../Bodies/Uranus/Uranus';
import { Neptune } from '../Bodies/Neptune/Neptune';
import { DisplayedEarthOrbitGuide, DisplayedMercuryOrbitGuide, DisplayedVenusOrbitGuide, DisplayedMarsOrbitGuide, DisplayedJupiterOrbitGuide, DisplayedSaturnOrbitGuide, DisplayedUranusOrbitGuide, DisplayedNeptuneOrbitGuide } from '../Trajectory/HeliocentricLines';
import { AsteroidMarker } from '../Bodies/Asteroid/AsteroidMarker';
import { RingsLayer } from '../Overlays/RingsLayer';
import { LabelOccluderContext, useCompactLabelMode, useHideAsteroidLabelsMode } from '../Overlays/SceneLabels';
import { NowTrajectory } from '../Trajectory/NowTrajectory';
import { HeliocentricScene } from './HeliocentricScene';
import { CameraRig, InertialZoom, MAX_CAMERA_DISTANCE, type FocusFraming, framingForBody } from './CameraRig';
import type { CameraIntent } from './cameraIntent';

const KM_PER_LD = 384_400;
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
    /** Server-seeded Sun direction used until the ephemeris resolves. Never an arbitrary vector. */
    fallbackSunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
    objectLimit: ObjectLimit;
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
};

export function RadarScene({ closestNowObjects, selectedId, orbitMode, onSelect, cameraIntent, focusTarget, ephemeris, fallbackSunDirection, locale, onFocusMercury, isMercuryFocused, onFocusVenus, isVenusFocused, onFocusMars, isMarsFocused, onFocusJupiter, isJupiterFocused, onFocusSaturn, isSaturnFocused, onFocusUranus, isUranusFocused, onFocusNeptune, isNeptuneFocused, onFocusBody }: RadarSceneProps) {
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
    // Direção real do Sol (Terra→Sol, unitário). Usa um ângulo fixo agradável até a efeméride
    // resolver. Este único vetor conduz a luz direcional E o terminador dia/noite na Terra e a
    // fase da Lua — tudo permanece consistente.
    const sunDir = useMemo<[number, number, number]>(
        () => ephemeris?.sunDirection ?? fallbackSunDirection,
        [ephemeris, fallbackSunDirection],
    );
    // Posição real da Lua em unidades de cena. Usa placeholder +X / 1 DL até resolver.
    const moonPos = useMemo<[number, number, number]>(() => {
        const p = ephemeris?.moonScenePosition;
        // moonScenePosition está em DL LINEAR (~1). Passa pela compressão log radial compartilhada,
        // igual aos vetores de asteroide e à órbita heliocêntrica — uma só regra governa tudo.
        if (!p) return [compressDistanceDl(1), 0, 0];
        return compressSceneVector(p);
    }, [ephemeris]);
    // Normal real do plano orbital da Lua. Fallback: norte eclíptico (anel plano) até resolver.
    const moonOrbitNormal = useMemo<[number, number, number]>(
        () => ephemeris?.moonOrbitNormal ?? [0, 1, 0],
        [ephemeris],
    );
    // Posição geocêntrica de Mercúrio em unidades de cena (já log-comprimida). Retorna null
    // enquanto a efeméride não resolveu — o componente simplesmente não é renderizado até lá.
    const mercuryPos = useMemo<[number, number, number] | null>(
        () => ephemeris?.mercuryScenePosition ?? null,
        [ephemeris],
    );
    const venusPos = useMemo<[number, number, number] | null>(
        () => ephemeris?.venusScenePosition ?? null,
        [ephemeris],
    );
    const marsPos = useMemo<[number, number, number] | null>(
        () => ephemeris?.marsScenePosition ?? null,
        [ephemeris],
    );
    const jupiterPos = useMemo<[number, number, number] | null>(
        () => ephemeris?.jupiterScenePosition ?? null,
        [ephemeris],
    );
    const saturnPos = useMemo<[number, number, number] | null>(
        () => ephemeris?.saturnScenePosition ?? null,
        [ephemeris],
    );
    const uranusPos = useMemo<[number, number, number] | null>(
        () => ephemeris?.uranusScenePosition ?? null,
        [ephemeris],
    );
    const neptunePos = useMemo<[number, number, number] | null>(
        () => ephemeris?.neptuneScenePosition ?? null,
        [ephemeris],
    );
    const compactLabels = useCompactLabelMode();
    const hideAsteroidLabels = useHideAsteroidLabelsMode();

    // Clicar na Terra ou na Lua re-enquadra a câmera naquele corpo sem "selecioná-lo". Ambos usam
    // o mesmo enquadramento próximo (framingForBody), então o comportamento é idêntico seja
    // disparado da cena 3D, dos botões de anel ou da lista lateral. Uma seleção de objeto
    // (focusTarget) sempre vence e limpa qualquer foco de corpo.
    const [bodyFocus, setBodyFocus] = useState<{ body: 'earth' | 'moon'; framing: FocusFraming; nonce: number } | null>(null);
    const focusEarth = () => onFocusBody('earth');
    const focusMoon = () => onFocusBody('moon');

    // Reagir a um foco de Terra/Lua solicitado de fora da cena. Chaveado pelo nonce de intenção
    // para que o mesmo corpo possa ser re-focado; usa o enquadramento próximo para ambos.
    useEffect(() => {
        if (cameraIntent.kind !== 'body') return;
        if (cameraIntent.body === 'earth') {
            setBodyFocus({ body: 'earth', framing: framingForBody(new THREE.Vector3(0, 0, 0), EARTH_RADIUS_DL), nonce: cameraIntent.nonce });
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
    const showLabelForObject = (id: string) => {
        if (id === selectedId) return !orbitLabelsOnly;
        if (hideAsteroidLabels) return false;
        return !orbitLabelsOnly;
    };

    const focusedObjectPosition = focusedObject ? currentPositionInScene(focusedObject) : null;
    const labelOccluder = bodyFocus?.body === 'earth'
        ? { center: new THREE.Vector3(0, 0, 0), radius: EARTH_RADIUS_DL * 1.35 }
        : bodyFocus?.body === 'moon'
          ? { center: new THREE.Vector3(...moonPos), radius: MOON_RADIUS_DL * 1.9 }
          : focusedObjectPosition
            ? { center: new THREE.Vector3(...focusedObjectPosition), radius: 0.18 }
          : null;

    // Arbitragem de modo: a cena solar-orbital toma conta quando (a) o usuário pediu modo órbita
    // E (b) o objeto selecionado tem elementos osculadores com época utilizável (tpJd ≠ 0).
    // Caso contrário permanece na camada de radar geocêntrico. Misturar ambas as camadas no mesmo
    // frame era o bug corrigido pela separação de modos: o asteroide nunca ficava sobre sua elipse
    // desenhada pois viviam em regras de escala diferentes.
    const focusedElements = focusedObject?.trajectory?.orbitalElements ?? null;
    const focusedPalette = focusedObject
        ? OBJECT_PALETTE[Math.max(0, closestNowObjects.findIndex((o) => o.approach.id === focusedObject.approach.id)) % OBJECT_PALETTE.length]
        : OBJECT_PALETTE[0];
    const useHelioScene = orbitMode && selectedHasOrbit && Boolean(focusedElements && Number.isFinite(focusedElements.tpJd) && focusedElements.tpJd !== 0);

    return (
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
                    <Sun
                        position={[sunDir[0] * SUN_DISPLAY_DL, sunDir[1] * SUN_DISPLAY_DL, sunDir[2] * SUN_DISPLAY_DL]}
                        radius={SUN_RADIUS_SCENE}
                        locale={locale}
                        withLighting
                    />
                    <Earth
                        onFocus={focusEarth}
                        sunDirection={sunDir}
                        subsolarLatDeg={ephemeris?.subsolarLatDeg ?? 0}
                        subsolarLonDeg={ephemeris?.subsolarLonDeg ?? 0}
                        showLabel={!orbitLabelsOnly}
                        protectLabelFromFocus={bodyFocus?.body !== 'earth'}
                        isFocused={bodyFocus?.body === 'earth'}
                    />
                    <Moon onFocus={focusMoon} position={moonPos} sunDirection={sunDir} compactLabel={compactLabels} showLabel={!orbitLabelsOnly} protectLabelFromFocus={bodyFocus?.body !== 'moon'} isFocused={bodyFocus?.body === 'moon'} isApproximate={!ephemeris} locale={locale} />
                    <MoonOrbit moonPos={moonPos} orbitNormal={moonOrbitNormal} />
                    {/* Planetas de ambientação — posição heliocêntrica real via astronomy-engine.
                        Renderizados somente após a efeméride resolver. */}
                    {mercuryPos ? <Mercury position={mercuryPos} sunDirection={sunDir} locale={locale} onFocus={onFocusMercury} isFocused={isMercuryFocused} /> : null}
                    {venusPos ? <Venus position={venusPos} sunDirection={sunDir} locale={locale} onFocus={onFocusVenus} isFocused={isVenusFocused} /> : null}
                    {marsPos ? <Mars position={marsPos} sunDirection={sunDir} locale={locale} onFocus={onFocusMars} isFocused={isMarsFocused} /> : null}
                    {jupiterPos ? <Jupiter position={jupiterPos} sunDirection={sunDir} locale={locale} onFocus={onFocusJupiter} isFocused={isJupiterFocused} /> : null}
                    {saturnPos ? <Saturn position={saturnPos} sunDirection={sunDir} locale={locale} onFocus={onFocusSaturn} isFocused={isSaturnFocused} /> : null}
                    {uranusPos ? <Uranus position={uranusPos} sunDirection={sunDir} locale={locale} onFocus={onFocusUranus} isFocused={isUranusFocused} /> : null}
                    {neptunePos ? <Neptune position={neptunePos} sunDirection={sunDir} locale={locale} onFocus={onFocusNeptune} isFocused={isNeptuneFocused} /> : null}
                    <RingsLayer onEarthFocus={focusEarth} showLabels={!compactLabels && !orbitLabelsOnly} />
                    {!orbitLabelsOnly ? (
                        <>
                            <DisplayedEarthOrbitGuide sunDirection={sunDir} />
                            <DisplayedMercuryOrbitGuide sunDirection={sunDir} />
                            <DisplayedVenusOrbitGuide sunDirection={sunDir} />
                            <DisplayedMarsOrbitGuide sunDirection={sunDir} />
                            <DisplayedJupiterOrbitGuide sunDirection={sunDir} />
                            <DisplayedSaturnOrbitGuide sunDirection={sunDir} />
                            <DisplayedUranusOrbitGuide sunDirection={sunDir} />
                            <DisplayedNeptuneOrbitGuide sunDirection={sunDir} />
                        </>
                    ) : null}

                    {/* Marcadores geocêntricos (próximos à Terra). A seleção nunca move a rocha. */}
                    {closestNowObjects.map((object, index) => (
                        <AsteroidMarker
                            key={object.approach.id}
                            object={object}
                            palette={OBJECT_PALETTE[index % OBJECT_PALETTE.length]}
                            isSelected={object.approach.id === selectedId}
                            dimmed={hasSelection && object.approach.id !== selectedId}
                            onSelect={onSelect}
                            compactLabel={compactLabels}
                            showLabel={showLabelForObject(object.approach.id)}
                            protectLabelFromFocus={object.approach.id !== selectedId}
                            locale={locale}
                        />
                    ))}

                    {closestNowObjects
                        .map((object, index) => ({ object, palette: OBJECT_PALETTE[index % OBJECT_PALETTE.length] }))
                        .filter(({ object }) => object.trajectory && object.trajectory.status === 'available')
                        .map(({ object, palette }) => {
                            const activeTrajectory = object.approach.id === selectedId;
                            return (
                                <NowTrajectory
                                    key={`traj-${object.approach.id}`}
                                    trajectory={object.trajectory as AsteroidTrajectory}
                                    palette={palette}
                                    emphasized={activeTrajectory}
                                    dimmed={hasSelection && !activeTrajectory}
                                    locale={locale}
                                />
                            );
                        })}
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
                target={[0, 0, 0]}
                rotateSpeed={0.8}
                panSpeed={0.6}
            />

            <InertialZoom minDistance={EARTH_RADIUS_DL * 2.2} maxDistance={MAX_CAMERA_DISTANCE} />

            <CameraRig
                view={cameraIntent.view}
                viewNonce={cameraIntent.kind === 'preset' ? cameraIntent.nonce : 0}
                focusTarget={activeFocus}
                focusNonce={focusNonce}
            />
        </LabelOccluderContext.Provider>
    );
}
