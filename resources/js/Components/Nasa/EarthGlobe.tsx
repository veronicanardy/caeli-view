import { useEffect, useRef, useState } from 'react';
import type { ComponentType, MutableRefObject } from 'react';
import type { GlobeMethods, GlobeProps } from 'react-globe.gl';

const EARTH_TEXTURE_URL = '/images/earth/blue-marble-land-shallow-topo-2048.jpg';
const EARTH_BUMP_URL = '/images/earth/earth-normal-2048.jpg';

export type EarthGlobeMarker = {
    lat: number;
    lng: number;
    label?: string;
    color?: string;
    radius?: number;
    altitude?: number;
};

export type EarthGlobeArc = {
    startLat: number;
    startLng: number;
    endLat: number;
    endLng: number;
    label?: string;
    color?: string | string[];
    altitude?: number;
};

type EarthGlobeProps = {
    markers?: EarthGlobeMarker[];
    arcs?: EarthGlobeArc[];
    textureUrl?: string;
    bumpUrl?: string;
    autoRotate?: boolean;
    pointOfViewAltitude?: number;
    className?: string;
    onReady?: () => void;
};

type GlobeComponent = ComponentType<
    GlobeProps & {
        ref?: MutableRefObject<GlobeMethods | undefined>;
    }
>;

type GlobeSize = {
    width: number;
    height: number;
};

export function EarthGlobe({
    markers = [],
    arcs = [],
    textureUrl = EARTH_TEXTURE_URL,
    bumpUrl = EARTH_BUMP_URL,
    autoRotate = true,
    pointOfViewAltitude = 1.42,
    className = '',
    onReady,
}: EarthGlobeProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const globeRef = useRef<GlobeMethods | undefined>(undefined);
    const [Globe, setGlobe] = useState<GlobeComponent | null>(null);
    const [size, setSize] = useState<GlobeSize>({ width: 0, height: 0 });
    const [isGlobeReady, setIsGlobeReady] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        if (typeof window === 'undefined') {
            return undefined;
        }

        import('react-globe.gl').then((module) => {
            if (isMounted) {
                setGlobe(() => module.default as GlobeComponent);
                setIsGlobeReady(false);
            }
        }).catch(() => {
            if (isMounted) setHasError(true);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const container = containerRef.current;

        if (!container || typeof ResizeObserver === 'undefined') {
            return undefined;
        }

        const updateSize = () => {
            const bounds = container.getBoundingClientRect();
            setSize({
                width: Math.max(1, Math.round(bounds.width)),
                height: Math.max(1, Math.round(bounds.height)),
            });
        };

        updateSize();

        const observer = new ResizeObserver(updateSize);
        observer.observe(container);

        return () => observer.disconnect();
    }, []);

    const configureControls = () => {
        const controls = globeRef.current?.controls();

        if (!controls) {
            return;
        }

        controls.autoRotate = autoRotate;
        controls.autoRotateSpeed = 0.45;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.rotateSpeed = 0.65;
        controls.minDistance = 160;
        controls.maxDistance = 320;

        globeRef.current?.pointOfView({ altitude: pointOfViewAltitude });
    };

    return (
        <div
            ref={containerRef}
            className={`earth-globe relative z-0 size-full overflow-hidden rounded-full ${className}`}
            role="img"
            aria-label="Globo 3D interativo da Terra"
        >
            {hasError ? (
                <div
                    className="earth-globe-fallback earth-css-fallback absolute inset-0 z-0 size-full rounded-full"
                    aria-hidden="true"
                />
            ) : (
                <div
                    className={`earth-globe-spinner absolute inset-0 z-0 flex size-full items-center justify-center transition-opacity duration-300 ${
                        isGlobeReady ? 'invisible opacity-0' : 'visible opacity-100'
                    }`}
                    aria-hidden="true"
                />
            )}

            {Globe && size.width > 1 && size.height > 1 ? (
                <div className="earth-globe-canvas">
                    <Globe
                        ref={globeRef}
                        width={size.width}
                        height={size.height}
                        backgroundColor="rgba(0,0,0,0)"
                        globeImageUrl={textureUrl}
                        bumpImageUrl={bumpUrl}
                        showAtmosphere
                        atmosphereColor="#54d6d6"
                        atmosphereAltitude={0.18}
                        animateIn={false}
                        enablePointerInteraction
                        waitForGlobeReady
                        pointsData={markers}
                        pointLat="lat"
                        pointLng="lng"
                        pointAltitude="altitude"
                        pointRadius="radius"
                        pointColor={(marker: object) => (marker as EarthGlobeMarker).color ?? '#54d6d6'}
                        pointLabel={(marker: object) => (marker as EarthGlobeMarker).label ?? ''}
                        arcsData={arcs}
                        arcStartLat="startLat"
                        arcStartLng="startLng"
                        arcEndLat="endLat"
                        arcEndLng="endLng"
                        arcAltitude={(arc: object) => (arc as EarthGlobeArc).altitude ?? 0.18}
                        arcColor={(arc: object) => (arc as EarthGlobeArc).color ?? ['rgba(84,214,214,0.92)', 'rgba(248,199,107,0.82)']}
                        arcDashLength={0.42}
                        arcDashGap={0.18}
                        arcDashAnimateTime={2200}
                        arcLabel={(arc: object) => (arc as EarthGlobeArc).label ?? ''}
                        onGlobeReady={() => {
                            configureControls();
                            setIsGlobeReady(true);
                            onReady?.();
                        }}
                    />
                </div>
            ) : null}
        </div>
    );
}
