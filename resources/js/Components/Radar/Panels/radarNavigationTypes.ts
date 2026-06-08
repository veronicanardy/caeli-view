/**
 * Contratos compartilhados da navegação do radar.
 *
 * Responsabilidade: separar props do painel principal das props realmente usadas
 * pelos conteúdos mobile/desktop, evitando que callbacks de filtros vazem para
 * subcomponentes que não os renderizam.
 */

import type { RefObject } from 'react';
import type { ClosestNowObject, ObjectLimit, SelectionMode, UnifiedApproach } from '@/types';
import type { MobilePanelSection } from './MobilePanelControls';
import type { PlanetId } from '../Scene/planetConfig';

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
    panelCollapsed: boolean;
    onPanelCollapsedChange: (collapsed: boolean) => void;
    mobilePanelSection: MobilePanelSection;
    onMobilePanelSectionChange: (section: MobilePanelSection) => void;
    planetsOpen: boolean;
    onPlanetsOpenChange: (open: boolean) => void;
    bodyCardOpen: 'earth' | 'moon' | 'sun' | PlanetId | null;
    sidePanelRef: RefObject<HTMLDivElement | null>;
    planetFlyoutRef: RefObject<HTMLDivElement | null>;
    onShowNavigationPanel: () => void;
    onSelectObject: (approach: UnifiedApproach) => void;
    onFocusBody: (body: 'earth' | 'moon') => void;
    onFocusPlanet: (id: PlanetId) => void;
    onFocusSun: () => void;
};

export type NavigationContentProps = Pick<RadarNavigationPanelProps,
    'en' | 'locale' | 'orbitMode' | 'closestNowObjects' | 'selectedId' | 'objectLimit' |
    'selectionMode' | 'radarLoading' | 'onRefresh' |
    'planetsOpen' | 'onPlanetsOpenChange' | 'onSelectObject' | 'onFocusBody' | 'onFocusSun'
>;
