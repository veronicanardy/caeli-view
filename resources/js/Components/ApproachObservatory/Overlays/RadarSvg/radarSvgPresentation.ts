/**
 * Helpers de apresentacao compartilhados pelo radar SVG.
 *
 * Aqui vivem apenas formatacoes visuais e pequenos mapeamentos de estilo que
 * dependem de dados ja preparados. Este modulo nao deve decidir geometria,
 * ranking ou fallback cientifico.
 */
import type { Translator } from '@/i18n';
import type { LayoutRing, RadarLayoutResult } from '@/lib/radarLayout';
import type { HorizonsFailureKind } from '@/types';

export function ringStrokeColor(ring: LayoutRing, hovered: boolean): string {
    if (hovered) return 'rgba(84,214,214,0.62)';
    if (ring.emphasize) return 'rgba(255,255,255,0.45)';
    return 'rgba(255,255,255,0.2)';
}

export function ringStrokeWidth(ring: LayoutRing, hovered: boolean): number {
    if (hovered) return 1.9;
    if (ring.emphasize) return 1.4;
    return 1.1;
}

export function visualMoonRadius(layout: RadarLayoutResult): number {
    return Math.max(layout.moon.radiusPx, layout.earth.radiusPx * 0.273, 14);
}

export function formatRingHoverLabel(ld: number): string {
    const value = ld >= 1 ? String(ld) : ld.toString().replace('.', ',');
    return `${value} DL`;
}

export function formatDateTimeUTC(value: string | null, locale: 'pt-BR' | 'en'): string {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' }).format(parsed);
}

export function symbolicTooltipText(kind: HorizonsFailureKind | null, t: Translator): string {
    if (kind === 'horizons_transient') return t('observatory.radar.tooltip.symbolic.horizons_transient');
    if (kind === 'no_ephemeris') return t('observatory.radar.tooltip.symbolic.no_ephemeris');
    if (kind === 'no_orbital_data') return t('observatory.radar.tooltip.symbolic.no_orbital_data');
    return t('observatory.radar.tooltip.symbolic');
}
