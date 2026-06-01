import type { RefObject } from 'react';
import type { ClosestNowObject, ObjectLimit, SelectionMode, UnifiedApproach } from '@/types';
import type { MobilePanelSection } from './MobilePanelControls';
import type { PlanetId } from '../Scene/planetConfig';

/**
 * Tipos compartilhados pelos subcomponentes do painel de navegação do radar.
 *
 * Mantém contratos de UI perto de Panels sem mover seleção global, ranking ou
 * regras orbitais para os componentes visuais.
 */

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
    'selectionMode' | 'onLimitChange' | 'onModeChange' | 'radarLoading' | 'onRefresh' |
    'planetsOpen' | 'onPlanetsOpenChange' | 'onSelectObject' | 'onFocusBody' | 'onFocusSun'
>;
