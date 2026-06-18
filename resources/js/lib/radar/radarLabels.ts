/**
 * Resolvedor puro de visibilidade dos rótulos do radar.
 *
 * Responsabilidade: dado o conjunto de labels candidatos já projetados em pixels (âncora, tamanho,
 * tipo, seleção) decidir quais aparecem e quais somem, sem tocar em câmera, DOM ou three.js. As
 * regras-chave: rótulos primários (Sol, Terra, Lua, planetas, selecionado, hover) nunca somem por
 * colidirem entre si ou com a UI, só quando um corpo 3D real cobre forte o disco; rochas comuns
 * aparecem na âncora e só somem por densidade local (vira pilha) ou oclusão 3D forte; nada é
 * reposicionado, é aparecer ou sumir. Não calcula efeméride nem decide foco/seleção.
 */
export type RadarLabelKind =
    | 'selected'
    | 'hover'
    | 'sun'
    | 'earth'
    | 'moon'
    | 'planet'
    | 'asteroid'
    | 'auxiliary';

export type RadarLabelPlacement =
    | 'above'
    | 'right'
    | 'left'
    | 'below'
    | 'upper-right'
    | 'upper-left'
    | 'lower-right'
    | 'lower-left';

export type RadarLabelRect = { left: number; top: number; right: number; bottom: number };

export type RadarLabelCandidate = {
    id: string;
    kind: RadarLabelKind;
    anchor: { x: number; y: number };
    size: { width: number; height: number };
    selected?: boolean;
    hovered?: boolean;
    importance?: number;
};

export type RadarLabelObjectBounds = {
    id?: string;
    x: number;
    y: number;
    radius: number;
};

type AcceptedRadarLabelBounds = {
    rect: RadarLabelRect;
    kind: RadarLabelKind;
    selected: boolean;
};

export type ResolveRadarLabelsOptions = {
    viewport: { width: number; height: number };
    objectBounds?: RadarLabelObjectBounds[];
    blockedRects?: RadarLabelRect[];
    previousPlacements?: Map<string, RadarLabelPlacement>;
    mobile?: boolean;
    zoomedOut?: boolean;
    marginPx?: number;
};

export type ResolvedRadarLabel = {
    id: string;
    visible: boolean;
    priority: number;
    placement: RadarLabelPlacement;
    offset: { x: number; y: number };
    rect: RadarLabelRect;
    hiddenReason?: 'behind-cap' | 'collision';
};

// A Terra é a referência central do radar: fica acima de Sol, Lua e planetas para ser processada
// antes deles e poder "ganhar" a colisão (os outros primários somem quando encostam nela).
const BASE_PRIORITY: Record<RadarLabelKind, number> = {
    selected: 10000,
    hover: 9000,
    earth: 7800,
    sun: 7600,
    moon: 7100,
    planet: 6100,
    asteroid: 2600,
    auxiliary: 1000,
};

const ASTEROID_LABEL_COLLISION_SCALE = 0.58;
const ASTEROID_LABEL_MARGIN_SCALE = 0.45;

// Quantos vizinhos-rocha precisam amontoar ao redor de uma rocha antes de ela ser escondida.
// Abaixo disso a rocha aparece mesmo no zoom out — só some quando a região vira uma pilha ilegível.
const ASTEROID_CROWDING_LIMIT = 2;

/**
 * Labels primários da cena (Sol, Terra, Lua, planetas) e os de atenção (selecionado / hover).
 *
 * Estes nunca devem sumir por colidirem com outro label, com a UI ou por cap de zoom: são as
 * referências fixas que orientam o usuário. A única coisa que pode escondê-los é um corpo 3D real
 * passando na frente do disco (oclusão geométrica forte), tratado à parte em findSafeLabelPosition.
 */
function isPrimaryLabel(candidate: Pick<RadarLabelCandidate, 'kind' | 'selected'>): boolean {
    if (candidate.selected) return true;
    return candidate.kind === 'sun'
        || candidate.kind === 'earth'
        || candidate.kind === 'moon'
        || candidate.kind === 'planet'
        || candidate.kind === 'selected'
        || candidate.kind === 'hover';
}

/**
 * Faixa de z-index (para o `<Html>` do drei) que empilha os labels por importância, não por
 * profundidade na cena. drei interpola dentro da faixa conforme a distância da câmera, então faixas
 * que NÃO se sobrepõem garantem a ordem: selecionado/hover acima de tudo > Terra > demais primários
 * > rochas. Sem isso, um label de rocha mais perto da câmera podia cobrir o label da Terra.
 *
 * Os ticks temporais da trajetória (-24/-48/-72) ficam logo acima da Terra e abaixo do selecionado
 * (ver `tickZIndexRange`), numa faixa entre [38] (topo da Terra) e [42] (piso do selecionado).
 */
export function labelZIndexRange(candidate: Pick<RadarLabelCandidate, 'kind' | 'selected' | 'hovered'>): [number, number] {
    if (candidate.selected || candidate.kind === 'selected' || candidate.hovered || candidate.kind === 'hover') return [48, 42];
    if (candidate.kind === 'earth') return [38, 30];
    if (candidate.kind === 'sun' || candidate.kind === 'moon' || candidate.kind === 'planet') return [28, 20];
    return [18, 0];
}

/**
 * Faixa de z dos ticks temporais da trajetória (-24/-48/-72): logo ACIMA da Terra ([38]) e ABAIXO
 * do selecionado/hover ([42]). Mantida separada de `labelZIndexRange` porque o tick não é um
 * candidato do resolvedor de labels — é renderizado direto por `TrajectoryMarkers`.
 */
export const TICK_Z_INDEX_RANGE: [number, number] = [40, 39];

export function getLabelPriority(candidate: Pick<RadarLabelCandidate, 'kind' | 'selected' | 'hovered' | 'importance'>): number {
    if (candidate.selected || candidate.kind === 'selected') return BASE_PRIORITY.selected;
    if (candidate.hovered || candidate.kind === 'hover') return BASE_PRIORITY.hover;
    return BASE_PRIORITY[candidate.kind] + (candidate.importance ?? 0);
}

export function doesLabelCollide(
    rect: RadarLabelRect,
    acceptedRects: AcceptedRadarLabelBounds[],
    objectBounds: RadarLabelObjectBounds[],
    blockedRects: RadarLabelRect[],
    marginPx: number,
    candidate?: RadarLabelCandidate,
): boolean {
    return acceptedRects.some((accepted) => shouldBlockLabelCollision(candidate, accepted) && rectsIntersect(rect, accepted.rect, marginPx))
        || (shouldBlockUiCollision(candidate) && blockedRects.some((blocked) => rectsIntersect(rect, blocked, marginPx)))
        || objectBounds.some((object) => circleOverlapsLabelRect(object, rect, marginPx));
}

export function findSafeLabelPosition({
    candidate,
    acceptedRects,
    objectBounds,
    blockedRects,
    viewport,
    marginPx,
}: {
    candidate: RadarLabelCandidate;
    acceptedRects: AcceptedRadarLabelBounds[];
    objectBounds: RadarLabelObjectBounds[];
    blockedRects: RadarLabelRect[];
    viewport: ResolveRadarLabelsOptions['viewport'];
    marginPx: number;
    previousPlacement?: RadarLabelPlacement;
}): ResolvedRadarLabel | null {
    // Primários (Sol, Terra, Lua, planetas, selecionado, hover): nunca somem por colidirem com
    // labels comuns nem por estar fora da viewport. A ÚNICA coisa que os esconde é um corpo 3D
    // DIFERENTE passando forte na frente do disco — oclusão geométrica real, não encostar na borda.
    if (isPrimaryLabel(candidate)) {
        const rect = rectAtAnchor(candidate);
        if (objectBounds.some((object) => !isOwnOccluder(object, candidate) && objectStronglyCoversLabelRect(object, rect))) return null;

        // Exceção: a Terra é a referência central. Sol, Lua e planetas (não selecionados/hover)
        // que colidem com a label da Terra já aceita somem — quem fica é a Terra.
        if (yieldsToEarth(candidate) && collidesWithAcceptedEarth(rect, acceptedRects, marginPx)) return null;

        return resolved(candidate, 'above', rect);
    }

    if (isFixedAsteroidLabel(candidate)) {
        const rect = rectAtAnchor(candidate);
        const collisionRect = collisionRectForCandidate(candidate, rect);

        if (!rectInsideViewport(rect, viewport, marginPx)) return null;
        // Rocha some quando um corpo 3D real cobre forte a área dela...
        if (objectBounds.some((object) => !isOwnOccluder(object, candidate) && objectStronglyCoversLabelRect(object, collisionRect))) return null;
        // ...ou quando colide com a label de um primário já aceito (Sol, Terra, Lua, planeta): o
        // primário tem preferência, a rocha não selecionada cede.
        if (collidesWithAcceptedPrimary(collisionRect, acceptedRects, marginPx)) return null;
        // ...ou quando vira parte de uma pilha: muitas outras rochas amontoadas na mesma região.
        if (countCrowdingNeighbors(collisionRect, acceptedRects, marginPx) >= ASTEROID_CROWDING_LIMIT) return null;

        return resolved(candidate, 'above', rect);
    }

    const rect = rectAtAnchor(candidate);
    const collisionRect = collisionRectForCandidate(candidate, rect);
    const collisionMargin = collisionMarginForCandidate(candidate, marginPx);
    if (!rectInsideViewport(rect, viewport, marginPx)) return null;
    if (doesLabelCollide(collisionRect, acceptedRects, objectBounds, blockedRects, collisionMargin, candidate)) return null;

    return resolved(candidate, 'above', rect);
}

// Sol, Lua e planetas cedem o espaço para a Terra. O selecionado/hover não cede (fica acima de
// tudo) e a própria Terra obviamente não cede para si mesma.
function yieldsToEarth(candidate: RadarLabelCandidate): boolean {
    if (candidate.selected || candidate.kind === 'selected' || candidate.kind === 'hover') return false;
    return candidate.kind === 'sun' || candidate.kind === 'moon' || candidate.kind === 'planet';
}

function collidesWithAcceptedEarth(
    rect: RadarLabelRect,
    acceptedRects: AcceptedRadarLabelBounds[],
    marginPx: number,
): boolean {
    return acceptedRects.some((accepted) => accepted.kind === 'earth' && !accepted.selected && rectsIntersect(rect, accepted.rect, marginPx));
}

// Uma rocha não selecionada cede para qualquer primário já aceito (Sol, Terra, Lua, planeta ou o
// corpo selecionado): o primário tem preferência na colisão.
function collidesWithAcceptedPrimary(
    rect: RadarLabelRect,
    acceptedRects: AcceptedRadarLabelBounds[],
    marginPx: number,
): boolean {
    return acceptedRects.some((accepted) =>
        isPrimaryLabel({ kind: accepted.kind, selected: accepted.selected })
        && rectsIntersect(rect, accepted.rect, marginPx));
}

/**
 * Conta quantas rochas já aceitas se sobrepõem ao retângulo de uma rocha candidata.
 *
 * É o coração do "amontoar inteligente": uma rocha isolada (poucos vizinhos) continua visível
 * mesmo no zoom out; só quando a vizinhança vira uma pilha ilegível é que a candidata some.
 */
function countCrowdingNeighbors(
    rect: RadarLabelRect,
    acceptedRects: AcceptedRadarLabelBounds[],
    marginPx: number,
): number {
    let count = 0;
    for (const accepted of acceptedRects) {
        if (accepted.kind !== 'asteroid' || accepted.selected) continue;
        if (rectsIntersect(rect, accepted.rect, marginPx)) count += 1;
    }
    return count;
}

export function resolveRadarLabels(
    candidates: RadarLabelCandidate[],
    options: ResolveRadarLabelsOptions,
): ResolvedRadarLabel[] {
    const marginPx = options.marginPx ?? (options.mobile ? 8 : 12);
    const objectBounds = options.objectBounds ?? [];
    const blockedRects = options.blockedRects ?? [];
    const maxSecondaryLabels = !options.zoomedOut
        ? Number.POSITIVE_INFINITY
        : options.mobile
        ? (options.zoomedOut ? 3 : 7)
        : (options.zoomedOut ? 6 : 14);

    const sorted = [...candidates]
        .map((candidate) => ({ candidate, priority: getLabelPriority(candidate) }))
        .sort((a, b) => b.priority - a.priority || a.candidate.id.localeCompare(b.candidate.id));

    const acceptedRects: AcceptedRadarLabelBounds[] = [];
    const resolvedById = new Map<string, ResolvedRadarLabel>();
    let secondaryAccepted = 0;

    for (const { candidate, priority } of sorted) {
        const isSelected = candidate.selected || candidate.kind === 'selected';
        const fixedAsteroid = isFixedAsteroidLabel(candidate);
        if (shouldApplyDistanceCap(candidate) && secondaryAccepted >= maxSecondaryLabels) {
            resolvedById.set(candidate.id, hidden(candidate, priority, 'behind-cap'));
            continue;
        }

        const result = findSafeLabelPosition({
            candidate,
            acceptedRects,
            objectBounds,
            blockedRects,
            viewport: options.viewport,
            marginPx,
            previousPlacement: options.previousPlacements?.get(candidate.id),
        });

        if (!result) {
            resolvedById.set(candidate.id, hidden(candidate, priority, 'collision'));
            continue;
        }

        result.priority = priority;
        acceptedRects.push({
            rect: collisionRectForCandidate(candidate, result.rect),
            kind: candidate.kind,
            selected: isSelected,
        });
        resolvedById.set(candidate.id, result);
        if (shouldApplyDistanceCap(candidate)) secondaryAccepted += 1;
    }

    return candidates.map((candidate) => resolvedById.get(candidate.id) ?? hidden(candidate, getLabelPriority(candidate), 'collision'));
}

export function projectLabelToScreen(
    point: { x: number; y: number; z: number },
    project: (point: { x: number; y: number; z: number }) => { x: number; y: number; z?: number },
    viewport: { width: number; height: number },
): { x: number; y: number; behind: boolean } {
    const projected = project(point);
    return {
        x: (projected.x * 0.5 + 0.5) * viewport.width,
        y: (-projected.y * 0.5 + 0.5) * viewport.height,
        behind: (projected.z ?? 0) > 1,
    };
}

function rectForPlacement(candidate: RadarLabelCandidate, placement: RadarLabelPlacement, marginPx: number): RadarLabelRect {
    const { width, height } = candidate.size;
    const gap = marginPx + 6;
    const dx = placementOffsetX(placement, width, gap);
    const dy = placementOffsetY(placement, height, gap);
    const centerX = candidate.anchor.x + dx;
    const centerY = candidate.anchor.y + dy;

    return {
        left: centerX - width * 0.5,
        top: centerY - height * 0.5,
        right: centerX + width * 0.5,
        bottom: centerY + height * 0.5,
    };
}

function rectAtAnchor(candidate: RadarLabelCandidate): RadarLabelRect {
    const { width, height } = candidate.size;

    return {
        left: candidate.anchor.x - width * 0.5,
        top: candidate.anchor.y - height * 0.5,
        right: candidate.anchor.x + width * 0.5,
        bottom: candidate.anchor.y + height * 0.5,
    };
}

function isFixedAsteroidLabel(candidate: RadarLabelCandidate): boolean {
    return candidate.kind === 'asteroid' && !candidate.selected;
}

/**
 * O oclusor é o próprio corpo do label? Compara o "corpo base" ignorando prefixos de namespace.
 *
 * Os IDs de label trazem prefixo (`planet:mars`, `asteroid:123`) mas os oclusores de cena usam o
 * nome cru (`mars`). Sem normalizar, o disco do próprio corpo poderia ser lido como um corpo 3D
 * "na frente" e esconder o label dele mesmo.
 */
function isOwnOccluder(object: RadarLabelObjectBounds, candidate: RadarLabelCandidate): boolean {
    if (!object.id) return false;
    const base = (id: string) => id.slice(id.indexOf(':') + 1);
    return base(object.id) === base(candidate.id);
}

function shouldBlockLabelCollision(candidate: RadarLabelCandidate | undefined, accepted: AcceptedRadarLabelBounds): boolean {
    if (!candidate) return true;
    if (candidate.kind === 'asteroid' && !candidate.selected) return false;
    if (isPrimaryLabel(candidate)) return false;
    return true;
}

function shouldBlockUiCollision(candidate: RadarLabelCandidate | undefined): boolean {
    if (!candidate) return true;
    return !isPrimaryLabel(candidate);
}

// O cap de zoom out só atinge labels secundários (auxiliares). Primários (Sol, Terra, Lua,
// planetas, selecionado) e rochas têm regras próprias de visibilidade e nunca caem no cap.
function shouldApplyDistanceCap(candidate: RadarLabelCandidate): boolean {
    if (isPrimaryLabel(candidate)) return false;
    if (candidate.kind === 'asteroid') return false;
    return true;
}

function collisionRectForCandidate(candidate: RadarLabelCandidate, rect: RadarLabelRect): RadarLabelRect {
    if (candidate.kind !== 'asteroid' || candidate.selected) return rect;

    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    const insetX = width * (1 - ASTEROID_LABEL_COLLISION_SCALE) * 0.5;
    const insetY = height * (1 - ASTEROID_LABEL_COLLISION_SCALE) * 0.5;

    return {
        left: rect.left + insetX,
        top: rect.top + insetY,
        right: rect.right - insetX,
        bottom: rect.bottom - insetY,
    };
}

function collisionMarginForCandidate(candidate: RadarLabelCandidate, marginPx: number): number {
    if (candidate.kind !== 'asteroid' || candidate.selected) return marginPx;
    return marginPx * ASTEROID_LABEL_MARGIN_SCALE;
}

function placementOffsetX(placement: RadarLabelPlacement, width: number, gap: number): number {
    if (placement === 'right' || placement === 'upper-right' || placement === 'lower-right') return width * 0.5 + gap;
    if (placement === 'left' || placement === 'upper-left' || placement === 'lower-left') return -(width * 0.5 + gap);
    return 0;
}

function placementOffsetY(placement: RadarLabelPlacement, height: number, gap: number): number {
    if (placement === 'above' || placement === 'upper-right' || placement === 'upper-left') return -(height * 0.5 + gap);
    if (placement === 'below' || placement === 'lower-right' || placement === 'lower-left') return height * 0.5 + gap;
    return 0;
}

function resolved(candidate: RadarLabelCandidate, placement: RadarLabelPlacement, rect: RadarLabelRect): ResolvedRadarLabel {
    return {
        id: candidate.id,
        visible: true,
        priority: getLabelPriority(candidate),
        placement,
        offset: {
            x: (rect.left + rect.right) * 0.5 - candidate.anchor.x,
            y: (rect.top + rect.bottom) * 0.5 - candidate.anchor.y,
        },
        rect,
    };
}

function hidden(candidate: RadarLabelCandidate, priority: number, hiddenReason: ResolvedRadarLabel['hiddenReason']): ResolvedRadarLabel {
    const rect = rectForPlacement(candidate, 'above', 0);
    return {
        id: candidate.id,
        visible: false,
        priority,
        placement: 'above',
        offset: { x: 0, y: 0 },
        rect,
        hiddenReason,
    };
}

function rectsIntersect(a: RadarLabelRect, b: RadarLabelRect, marginPx: number): boolean {
    return a.left < b.right + marginPx
        && a.right > b.left - marginPx
        && a.top < b.bottom + marginPx
        && a.bottom > b.top - marginPx;
}

function circleOverlapsLabelRect(object: RadarLabelObjectBounds, rect: RadarLabelRect, marginPx: number): boolean {
    const nearestX = Math.max(rect.left, Math.min(object.x, rect.right));
    const nearestY = Math.max(rect.top, Math.min(object.y, rect.bottom));
    return Math.hypot(object.x - nearestX, object.y - nearestY) < object.radius + marginPx;
}

function objectStronglyCoversLabelRect(object: RadarLabelObjectBounds, rect: RadarLabelRect): boolean {
    const centerX = (rect.left + rect.right) * 0.5;
    const centerY = (rect.top + rect.bottom) * 0.5;
    const labelHalfDiagonal = Math.hypot(rect.right - rect.left, rect.bottom - rect.top) * 0.5;
    const strongRadius = Math.max(0, object.radius - labelHalfDiagonal * 0.35);

    return Math.hypot(object.x - centerX, object.y - centerY) < strongRadius * 0.72;
}

function rectInsideViewport(rect: RadarLabelRect, viewport: ResolveRadarLabelsOptions['viewport'], marginPx: number): boolean {
    return rect.left >= marginPx
        && rect.top >= marginPx
        && rect.right <= viewport.width - marginPx
        && rect.bottom <= viewport.height - marginPx;
}
