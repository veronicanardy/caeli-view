/**
 * Hook de compensação de câmera para painéis sobrepostos.
 *
 * Responsabilidade: calcular as frações da área do canvas ocupadas pela UI para
 * que o CameraRig desloque o foco para o centro da área útil visível durante
 * tweens de enquadramento.
 *
 * Retorna dois valores [0..1]:
 *   - biasX (desktop): fração da largura coberta pelo trilho esquerdo — a união
 *     do painel de navegação com o card de foco/corpo visível. Só vale quando há
 *     card aberto, que é quando existe tween de foco para compensar.
 *   - biasY (mobile): fração da altura coberta pelo card inferior (bottom sheet).
 *
 * As medições acontecem apenas em resize/mudança de card (ResizeObserver),
 * nunca por frame.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { DESKTOP_MEDIA_QUERY } from '../radarLayoutConstants';

type Args = {
    canvasContainerRef: React.RefObject<HTMLDivElement | null>;
    sidePanelRef: React.RefObject<HTMLDivElement | null>;
    focusCardRef: React.RefObject<HTMLDivElement | null>;
    bodyCardRef: React.RefObject<HTMLDivElement | null>;
    activeCardVisible: boolean;
};

/**
 * Só publica mudanças relevantes (> ~1% do canvas): durante o arraste do sheet
 * o ResizeObserver dispara por frame e re-renderizar o radar inteiro a cada
 * pixel não compensa — o CameraRig já interpola o valor final com suavidade.
 */
function settleBias(current: number, next: number): number {
    return Math.abs(current - next) < 0.01 ? current : next;
}

export function usePanelBias({
    canvasContainerRef,
    sidePanelRef,
    focusCardRef,
    bodyCardRef,
    activeCardVisible,
}: Args): { biasX: number; biasY: number } {
    const [biasX, setBiasX] = useState(0);
    const [biasY, setBiasY] = useState(0);

    // As refs de card ativas são lidas via ref para evitar recriar os callbacks ao trocar de card.
    const focusCardRefInner = useRef(focusCardRef);
    const bodyCardRefInner = useRef(bodyCardRef);
    useEffect(() => { focusCardRefInner.current = focusCardRef; }, [focusCardRef]);
    useEffect(() => { bodyCardRefInner.current = bodyCardRef; }, [bodyCardRef]);

    // biasX: trilho esquerdo (painel + card) cobre parte da largura (desktop only).
    const updateBiasX = useCallback(() => {
        const canvas = canvasContainerRef.current;
        if (!canvas || !activeCardVisible || !window.matchMedia(DESKTOP_MEDIA_QUERY).matches) {
            setBiasX(0);
            return;
        }
        const canvasRect = canvas.getBoundingClientRect();
        const card = focusCardRefInner.current.current ?? bodyCardRefInner.current.current;
        const rightEdges = [sidePanelRef.current, card]
            .filter((el): el is HTMLDivElement => Boolean(el))
            .map((el) => el.getBoundingClientRect().right);
        if (rightEdges.length === 0 || canvasRect.width <= 0) { setBiasX(0); return; }
        const overlap = Math.max(0, Math.max(...rightEdges) - canvasRect.left);
        const next = Math.min(1, overlap / canvasRect.width);
        setBiasX((current) => settleBias(current, next));
    }, [activeCardVisible, canvasContainerRef, sidePanelRef]);

    // biasY: card ancorado na base do canvas (mobile only).
    const updateBiasY = useCallback(() => {
        const canvas = canvasContainerRef.current;
        // No desktop (lg: 1024px+) o card fica ao lado — sem compensação vertical.
        if (!canvas || !activeCardVisible || window.matchMedia(DESKTOP_MEDIA_QUERY).matches) {
            setBiasY(0);
            return;
        }
        const card = focusCardRefInner.current.current ?? bodyCardRefInner.current.current;
        if (!card) { setBiasY(0); return; }
        const canvasRect = canvas.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        // Card fica ancorado na base do canvas — calcula quanto da altura ele cobre.
        const overlap = Math.max(0, canvasRect.bottom - cardRect.top);
        const next = canvasRect.height > 0 ? overlap / canvasRect.height : 0;
        setBiasY((current) => settleBias(current, next));
    }, [canvasContainerRef, activeCardVisible]);

    useEffect(() => {
        const update = () => { updateBiasX(); updateBiasY(); };
        update();
        const observer = new ResizeObserver(update);
        if (sidePanelRef.current) observer.observe(sidePanelRef.current);
        if (focusCardRef.current) observer.observe(focusCardRef.current);
        if (bodyCardRef.current) observer.observe(bodyCardRef.current);
        if (canvasContainerRef.current) observer.observe(canvasContainerRef.current);
        window.addEventListener('resize', update);
        return () => { observer.disconnect(); window.removeEventListener('resize', update); };
    }, [updateBiasX, updateBiasY, canvasContainerRef, sidePanelRef, focusCardRef, bodyCardRef]);

    return { biasX, biasY };
}
