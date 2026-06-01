/**
 * Tipos internos compartilhados pelas camadas SVG do radar.
 *
 * Este arquivo centraliza apenas contratos de renderizacao e interacao já
 * resolvidos pelo layout. Ele nao deve introduzir calculo orbital, busca de
 * dados ou regras globais de selecao.
 */
import type { Translator } from '@/i18n';
import type { LayoutObject, RadarLayoutResult } from '@/lib/radarLayout';
import type { HorizonsReferenceMode, UnifiedApproach } from '@/types';

export type RingHoverState = { ld: number; x: number; y: number } | null;

export type RadarSvgLayoutProps = {
    layout: RadarLayoutResult;
};

export type RadarSvgReferenceProps = RadarSvgLayoutProps & {
    referenceMode: HorizonsReferenceMode;
};

export type RadarSvgObjectInteractions = {
    onSelect?: (approach: UnifiedApproach) => void;
    referenceMode: HorizonsReferenceMode;
    t: Translator;
    locale: 'pt-BR' | 'en';
};

export type RadarSvgObjectMarkerProps = RadarSvgObjectInteractions & {
    object: LayoutObject;
};
