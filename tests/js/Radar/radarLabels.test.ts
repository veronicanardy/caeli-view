import { describe, expect, it } from 'vitest';
import {
    findSafeLabelPosition,
    getLabelPriority,
    labelZIndexRange,
    resolveRadarLabels,
    type RadarLabelCandidate,
    type RadarLabelObjectBounds,
    type RadarLabelPlacement,
    type RadarLabelRect,
} from '@/lib/radar/radarLabels';

const viewport = { width: 800, height: 500 };

function label(id: string, x: number, y: number, kind: RadarLabelCandidate['kind'] = 'asteroid', extra: Partial<RadarLabelCandidate> = {}): RadarLabelCandidate {
    return {
        id,
        kind,
        anchor: { x, y },
        size: { width: 90, height: 24 },
        ...extra,
    };
}

describe('radar label priorities', () => {
    it('da prioridade maxima para o objeto selecionado', () => {
        expect(getLabelPriority(label('rock', 100, 100, 'asteroid', { selected: true })))
            .toBeGreaterThan(getLabelPriority(label('sun', 100, 100, 'sun')));
    });

    it('asteroides nao selecionados ficam abaixo de planetas importantes', () => {
        expect(getLabelPriority(label('mars', 100, 100, 'planet')))
            .toBeGreaterThan(getLabelPriority(label('rock', 100, 100, 'asteroid')));
    });

    it('um asteroide selecionado passa a ter prioridade maxima', () => {
        expect(getLabelPriority(label('rock', 100, 100, 'asteroid', { selected: true })))
            .toBeGreaterThan(getLabelPriority(label('earth', 100, 100, 'earth')));
    });

    it('o Sol tem prioridade alta, mas perde para o selecionado', () => {
        expect(getLabelPriority(label('sun', 100, 100, 'sun')))
            .toBeGreaterThan(getLabelPriority(label('mars', 100, 100, 'planet')));
        expect(getLabelPriority(label('selected', 100, 100, 'moon', { selected: true })))
            .toBeGreaterThan(getLabelPriority(label('sun', 100, 100, 'sun')));
    });
});

describe('labelZIndexRange', () => {
    it('empilha por importancia: selecionado/hover > Terra > demais primarios > rochas', () => {
        const selected = labelZIndexRange({ kind: 'asteroid', selected: true });
        const hover = labelZIndexRange({ kind: 'planet', hovered: true });
        const earth = labelZIndexRange({ kind: 'earth' });
        const sun = labelZIndexRange({ kind: 'sun' });
        const rock = labelZIndexRange({ kind: 'asteroid' });

        // Faixas nao se sobrepoem e estao na ordem certa (piso de cada uma acima do teto da seguinte).
        expect(selected[1]).toBeGreaterThan(earth[0]);
        expect(hover[1]).toBeGreaterThan(earth[0]);
        expect(earth[1]).toBeGreaterThan(sun[0]);
        expect(sun[1]).toBeGreaterThan(rock[0]);
    });
});

describe('resolveRadarLabels', () => {
    it('oculta labels secundarias quando colidem com a label selecionada', () => {
        const tightViewport = { width: 230, height: 140 };
        const result = resolveRadarLabels([
            label('selected', 115, 70, 'asteroid', { selected: true }),
            label('secondary', 115, 70, 'auxiliary'),
        ], { viewport: tightViewport });

        expect(result.find((item) => item.id === 'selected')?.visible).toBe(true);
        expect(result.find((item) => item.id === 'secondary')?.visible).toBe(false);
    });

    it('Sol, Lua e planetas nunca somem por colidirem entre si quando longe da Terra', () => {
        const result = resolveRadarLabels([
            label('sun', 120, 70, 'sun'),
            label('moon', 360, 70, 'moon'),
            label('mars', 600, 70, 'planet'),
        ], { viewport });

        expect(result.every((item) => item.visible)).toBe(true);
        // Aparecem na âncora, sem dança de reposicionamento.
        expect(result.every((item) => item.offset.x === 0 && item.offset.y === 0)).toBe(true);
    });

    it('planeta que colide com a Terra some; a Terra fica', () => {
        const result = resolveRadarLabels([
            label('earth', 200, 200, 'earth'),
            label('mars', 200, 200, 'planet'),
            label('sun', 200, 200, 'sun'),
            label('moon', 200, 200, 'moon'),
        ], { viewport });

        expect(result.find((item) => item.id === 'earth')?.visible).toBe(true);
        expect(result.find((item) => item.id === 'mars')?.visible).toBe(false);
        expect(result.find((item) => item.id === 'sun')?.visible).toBe(false);
        expect(result.find((item) => item.id === 'moon')?.visible).toBe(false);
    });

    it('um planeta SELECIONADO nunca cede para a Terra', () => {
        const result = resolveRadarLabels([
            label('earth', 200, 200, 'earth'),
            label('mars', 200, 200, 'planet', { selected: true }),
        ], { viewport });

        expect(result.find((item) => item.id === 'earth')?.visible).toBe(true);
        expect(result.find((item) => item.id === 'mars')?.visible).toBe(true);
    });

    it('nao aceita uma label secundaria quando ela cobre um objeto 3D', () => {
        const objects: RadarLabelObjectBounds[] = [{ id: 'earth', x: 200, y: 200, radius: 140 }];
        const result = resolveRadarLabels([
            label('planet', 200, 200, 'planet'),
        ], { viewport, objectBounds: objects });

        expect(result[0].visible).toBe(false);
    });

    it('oculta label de rocha quando um objeto 3D cobre a area dela', () => {
        const objects: RadarLabelObjectBounds[] = [{ id: 'earth', x: 200, y: 200, radius: 140 }];
        const result = resolveRadarLabels([
            label('rock', 200, 200, 'asteroid'),
        ], { viewport, objectBounds: objects });

        expect(result[0].visible).toBe(false);
    });

    it('rocha nao selecionada cede para a label de um planeta na colisao', () => {
        const result = resolveRadarLabels([
            label('mars', 200, 220, 'planet'),
            label('rock', 200, 220, 'asteroid'),
        ], { viewport });

        expect(result.find((item) => item.id === 'mars')?.visible).toBe(true);
        expect(result.find((item) => item.id === 'rock')?.visible).toBe(false);
    });

    it('rocha SELECIONADA nao cede para planeta', () => {
        const result = resolveRadarLabels([
            label('mars', 200, 220, 'planet'),
            label('rock', 200, 220, 'asteroid', { selected: true }),
        ], { viewport });

        expect(result.find((item) => item.id === 'mars')?.visible).toBe(true);
        expect(result.find((item) => item.id === 'rock')?.visible).toBe(true);
    });

    it('mantem label de rocha quando objeto 3D so invade pouco a fronteira', () => {
        const objects: RadarLabelObjectBounds[] = [{ id: 'earth', x: 255, y: 220, radius: 52 }];
        const result = resolveRadarLabels([
            label('rock', 200, 220, 'asteroid'),
        ], { viewport, objectBounds: objects });

        expect(result[0].visible).toBe(true);
    });

    it('nao deixa o proprio oclusor da rocha esconder a sua label', () => {
        const objects: RadarLabelObjectBounds[] = [{ id: 'asteroid:rock', x: 200, y: 200, radius: 140 }];
        const result = resolveRadarLabels([
            label('asteroid:rock', 200, 200, 'asteroid'),
        ], { viewport, objectBounds: objects });

        expect(result[0].visible).toBe(true);
    });

    it('usa uma fronteira mais curta para rochas nao selecionadas', () => {
        const result = resolveRadarLabels([
            label('asteroid-a', 200, 220, 'asteroid'),
            label('asteroid-b', 260, 220, 'asteroid'),
        ], { viewport });

        expect(result.every((item) => item.visible)).toBe(true);
        expect(result.map((item) => item.placement)).toEqual(['above', 'above']);
        expect(result.map((item) => item.offset)).toEqual([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
    });

    it('permite que labels de rocha colidam entre si sem reposicionar', () => {
        const result = resolveRadarLabels([
            label('asteroid-a', 200, 220, 'asteroid'),
            label('asteroid-b', 200, 220, 'asteroid'),
        ], { viewport });

        expect(result.find((item) => item.id === 'asteroid-a')?.visible).toBe(true);
        expect(result.find((item) => item.id === 'asteroid-a')?.offset).toEqual({ x: 0, y: 0 });
        expect(result.find((item) => item.id === 'asteroid-b')?.visible).toBe(true);
        expect(result.find((item) => item.id === 'asteroid-b')?.offset).toEqual({ x: 0, y: 0 });
    });

    it('nao aplica cap de zoom out nas labels de rocha', () => {
        const candidates = Array.from({ length: 10 }, (_, i) => label(`asteroid-${i}`, 120 + i * 40, 220, 'asteroid'));
        const result = resolveRadarLabels(candidates, { viewport, zoomedOut: true });

        expect(result.every((item) => item.visible)).toBe(true);
        expect(result.every((item) => item.offset.x === 0 && item.offset.y === 0)).toBe(true);
    });

    it('rocha isolada continua visivel; rocha amontoada some', () => {
        // Cinco rochas empilhadas quase no mesmo ponto (pilha ilegivel) + uma isolada longe.
        const stacked = Array.from({ length: 5 }, (_, i) => label(`stack-${i}`, 200 + i * 4, 220, 'asteroid'));
        const isolated = label('isolated', 600, 220, 'asteroid');
        const result = resolveRadarLabels([...stacked, isolated], { viewport });

        expect(result.find((item) => item.id === 'isolated')?.visible).toBe(true);
        // A pilha nao some inteira: as primeiras aparecem, mas as ultimas a chegar somem.
        const stackVisible = result.filter((item) => item.id.startsWith('stack-') && item.visible).length;
        expect(stackVisible).toBeGreaterThan(0);
        expect(stackVisible).toBeLessThan(5);
    });

    it('a Lua cede para a Terra quando colide com a label dela', () => {
        const accepted = [{ rect: { left: 155, top: 188, right: 245, bottom: 212 }, kind: 'earth' as const, selected: false }];
        const candidate = label('moon', 200, 200, 'moon');

        const result = findSafeLabelPosition({
            candidate,
            acceptedRects: accepted,
            objectBounds: [],
            blockedRects: [],
            viewport,
            marginPx: 10,
        });

        expect(result).toBeNull();
    });

    it('a Lua aparece normalmente quando NAO colide com a Terra', () => {
        const accepted = [{ rect: { left: 0, top: 0, right: 80, bottom: 24 }, kind: 'earth' as const, selected: false }];
        const candidate = label('moon', 400, 300, 'moon');

        const result = findSafeLabelPosition({
            candidate,
            acceptedRects: accepted,
            objectBounds: [],
            blockedRects: [],
            viewport,
            marginPx: 10,
        });

        expect(result?.visible).toBe(true);
        expect(result?.offset).toEqual({ x: 0, y: 0 });
    });

    it('um primario some quando um corpo 3D diferente cobre o disco dele', () => {
        const candidate = label('moon', 200, 200, 'moon');
        const result = findSafeLabelPosition({
            candidate,
            acceptedRects: [],
            objectBounds: [{ id: 'earth', x: 200, y: 200, radius: 140 }],
            blockedRects: [],
            viewport,
            marginPx: 10,
        });

        expect(result).toBeNull();
    });

    it('um primario NAO some quando o corpo 3D so encosta na borda do label', () => {
        const candidate = label('moon', 200, 200, 'moon');
        const result = findSafeLabelPosition({
            candidate,
            acceptedRects: [],
            objectBounds: [{ id: 'earth', x: 255, y: 220, radius: 52 }],
            blockedRects: [],
            viewport,
            marginPx: 10,
        });

        expect(result?.visible).toBe(true);
    });

    it('no zoom out mostra menos labels secundarias', () => {
        const candidates = Array.from({ length: 8 }, (_, i) => label(
            `aux-${i}`,
            80 + i * 85,
            220,
            'auxiliary',
            { size: { width: 20, height: 20 } },
        ));
        const normal = resolveRadarLabels(candidates, { viewport });
        const zoomedOut = resolveRadarLabels(candidates, { viewport, zoomedOut: true });

        expect(normal.filter((item) => item.visible).length)
            .toBeGreaterThan(zoomedOut.filter((item) => item.visible).length);
    });

    it('nao aplica cap de zoom out em Sol, planetas, Terra ou selecionado', () => {
        const protectedLabels = [
            label('sun', 100, 100, 'sun', { size: { width: 20, height: 20 } }),
            label('earth', 140, 100, 'earth', { size: { width: 20, height: 20 } }),
            label('mars', 180, 100, 'planet', { size: { width: 20, height: 20 } }),
            label('selected-rock', 220, 100, 'asteroid', { selected: true, size: { width: 20, height: 20 } }),
        ];
        const cappedLabels = Array.from({ length: 8 }, (_, i) => label(
            `aux-${i}`,
            100 + i * 40,
            180,
            'auxiliary',
            { size: { width: 20, height: 20 } },
        ));

        const result = resolveRadarLabels([...protectedLabels, ...cappedLabels], { viewport, zoomedOut: true });

        expect(result.filter((item) => protectedLabels.some((candidate) => candidate.id === item.id)).every((item) => item.visible)).toBe(true);
        expect(result.filter((item) => item.id.startsWith('aux-') && item.visible)).toHaveLength(6);
    });

    it('Terra se sobrepoe a labels e UI, mas some sob um corpo 3D na frente', () => {
        const withNormalRock = resolveRadarLabels([
            label('rock', 200, 220, 'asteroid'),
            label('earth', 200, 220, 'earth'),
        ], { viewport });
        const withSelectedRock = resolveRadarLabels([
            label('rock', 200, 220, 'asteroid', { selected: true }),
            label('earth', 200, 220, 'earth'),
        ], { viewport });
        const withUi = resolveRadarLabels([
            label('earth', 200, 220, 'earth'),
        ], { viewport, blockedRects: [{ left: 150, top: 200, right: 250, bottom: 240 }] });
        // Corpo 3D cobrindo forte o disco da Terra: aí sim o label some.
        const behindBody = resolveRadarLabels([
            label('earth', 200, 220, 'earth'),
        ], { viewport, objectBounds: [{ id: 'moon', x: 200, y: 220, radius: 80 }] });

        expect(withNormalRock.find((item) => item.id === 'earth')?.visible).toBe(true);
        expect(withSelectedRock.find((item) => item.id === 'earth')?.visible).toBe(true);
        expect(withUi[0].visible).toBe(true);
        expect(behindBody[0].visible).toBe(false);
    });

    it('no mobile e mais restritivo com labels secundarias', () => {
        const candidates = Array.from({ length: 8 }, (_, i) => label(`aux-${i}`, 80 + i * 85, 220, 'auxiliary'));
        const desktop = resolveRadarLabels(candidates, { viewport });
        const mobile = resolveRadarLabels(candidates, { viewport: { width: 390, height: 700 }, mobile: true });

        expect(desktop.filter((item) => item.visible).length)
            .toBeGreaterThan(mobile.filter((item) => item.visible).length);
    });

    it('ignora posicao anterior para nunca mover a label de lugar', () => {
        const previous = new Map<string, RadarLabelPlacement>([['earth', 'right']]);
        const result = resolveRadarLabels([
            label('earth', 200, 200, 'earth'),
        ], { viewport, previousPlacements: previous });

        expect(result[0].placement).toBe('above');
        expect(result[0].offset).toEqual({ x: 0, y: 0 });
    });
});
