/**
 * Geometria pura dos bottom sheets mobile do radar.
 *
 * Responsabilidade: definir os pontos de encaixe (snap) dos sheets e resolver,
 * a partir de alturas em pixels, qual snap fica mais próximo, quando um arraste
 * deve dispensar o sheet e qual snap vem a seguir num toque no handle.
 * Funções puras, testáveis em Node, sem React e sem DOM.
 */

export type SheetSnap = 'peek' | 'half' | 'full';

export type SheetSnapFractions = Record<'half' | 'full', number>;

/** Frações padrão dos sheets de navegação (lista de objetos, filtros). */
export const SHEET_SNAP_FRACTION: SheetSnapFractions = {
    half: 0.5,
    full: 0.88,
};

/**
 * Frações do card de foco: o meio aberto é mais baixo porque o conteúdo
 * prioriza métricas (sem preview) e a cena deve continuar protagonista.
 */
export const FOCUS_CARD_SNAP_FRACTION: SheetSnapFractions = {
    half: 0.42,
    full: 0.88,
};

/** Altura fixa do estado minimizado: handle + cabeçalho do card visíveis. */
export const PEEK_HEIGHT_PX = 108;

/** Abaixo desta fração do menor snap, o arraste para baixo dispensa o sheet. */
export const DISMISS_FACTOR = 0.62;

/** Altura em pixels de um snap, dada a altura do contêiner do sheet. */
export function snapHeightPx(snap: SheetSnap, containerHeightPx: number, fractions: SheetSnapFractions = SHEET_SNAP_FRACTION): number {
    if (snap === 'peek') return PEEK_HEIGHT_PX;
    return fractions[snap] * containerHeightPx;
}

/**
 * Altura CSS de descanso de um snap. Percentuais mantêm o sheet proporcional
 * ao contêiner em rotação/resize sem recálculo em JS.
 */
export function snapHeightCss(snap: SheetSnap, fractions: SheetSnapFractions = SHEET_SNAP_FRACTION): string {
    if (snap === 'peek') return `${PEEK_HEIGHT_PX}px`;
    return `${fractions[snap] * 100}%`;
}

/** Limita a altura durante o arraste: nunca menor que meio peek nem maior que 92% do contêiner. */
export function clampDragHeight(heightPx: number, containerHeightPx: number): number {
    const min = PEEK_HEIGHT_PX * 0.5;
    const max = containerHeightPx * 0.92;
    return Math.min(Math.max(heightPx, min), max);
}

/** Snap mais próximo da altura final do arraste. Empate resolve para o snap mais baixo. */
export function nearestSnap(heightPx: number, snaps: SheetSnap[], containerHeightPx: number, fractions: SheetSnapFractions = SHEET_SNAP_FRACTION): SheetSnap {
    let best = snaps[0];
    let bestDelta = Number.POSITIVE_INFINITY;
    for (const snap of snaps) {
        const delta = Math.abs(snapHeightPx(snap, containerHeightPx, fractions) - heightPx);
        if (delta < bestDelta) {
            best = snap;
            bestDelta = delta;
        }
    }
    return best;
}

/** True quando o arraste terminou baixo o bastante para fechar o sheet. */
export function shouldDismiss(heightPx: number, snaps: SheetSnap[], containerHeightPx: number, fractions: SheetSnapFractions = SHEET_SNAP_FRACTION): boolean {
    const lowest = snaps.reduce((acc, snap) =>
        snapHeightPx(snap, containerHeightPx, fractions) < snapHeightPx(acc, containerHeightPx, fractions) ? snap : acc, snaps[0]);
    return heightPx < snapHeightPx(lowest, containerHeightPx, fractions) * DISMISS_FACTOR;
}

/**
 * Próximo snap ao tocar o handle: sobe um nível; no topo, volta ao mais baixo.
 * Dá ao toque o papel de "ciclar" estados sem precisar arrastar.
 */
export function nextSnapOnTap(current: SheetSnap, snaps: SheetSnap[]): SheetSnap {
    const index = snaps.indexOf(current);
    if (index === -1) return snaps[0];
    return snaps[(index + 1) % snaps.length];
}
