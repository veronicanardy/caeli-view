/**
 * Contratos compartilhados da navegação do radar.
 *
 * Responsabilidade: separar props do painel principal das props realmente usadas
 * pelos conteúdos mobile/desktop, evitando que callbacks de filtros vazem para
 * subcomponentes que não os renderizam.
 */

import type { RefObject } from 'react';
import type { ClosestNowObject, ObjectLimit, SelectionMode, UnifiedApproach } from '@/types';
import type { PlanetId } from '../Scene/planetConfig';
import type { KnownSpacecraft } from '../Bodies/Spacecraft/knownSpacecraft';

/** Sheets mobile da navegação: lista de objetos ou filtros. Null = nenhum aberto. */
export type MobileSheetSection = 'objects' | 'filters';

export type RadarNavigationPanelProps = {
    en: boolean;
    locale: 'pt-BR' | 'en';
    orbitMode: boolean;
    closestNowObjects: ClosestNowObject[];
    selectedId: string | null;
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onLimitChange: (limit: ObjectLimit) => void;
    onModeChange: (mode: SelectionMode) => void;
    radarLoading: boolean;
    onRefresh?: () => void;
    mobileSheet: MobileSheetSection | null;
    onMobileSheetChange: (sheet: MobileSheetSection | null) => void;
    /** Desktop: painel recolhido em pill para dar protagonismo total à cena. */
    desktopCollapsed: boolean;
    onDesktopCollapsedChange: (collapsed: boolean) => void;
    planetsOpen: boolean;
    onPlanetsOpenChange: (open: boolean) => void;
    spacecraftOpen: boolean;
    onSpacecraftOpenChange: (open: boolean) => void;
    bodyCardOpen: 'earth' | 'moon' | 'sun' | PlanetId | null;
    sidePanelRef: RefObject<HTMLDivElement | null>;
    planetFlyoutRef: RefObject<HTMLDivElement | null>;
    onSelectObject: (approach: UnifiedApproach) => void;
    onFocusBody: (body: 'earth' | 'moon') => void;
    onFocusPlanet: (id: PlanetId) => void;
    onFocusSun: () => void;
    /** Foca a câmera numa nave (Voyager, Juno...) e abre o card dela. */
    onFocusSpacecraft: (craft: KnownSpacecraft) => void;
    /** Id da nave selecionada (knownSpacecraftId), para realçar no flyout. */
    selectedSpacecraftId: string | null;
};

export type NavigationContentProps = Pick<RadarNavigationPanelProps,
    'en' | 'locale' | 'orbitMode' | 'closestNowObjects' | 'selectedId' | 'objectLimit' |
    'selectionMode' | 'radarLoading' | 'onRefresh' |
    'planetsOpen' | 'onPlanetsOpenChange' | 'spacecraftOpen' | 'onSpacecraftOpenChange' |
    'onSelectObject' | 'onFocusBody' | 'onFocusSun' |
    'onFocusSpacecraft' | 'selectedSpacecraftId'
>;
