import { describe, expect, it } from 'vitest';
import {
    clampDragHeight,
    DISMISS_FACTOR,
    FOCUS_CARD_SNAP_FRACTION,
    nearestSnap,
    nextSnapOnTap,
    PEEK_HEIGHT_PX,
    SHEET_SNAP_FRACTION,
    shouldDismiss,
    snapHeightCss,
    snapHeightPx,
} from '@/Components/Radar/Panels/bottomSheetSnap';
import type { SheetSnap } from '@/Components/Radar/Panels/bottomSheetSnap';

/**
 * `bottomSheetSnap` decide para onde o sheet mobile encaixa após um arraste.
 * Erros aqui fazem o card "pular" para o estado errado ou fechar sem intenção,
 * direto na mão do usuário de celular.
 */

const CONTAINER = 800; // contêiner típico: celular com canvas de ~800px de altura

const CARD_SNAPS: SheetSnap[] = ['peek', 'half', 'full'];
const LIST_SNAPS: SheetSnap[] = ['half', 'full'];

// ─── snapHeightPx / snapHeightCss ─────────────────────────────────────────────

describe('snapHeightPx', () => {
    it('peek tem altura fixa em px, independente do contêiner', () => {
        expect(snapHeightPx('peek', CONTAINER)).toBe(PEEK_HEIGHT_PX);
        expect(snapHeightPx('peek', 400)).toBe(PEEK_HEIGHT_PX);
    });

    it('half e full são proporcionais ao contêiner', () => {
        expect(snapHeightPx('half', CONTAINER)).toBe(SHEET_SNAP_FRACTION.half * CONTAINER);
        expect(snapHeightPx('full', CONTAINER)).toBe(SHEET_SNAP_FRACTION.full * CONTAINER);
    });
});

describe('snapHeightCss', () => {
    it('peek em px, half/full em porcentagem', () => {
        expect(snapHeightCss('peek')).toBe(`${PEEK_HEIGHT_PX}px`);
        expect(snapHeightCss('half')).toBe('50%');
        expect(snapHeightCss('full')).toBe('88%');
    });

    it('frações customizadas (card de foco) refletem no CSS e no px', () => {
        expect(snapHeightCss('half', FOCUS_CARD_SNAP_FRACTION)).toBe('42%');
        expect(snapHeightPx('half', CONTAINER, FOCUS_CARD_SNAP_FRACTION)).toBe(FOCUS_CARD_SNAP_FRACTION.half * CONTAINER);
        // Peek independe das frações: altura fixa.
        expect(snapHeightCss('peek', FOCUS_CARD_SNAP_FRACTION)).toBe(`${PEEK_HEIGHT_PX}px`);
    });
});

// ─── clampDragHeight ──────────────────────────────────────────────────────────

describe('clampDragHeight', () => {
    it('não deixa o sheet menor que meio peek nem maior que 92% do contêiner', () => {
        expect(clampDragHeight(0, CONTAINER)).toBe(PEEK_HEIGHT_PX * 0.5);
        expect(clampDragHeight(10_000, CONTAINER)).toBe(CONTAINER * 0.92);
    });

    it('mantém alturas dentro da faixa', () => {
        expect(clampDragHeight(300, CONTAINER)).toBe(300);
    });
});

// ─── nearestSnap ──────────────────────────────────────────────────────────────

describe('nearestSnap', () => {
    it('encaixa exatamente na altura de cada snap', () => {
        for (const snap of CARD_SNAPS) {
            expect(nearestSnap(snapHeightPx(snap, CONTAINER), CARD_SNAPS, CONTAINER)).toBe(snap);
        }
    });

    it('alturas intermediárias vão para o snap mais próximo', () => {
        // peek=108, half=400: ponto médio é 254
        expect(nearestSnap(200, CARD_SNAPS, CONTAINER)).toBe('peek');
        expect(nearestSnap(300, CARD_SNAPS, CONTAINER)).toBe('half');
        // half=400, full=704: ponto médio é 552
        expect(nearestSnap(500, CARD_SNAPS, CONTAINER)).toBe('half');
        expect(nearestSnap(600, CARD_SNAPS, CONTAINER)).toBe('full');
    });

    it('respeita a lista de snaps disponível (sheet sem peek)', () => {
        expect(nearestSnap(120, LIST_SNAPS, CONTAINER)).toBe('half');
    });

    it('usa as frações customizadas para decidir o snap', () => {
        // Com o card de foco: half=336 (0.42), full=704. Ponto médio é 520.
        expect(nearestSnap(500, CARD_SNAPS, CONTAINER, FOCUS_CARD_SNAP_FRACTION)).toBe('half');
        expect(nearestSnap(540, CARD_SNAPS, CONTAINER, FOCUS_CARD_SNAP_FRACTION)).toBe('full');
    });
});

// ─── shouldDismiss ────────────────────────────────────────────────────────────

describe('shouldDismiss', () => {
    it('dispensa quando o arraste termina bem abaixo do menor snap', () => {
        const lowest = snapHeightPx('half', CONTAINER);
        expect(shouldDismiss(lowest * DISMISS_FACTOR - 1, LIST_SNAPS, CONTAINER)).toBe(true);
        expect(shouldDismiss(lowest * DISMISS_FACTOR + 1, LIST_SNAPS, CONTAINER)).toBe(false);
    });

    it('com peek disponível, o limite de dispensa é relativo ao peek', () => {
        expect(shouldDismiss(PEEK_HEIGHT_PX * DISMISS_FACTOR - 1, CARD_SNAPS, CONTAINER)).toBe(true);
        expect(shouldDismiss(PEEK_HEIGHT_PX, CARD_SNAPS, CONTAINER)).toBe(false);
    });
});

// ─── nextSnapOnTap ────────────────────────────────────────────────────────────

describe('nextSnapOnTap', () => {
    it('sobe um nível a cada toque e volta ao início no topo', () => {
        expect(nextSnapOnTap('peek', CARD_SNAPS)).toBe('half');
        expect(nextSnapOnTap('half', CARD_SNAPS)).toBe('full');
        expect(nextSnapOnTap('full', CARD_SNAPS)).toBe('peek');
    });

    it('snap desconhecido cai no primeiro da lista', () => {
        expect(nextSnapOnTap('peek', LIST_SNAPS)).toBe('half');
    });
});
