import { useCallback, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import type { MobilePanelSection } from './Panels/MobilePanelControls';
import type { CameraViewKey } from './Scene/cameraConstants';
import { framingForBody } from './Scene/cameraFraming';
import type { FocusFraming } from './Scene/cameraFraming';
import { nextCameraNonce } from './Scene/cameraIntent';
import type { CameraIntent } from './Scene/cameraIntent';
import { PLANET_CONFIG } from './Scene/planetConfig';
import type { PlanetId } from './Scene/planetConfig';
import { MOBILE_MEDIA_QUERY } from './radarLayoutConstants';

export type Radar3DBodyCardTarget = 'earth' | 'moon' | 'sun' | PlanetId | null;

type Args = {
    closestNowObjects: ClosestNowObject[];
    focusedObject: ClosestNowObject | null;
    ephemeris: SceneEphemeris | null;
    mobilePanelSection: MobilePanelSection;
    onClearSelection?: () => void;
    onSelect: (approach: UnifiedApproach) => void;
    setMobilePanelSection: (section: MobilePanelSection) => void;
    setPanelCollapsed: (collapsed: boolean) => void;
    setPlanetsOpen: (open: boolean) => void;
    triggerTransition: (fn: () => void) => void;
};

/**
 * Agrupa ações de seleção e foco da cena 3D sem alterar a política de câmera.
 */
export function useRadar3DFocusActions({
    closestNowObjects,
    focusedObject,
    ephemeris,
    mobilePanelSection,
    onClearSelection,
    onSelect,
    setMobilePanelSection,
    setPanelCollapsed,
    setPlanetsOpen,
    triggerTransition,
}: Args) {
    const [cameraIntent, setCameraIntent] = useState<CameraIntent>({
        kind: 'preset',
        view: 'perspective',
        nonce: 0,
    });
    const [dismissedFocusObjectId, setDismissedFocusObjectId] = useState<string | null>(null);
    const [orbitMode, setOrbitMode] = useState(false);
    const [bodyCardOpen, setBodyCardOpen] = useState<Radar3DBodyCardTarget>(null);
    const [planetFocusTargets, setPlanetFocusTargets] = useState<Partial<Record<PlanetId, FocusFraming>>>({});
    const [sunFocusTarget, setSunFocusTarget] = useState<FocusFraming | null>(null);

    const visibleFocusedObject = focusedObject && focusedObject.approach.id !== dismissedFocusObjectId
        ? focusedObject
        : null;

    const clearPlanetTargets = useCallback(() => {
        setPlanetFocusTargets({});
        setSunFocusTarget(null);
    }, []);

    const collapseNavigationForMobile = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (!window.matchMedia(MOBILE_MEDIA_QUERY).matches) return;
        setPlanetsOpen(false);
        setPanelCollapsed(true);
    }, [setPanelCollapsed, setPlanetsOpen]);

    const pickView = useCallback((key: CameraViewKey) => {
        onClearSelection?.();
        setBodyCardOpen(null);
        clearPlanetTargets();
        setCameraIntent((intent) => ({ kind: 'preset', view: key, nonce: nextCameraNonce(intent) }));
    }, [clearPlanetTargets, onClearSelection]);

    const selectObject = useCallback((approach: UnifiedApproach) => {
        const newObject = closestNowObjects.find((o) => o.approach.id === approach.id);
        const newHasOrbit = Boolean(newObject?.trajectory?.orbitalElements);
        if (orbitMode && !newHasOrbit) return;
        setDismissedFocusObjectId(null);
        setBodyCardOpen(null);
        clearPlanetTargets();
        collapseNavigationForMobile();
        setCameraIntent((intent) => ({ kind: 'object', view: intent.view, nonce: nextCameraNonce(intent) }));
        onSelect(approach);
    }, [clearPlanetTargets, closestNowObjects, collapseNavigationForMobile, onSelect, orbitMode]);

    const showOrbit = useCallback(() => triggerTransition(() => {
        setOrbitMode(true);
        setCameraIntent((intent) => ({ kind: 'object', view: intent.view, nonce: nextCameraNonce(intent) }));
    }), [triggerTransition]);

    const showCloseUp = useCallback(() => triggerTransition(() => {
        setOrbitMode(false);
        setCameraIntent((intent) => ({ kind: 'object', view: intent.view, nonce: nextCameraNonce(intent) }));
    }), [triggerTransition]);

    const showNavigationPanel = useCallback(() => {
        setDismissedFocusObjectId(null);
        onClearSelection?.();
        setBodyCardOpen(null);
        clearPlanetTargets();
        setPlanetsOpen(false);
        setPanelCollapsed(false);
        setMobilePanelSection('objects');
    }, [clearPlanetTargets, onClearSelection, setMobilePanelSection, setPanelCollapsed, setPlanetsOpen]);

    const closeFocusedObject = useCallback(() => {
        if (focusedObject) setDismissedFocusObjectId(focusedObject.approach.id);
        setBodyCardOpen(null);
        clearPlanetTargets();
    }, [clearPlanetTargets, focusedObject]);

    const withOrbitExit = useCallback((doFocus: () => void) => {
        if (orbitMode) {
            triggerTransition(() => { setOrbitMode(false); doFocus(); });
        } else {
            doFocus();
        }
    }, [orbitMode, triggerTransition]);

    const focusBody = useCallback((body: 'earth' | 'moon') => {
        onClearSelection?.();
        setDismissedFocusObjectId(null);
        setBodyCardOpen(body);
        clearPlanetTargets();
        withOrbitExit(() => {
            collapseNavigationForMobile();
            setCameraIntent((intent) => ({ kind: 'body', view: intent.view, body, nonce: nextCameraNonce(intent) }));
        });
    }, [clearPlanetTargets, collapseNavigationForMobile, onClearSelection, withOrbitExit]);

    const focusPlanet = useCallback((id: PlanetId) => {
        onClearSelection?.();
        const cfg = PLANET_CONFIG[id];
        const pos = ephemeris?.[cfg.ephemerisKey];
        withOrbitExit(() => {
            setDismissedFocusObjectId(null);
            setBodyCardOpen(id);
            setSunFocusTarget(null);
            collapseNavigationForMobile();
            if (pos) {
                // Câmera do lado iluminado: fica entre o Sol (origem) e o planeta.
                // planetToSun = normalize(0 - planetPos) = normalize(-planetPos).
                const planetVec = new THREE.Vector3(...pos);
                const planetToSun = planetVec.clone().negate().normalize();
                // Leve elevação para evitar enquadramento raso no plano eclíptico.
                planetToSun.add(new THREE.Vector3(0, 0.25, 0)).normalize();
                setPlanetFocusTargets({ [id]: framingForBody(planetVec, cfg.framingRadius, planetToSun) });
            } else {
                setPlanetFocusTargets({});
            }
        });
    }, [collapseNavigationForMobile, ephemeris, onClearSelection, withOrbitExit]);

    const focusSun = useCallback(() => {
        onClearSelection?.();
        withOrbitExit(() => {
            setDismissedFocusObjectId(null);
            setBodyCardOpen('sun');
            clearPlanetTargets();
            collapseNavigationForMobile();
            // No mobile, recua mais para que o Sol não domine a composição.
            const isMobile = typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA_QUERY).matches;
            setSunFocusTarget(framingForBody(new THREE.Vector3(0, 0, 0), 0.5, undefined, isMobile ? 30 : 20));
        });
    }, [clearPlanetTargets, collapseNavigationForMobile, onClearSelection, withOrbitExit]);

    const resetView = useCallback(() => {
        onClearSelection?.();
        pickView('perspective');
    }, [onClearSelection, pickView]);

    const canShowOrbitPosition = useMemo(() => {
        const tp = focusedObject?.trajectory?.orbitalElements?.tpJd;
        return Number.isFinite(tp) && tp !== 0;
    }, [focusedObject]);

    useEffect(() => {
        if (!focusedObject) {
            setDismissedFocusObjectId(null);
            return;
        }
        if (dismissedFocusObjectId && dismissedFocusObjectId !== focusedObject.approach.id) {
            setDismissedFocusObjectId(null);
        }
    }, [focusedObject, dismissedFocusObjectId]);

    useEffect(() => {
        if (!orbitMode) return;
        setPlanetsOpen(false);
        if (mobilePanelSection !== 'objects') {
            setMobilePanelSection('objects');
        }
    }, [mobilePanelSection, orbitMode, setMobilePanelSection, setPlanetsOpen]);

    return {
        bodyCardOpen,
        cameraIntent,
        canShowOrbitPosition,
        clearPlanetTargets,
        closeFocusedObject,
        focusBody,
        focusPlanet,
        focusSun,
        orbitMode,
        pickView,
        planetFocusTargets,
        resetView,
        selectObject,
        setBodyCardOpen,
        showCloseUp,
        showNavigationPanel,
        showOrbit,
        sunFocusTarget,
        visibleFocusedObject,
    };
}
