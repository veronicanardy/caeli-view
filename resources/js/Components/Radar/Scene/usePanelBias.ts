/**
 * Hook de compensação de câmera para painéis sobrepostos.
 *
 * Responsabilidade: calcular as frações da área do canvas ocupadas pelo painel
 * lateral (X) e pelo bottom sheet mobile (Y), para que o CameraRig possa
 * deslocar o foco para o centro da área útil visível.
 *
 * Retorna dois valores [0..1]:
 *   - biasX: fração da largura coberta pelo painel lateral (desktop).
 *   - biasY: fração da altura coberta pelo card inferior (mobile).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { DESKTOP_MEDIA_QUERY } from '../radarLayoutConstants';

type Args = {
    canvasContainerRef: React.RefObject<HTMLDivElement | null>;
    sidePanelRef: React.RefObject<HTMLDivElement | null>;
    focusCardRef: React.RefObject<HTMLDivElement | null>;
    bodyCardRef: React.RefObject<HTMLDivElement | null>;
    panelCollapsed: boolean;
    activeCardVisible: boolean;
};

export function usePanelBias({
    canvasContainerRef,
    sidePanelRef,
    focusCardRef,
    bodyCardRef,
    panelCollapsed,
    activeCardVisible,
}: Args): { biasX: number; biasY: number } {
    const [biasX, setBiasX] = useState(0);
    const [biasY, setBiasY] = useState(0);

    // biasX: painel lateral à esquerda do canvas (desktop only).
    const updateBiasX = useCallback(() => {
        const canvas = canvasContainerRef.current;
        const panel = sidePanelRef.current;
        if (!canvas || !panel || panelCollapsed) { setBiasX(0); return; }
        const canvasRect = canvas.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        // Painel fica à esquerda do canvas — calcula quanto da largura ele cobre.
        const overlap = Math.max(0, panelRect.right - canvasRect.left);
        setBiasX(canvasRect.width > 0 ? overlap / canvasRect.width : 0);
    }, [canvasContainerRef, panelCollapsed, sidePanelRef]);

    useEffect(() => {
        updateBiasX();
        const observer = new ResizeObserver(updateBiasX);
        if (sidePanelRef.current) observer.observe(sidePanelRef.current);
        if (canvasContainerRef.current) observer.observe(canvasContainerRef.current);
        window.addEventListener('resize', updateBiasX);
        return () => { observer.disconnect(); window.removeEventListener('resize', updateBiasX); };
    }, [updateBiasX, canvasContainerRef, sidePanelRef]);

    // biasY: card ancorado na base do canvas (mobile only).
    // A ref ativa é guardada em ref para evitar recrear o callback ao trocar de card.
    const focusCardRefInner = useRef(focusCardRef);
    const bodyCardRefInner = useRef(bodyCardRef);
    useEffect(() => { focusCardRefInner.current = focusCardRef; }, [focusCardRef]);
    useEffect(() => { bodyCardRefInner.current = bodyCardRef; }, [bodyCardRef]);

    const updateBiasY = useCallback(() => {
        const canvas = canvasContainerRef.current;
        // No desktop (lg: 1024px+) o card fica ao lado — sem compensação vertical.
        if (!canvas || !activeCardVisible || window.matchMedia(DESKTOP_MEDIA_QUERY).matches) {
            setBiasY(0);
            return;
        }
        // Tenta focusCard primeiro, depois bodyCard.
        const card = focusCardRefInner.current.current ?? bodyCardRefInner.current.current;
        if (!card) { setBiasY(0); return; }
        const canvasRect = canvas.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        // Card fica ancorado na base do canvas — calcula quanto da altura ele cobre.
        const overlap = Math.max(0, canvasRect.bottom - cardRect.top);
        setBiasY(canvasRect.height > 0 ? overlap / canvasRect.height : 0);
    }, [canvasContainerRef, activeCardVisible]);

    useEffect(() => {
        updateBiasY();
        const observer = new ResizeObserver(updateBiasY);
        if (focusCardRef.current) observer.observe(focusCardRef.current);
        if (bodyCardRef.current) observer.observe(bodyCardRef.current);
        if (canvasContainerRef.current) observer.observe(canvasContainerRef.current);
        window.addEventListener('resize', updateBiasY);
        return () => { observer.disconnect(); window.removeEventListener('resize', updateBiasY); };
    }, [updateBiasY, focusCardRef, bodyCardRef, canvasContainerRef]);

    return { biasX, biasY };
}
