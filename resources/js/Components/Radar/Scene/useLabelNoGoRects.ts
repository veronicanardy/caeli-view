/**
 * Hook de áreas bloqueadas para labels 3D.
 *
 * Responsabilidade: medir painéis e cards sobrepostos ao canvas para que labels
 * da cena evitem colisões com a interface.
 */

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

/**
 * Calcula áreas da UI que as labels 3D devem evitar.
 *
 * O resultado é relativo ao canvas e acompanha resize/scroll dos painéis, flyout e cards
 * flutuantes. A cena usa esses retângulos para reduzir colisões visuais com a interface.
 */
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

            const next = elements.map((element) => toCanvasRect(element, canvasRect));

            // O listener de scroll (capture) dispara para qualquer scroll da página, inclusive
            // de painéis internos que não movem os cards. Publicar um array novo idêntico
            // re-renderizaria todos os labels consumidores do contexto; compara antes.
            setNoGoRects((current) => {
                const unchanged = current.length === next.length && current.every((rect, i) =>
                    rect.left === next[i].left && rect.top === next[i].top
                    && rect.right === next[i].right && rect.bottom === next[i].bottom,
                );
                return unchanged ? current : next;
            });
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
