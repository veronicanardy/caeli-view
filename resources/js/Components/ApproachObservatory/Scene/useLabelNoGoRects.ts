import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { NoGoRect } from '../Overlays/SceneLabels';
import type { MobilePanelSection } from '../Panels/MobilePanelControls';
import type { PlanetId } from './planetConfig';

type UseLabelNoGoRectsArgs = {
    canvasContainerRef: RefObject<HTMLDivElement | null>;
    sidePanelRef: RefObject<HTMLDivElement | null>;
    planetFlyoutRef: RefObject<HTMLDivElement | null>;
    focusCardRef: RefObject<HTMLDivElement | null>;
    bodyCardRef: RefObject<HTMLDivElement | null>;
    fullscreen: boolean;
    planetsOpen: boolean;
    focusedObjectId: string | null;
    bodyCardOpen: 'earth' | 'moon' | 'sun' | PlanetId | null;
    panelCollapsed: boolean;
    mobilePanelSection: MobilePanelSection;
};

export function useLabelNoGoRects({
    canvasContainerRef,
    sidePanelRef,
    planetFlyoutRef,
    focusCardRef,
    bodyCardRef,
    fullscreen,
    planetsOpen,
    focusedObjectId,
    bodyCardOpen,
    panelCollapsed,
    mobilePanelSection,
}: UseLabelNoGoRectsArgs): NoGoRect[] {
    const [noGoRects, setNoGoRects] = useState<NoGoRect[]>([]);

    useEffect(() => {
        const toCanvasRect = (element: HTMLDivElement, canvasRect: DOMRect): NoGoRect => {
            const rect = element.getBoundingClientRect();
            return {
                left: rect.left - canvasRect.left,
                top: rect.top - canvasRect.top,
                right: rect.right - canvasRect.left,
                bottom: rect.bottom - canvasRect.top,
            };
        };

        const update = () => {
            const canvas = canvasContainerRef.current;
            if (!canvas) return;
            const canvasRect = canvas.getBoundingClientRect();
            const elements = [
                sidePanelRef.current,
                planetFlyoutRef.current,
                focusCardRef.current,
                bodyCardRef.current,
            ].filter((element): element is HTMLDivElement => Boolean(element));

            setNoGoRects(elements.map((element) => toCanvasRect(element, canvasRect)));
        };

        update();
        const observer = new ResizeObserver(update);
        if (sidePanelRef.current) observer.observe(sidePanelRef.current);
        if (planetFlyoutRef.current) observer.observe(planetFlyoutRef.current);
        if (focusCardRef.current) observer.observe(focusCardRef.current);
        if (bodyCardRef.current) observer.observe(bodyCardRef.current);
        if (canvasContainerRef.current) observer.observe(canvasContainerRef.current);
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
        };
    }, [
        bodyCardOpen,
        bodyCardRef,
        canvasContainerRef,
        focusCardRef,
        focusedObjectId,
        fullscreen,
        mobilePanelSection,
        panelCollapsed,
        planetFlyoutRef,
        planetsOpen,
        sidePanelRef,
    ]);

    return noGoRects;
}
