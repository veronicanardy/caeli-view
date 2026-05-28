import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { AsteroidTrajectory, ClosestNowObject, UnifiedApproach } from '@/types';
import { compressDistanceDl, compressSceneVector, SUN_DISPLAY_DL, type SceneEphemeris } from '@/lib/sceneEphemeris';
import { currentPositionInScene } from '@/lib/observatory/trajectorySampling';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import { EARTH_RADIUS_DL, MOON_RADIUS_DL } from '@/lib/observatory/bodyScale';
import { Sun } from '../Bodies/Sun';
import { Earth } from '../Bodies/Earth';
import { Moon } from '../Bodies/Moon';
import { MoonOrbit } from '../Bodies/MoonOrbit';
import { SunOrbitGuide } from '../Bodies/HeliocentricLines';
import { AsteroidMarker } from '../Bodies/AsteroidMarker';
import { RingsLayer } from '../Overlays/RingsLayer';
import { LabelOccluderContext, useCompactLabelMode } from '../Overlays/SceneLabels';
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
    onClearSelection: () => void;
    cameraIntent: CameraIntent;
    focusTarget: FocusFraming | null;
    ephemeris: SceneEphemeris | null;
    /** Server-seeded Sun direction used until the ephemeris resolves. Never an arbitrary vector. */
    fallbackSunDirection: [number, number, number];
    locale: 'pt-BR' | 'en';
};

export function RadarScene({ closestNowObjects, selectedId, orbitMode, onSelect, onClearSelection, cameraIntent, focusTarget, ephemeris, fallbackSunDirection, locale }: RadarSceneProps) {
    const hasSelection = selectedId !== null;
    const focusedObject = useMemo(
        () => closestNowObjects.find((object) => object.approach.id === selectedId) ?? null,
        [closestNowObjects, selectedId],
    );
    // Selection shows the local geocentric trajectory. The solar Kepler orbit appears only after
    // the user asks for the pulled-back orbit framing.
    const selectedHasOrbit = useMemo(
        () => closestNowObjects.some((object) => object.approach.id === selectedId && Boolean(object.trajectory?.orbitalElements)),
        [closestNowObjects, selectedId],
    );
    // Real Sun direction (Earth→Sun, unit). Falls back to a fixed pleasant angle until the
    // ephemeris resolves. This single vector drives the directional light AND the day/night
    // terminator on Earth and the Moon phase, so everything stays consistent.
    const sunDir = useMemo<[number, number, number]>(
        () => ephemeris?.sunDirection ?? fallbackSunDirection,
        [ephemeris, fallbackSunDirection],
    );
    // Real Moon position (scene units). Falls back to the +X / 1 DL placeholder until resolved.
    const moonPos = useMemo<[number, number, number]>(() => {
        const p = ephemeris?.moonScenePosition;
        // moonScenePosition is in LINEAR DL (~1). Run it through the shared radial log compression,
        // same as the asteroid vectors and the heliocentric orbit, so one rule governs everything.
        if (!p) return [compressDistanceDl(1), 0, 0];
        return compressSceneVector(p);
    }, [ephemeris]);
    // Real orbital-plane normal of the Moon. Fallback: ecliptic-north (flat ring) until resolved.
    const moonOrbitNormal = useMemo<[number, number, number]>(
        () => ephemeris?.moonOrbitNormal ?? [0, 1, 0],
        [ephemeris],
    );
    const compactLabels = useCompactLabelMode();

    // Clicking Earth or Moon re-frames the camera on that body without "selecting" it. Both use the
    // same close framing (framingForBody) so the behavior is identical whether triggered from the
    // 3D scene, the ring buttons, or the side list. An object selection (focusTarget) always wins
    // and clears any body focus.
    const [bodyFocus, setBodyFocus] = useState<{ body: 'earth' | 'moon'; framing: FocusFraming; nonce: number } | null>(null);
    const focusEarth = () => {
        onClearSelection();
        setBodyFocus({ body: 'earth', framing: framingForBody(new THREE.Vector3(0, 0, 0), EARTH_RADIUS_DL), nonce: Date.now() });
    };
    const focusMoon = () => setBodyFocus({ body: 'moon', framing: framingForBody(new THREE.Vector3(...moonPos), MOON_RADIUS_DL), nonce: Date.now() });

    // React to an Earth/Moon focus requested from outside the scene. Keyed by the intent nonce so
    // the same body can be re-focused; uses the close framing for both (the list means "take me there").
    useEffect(() => {
        if (cameraIntent.kind !== 'body') return;
        if (cameraIntent.body === 'earth') {
            setBodyFocus({ body: 'earth', framing: framingForBody(new THREE.Vector3(0, 0, 0), EARTH_RADIUS_DL), nonce: cameraIntent.nonce });
        } else {
            setBodyFocus({ body: 'moon', framing: framingForBody(new THREE.Vector3(...moonPos), MOON_RADIUS_DL), nonce: cameraIntent.nonce });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraIntent.kind === 'body' ? cameraIntent.nonce : -1]);

    // Selecting an object clears any pending body focus so the two don't fight.
    useEffect(() => {
        if (focusTarget) setBodyFocus(null);
    }, [focusTarget]);

    // Picking a preset view (Top/Side/Reset) clears any active body focus so the view buttons win.
    useEffect(() => {
        if (cameraIntent.kind !== 'preset') return;
        setBodyFocus(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraIntent.kind === 'preset' ? cameraIntent.nonce : -1]);

    // Object selection takes precedence; otherwise a body focus; otherwise the preset view.
    const activeFocus = focusTarget ?? bodyFocus?.framing ?? null;
    const focusNonce = focusTarget ? cameraIntent.nonce : bodyFocus?.nonce ?? 0;
    const orbitLabelsOnly = orbitMode && selectedHasOrbit;
    const focusedObjectPosition = focusedObject ? currentPositionInScene(focusedObject) : null;
    const labelOccluder = bodyFocus?.body === 'earth'
        ? { center: new THREE.Vector3(0, 0, 0), radius: EARTH_RADIUS_DL * 1.35 }
        : bodyFocus?.body === 'moon'
          ? { center: new THREE.Vector3(...moonPos), radius: MOON_RADIUS_DL * 1.9 }
          : focusedObjectPosition
            ? { center: new THREE.Vector3(...focusedObjectPosition), radius: 0.18 }
          : null;

    // Mode arbitration: orbit-solar takes over the whole scene when (a) the user asked for orbit
    // mode AND (b) the selected object has osculating elements with a usable epoch (tpJd ≠ 0).
    // Otherwise we stay in the geocentric radar layer. Mixing both layers in the same frame was
    // the bug fixed by the modes-separation effort: the asteroid would never sit on its drawn
    // ellipse because they lived in two different rulers.
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
                    earthHelioPositionAU={ephemeris?.earthHelioPositionAU ?? null}
                    fallbackSunDirection={fallbackSunDirection}
                    subsolarLatDeg={ephemeris?.subsolarLatDeg ?? 0}
                    subsolarLonDeg={ephemeris?.subsolarLonDeg ?? 0}
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
                    />
                    <Moon onFocus={focusMoon} position={moonPos} sunDirection={sunDir} compactLabel={compactLabels} showLabel={!orbitLabelsOnly} protectLabelFromFocus={bodyFocus?.body !== 'moon'} isApproximate={!ephemeris} locale={locale} />
                    <MoonOrbit moonPos={moonPos} orbitNormal={moonOrbitNormal} />
                    <RingsLayer onEarthFocus={focusEarth} showLabels={!compactLabels && !orbitLabelsOnly} />
                    {!orbitLabelsOnly ? (
                        <SunOrbitGuide sunDirection={sunDir} />
                    ) : null}

                    {/* Geocentric markers (near Earth). Selection never moves the rock. */}
                    {closestNowObjects.map((object, index) => (
                        <AsteroidMarker
                            key={object.approach.id}
                            object={object}
                            palette={OBJECT_PALETTE[index % OBJECT_PALETTE.length]}
                            isSelected={object.approach.id === selectedId}
                            dimmed={hasSelection && object.approach.id !== selectedId}
                            onSelect={onSelect}
                            compactLabel={compactLabels}
                            showLabel={!orbitLabelsOnly || object.approach.id === selectedId}
                            protectLabelFromFocus={object.approach.id !== selectedId}
                            locale={locale}
                        />
                    ))}

                    {/* Local geocentric "now" trajectories — only meaningful in the radar layer. */}
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
                // Lower damping = longer, smoother glide after rotate/pan input.
                dampingFactor={0.05}
                // Zoom is handled by <InertialZoom> below (coasting dolly toward the cursor), so the
                // built-in wheel zoom is disabled to avoid two systems fighting over the dolly.
                enableZoom={false}
                // Don't let the camera dive into Earth: keep min distance above the Earth glow.
                minDistance={EARTH_RADIUS_DL * 2.2}
                // Pull back far enough to see complete selected asteroid orbits.
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
