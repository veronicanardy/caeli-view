/**
 * Hook de arraste vertical dos bottom sheets mobile.
 *
 * Responsabilidade: transformar gestos de pointer na região de arraste (handle +
 * cabeçalho) em altura ao vivo do sheet e, ao soltar, encaixar no snap mais
 * próximo ou dispensar o sheet. A geometria de snaps vive em `bottomSheetSnap.ts`.
 *
 * Convenções de uso:
 *   - A região de arraste precisa de `touch-action: none` (classe `touch-none`)
 *     para o browser não disputar o gesto com scroll/zoom da página.
 *   - O conteúdo do sheet rola livre: o arraste só nasce na região de arraste.
 *   - Toques curtos (sem movimento) não mexem no snap; quem quiser "ciclar"
 *     estados no toque usa `nextSnapOnTap` num onClick próprio.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { clampDragHeight, nearestSnap, SHEET_SNAP_FRACTION, shouldDismiss, snapHeightCss } from './bottomSheetSnap';
import type { SheetSnap, SheetSnapFractions } from './bottomSheetSnap';

/** Movimento mínimo em px para classificar o gesto como arraste (e não toque). */
const DRAG_THRESHOLD_PX = 6;

type Args = {
    sheetRef: RefObject<HTMLDivElement | null>;
    snaps: SheetSnap[];
    snap: SheetSnap;
    onSnapChange: (snap: SheetSnap) => void;
    /** Quando presente, arrastar abaixo do menor snap fecha o sheet. */
    onDismiss?: () => void;
    /** Frações de altura por snap; padrão dos sheets de navegação. */
    fractions?: SheetSnapFractions;
    disabled?: boolean;
};

type DragState = {
    pointerId: number;
    startY: number;
    startHeightPx: number;
    containerHeightPx: number;
    moved: boolean;
    lastHeightPx: number;
};

export function useBottomSheetDrag({ sheetRef, snaps, snap, onSnapChange, onDismiss, fractions = SHEET_SNAP_FRACTION, disabled = false }: Args) {
    const [dragHeightPx, setDragHeightPx] = useState<number | null>(null);
    const dragState = useRef<DragState | null>(null);
    // Remoção dos listeners globais do gesto em andamento (também chamada no desmonte).
    const detachListenersRef = useRef<(() => void) | null>(null);
    // True logo após um arraste: o click fantasma que o browser dispara deve ser ignorado.
    const wasDraggedRef = useRef(false);

    // Callbacks lidos via ref para os listeners de window não precisarem reanexar.
    const callbacksRef = useRef({ onSnapChange, onDismiss, snaps, fractions });
    useEffect(() => { callbacksRef.current = { onSnapChange, onDismiss, snaps, fractions }; }, [onSnapChange, onDismiss, snaps, fractions]);

    useEffect(() => () => {
        // Desmonte no meio do gesto: garante que nenhum listener global sobreviva.
        detachListenersRef.current?.();
    }, []);

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const sheet = sheetRef.current;
        if (!sheet || dragState.current) return;

        const container = (sheet.offsetParent as HTMLElement | null) ?? sheet.parentElement;
        const containerHeightPx = container?.clientHeight ?? window.innerHeight;
        const startHeightPx = sheet.getBoundingClientRect().height;

        dragState.current = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startHeightPx,
            containerHeightPx,
            moved: false,
            lastHeightPx: startHeightPx,
        };

        const onMove = (e: globalThis.PointerEvent) => {
            const state = dragState.current;
            if (!state || e.pointerId !== state.pointerId) return;
            const dy = state.startY - e.clientY;
            if (!state.moved && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
            state.moved = true;
            state.lastHeightPx = clampDragHeight(state.startHeightPx + dy, state.containerHeightPx);
            setDragHeightPx(state.lastHeightPx);
        };

        const detach = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', finish);
            window.removeEventListener('pointercancel', finish);
            detachListenersRef.current = null;
        };

        const finish = (e: globalThis.PointerEvent) => {
            const state = dragState.current;
            if (state && e.pointerId !== state.pointerId) return;
            detach();
            dragState.current = null;
            setDragHeightPx(null);
            if (!state?.moved) return;
            // O browser ainda dispara click no elemento sob o dedo após o arraste;
            // a flag deixa o consumidor ignorar esse click fantasma.
            wasDraggedRef.current = true;
            window.setTimeout(() => { wasDraggedRef.current = false; }, 350);
            const { onSnapChange: snapChange, onDismiss: dismiss, snaps: currentSnaps, fractions: currentFractions } = callbacksRef.current;
            if (dismiss && shouldDismiss(state.lastHeightPx, currentSnaps, state.containerHeightPx, currentFractions)) {
                dismiss();
                return;
            }
            snapChange(nearestSnap(state.lastHeightPx, currentSnaps, state.containerHeightPx, currentFractions));
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', finish);
        window.addEventListener('pointercancel', finish);
        detachListenersRef.current = detach;
    };

    const dragging = dragHeightPx !== null;

    const heightStyle: CSSProperties = {
        height: dragging ? `${dragHeightPx}px` : snapHeightCss(snap, fractions),
        maxHeight: '92%',
        transition: dragging ? 'none' : 'height 0.26s cubic-bezier(0.32, 0.72, 0.24, 1)',
    };

    return { dragging, heightStyle, dragRegionProps: { onPointerDown }, wasDraggedRef };
}
