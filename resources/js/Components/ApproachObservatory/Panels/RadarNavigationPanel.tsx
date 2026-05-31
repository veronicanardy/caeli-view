import type { RefObject } from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import type { ClosestNowObject, ObjectLimit, SelectionMode, UnifiedApproach } from '@/types';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import { RadarObjectControls } from '../Controls/RadarObjectControls';
import { PlanetFlyout, ReferenceSection } from '../Controls/ReferenceControls';
import { ObjectListItem } from '../Lists/RadarSceneObjectListItem';
import { EmptyModeMessage, listTitle, MobilePanelMenuButton, MobilePanelSectionHeader, type MobilePanelSection } from './MobilePanelControls';
import type { PlanetId } from '../Scene/planetConfig';

type Props = {
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

/**
 * Painel de navegação do radar 3D.
 *
 * Concentra a UI desktop/mobile de filtros, referências, planetas e lista de objetos,
 * mas não decide seleção nem foco: essas intenções continuam no DailyOrbitalRadar3D.
 */
export function RadarNavigationPanel({
    en,
    locale,
    orbitMode,
    closestNowObjects,
    selectedId,
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    radarLoading,
    onRefresh,
    panelCollapsed,
    onPanelCollapsedChange,
    mobilePanelSection,
    onMobilePanelSectionChange,
    planetsOpen,
    onPlanetsOpenChange,
    bodyCardOpen,
    sidePanelRef,
    planetFlyoutRef,
    onShowNavigationPanel,
    onSelectObject,
    onFocusBody,
    onFocusPlanet,
    onFocusSun,
}: Props) {
    const closeMobilePanel = () => {
        onPanelCollapsedChange(true);
        onMobilePanelSectionChange('menu');
        onPlanetsOpenChange(false);
    };

    const backToMenu = () => onMobilePanelSectionChange('menu');
    const closeReferenceSection = () => {
        onMobilePanelSectionChange('menu');
        onPlanetsOpenChange(false);
    };

    return (
        <div className="pointer-events-none absolute left-3 top-3 z-10">
            <div className="pointer-events-auto relative flex flex-col sm:flex-row items-start gap-2">
                {panelCollapsed ? (
                    <button
                        type="button"
                        onClick={onShowNavigationPanel}
                        aria-label={en ? 'Show navigation panel' : 'Mostrar painel de navegação'}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-space-950/90 px-2.5 py-1.5 text-[11px] font-medium text-white/75 shadow-glow backdrop-blur transition hover:border-white/25 hover:text-white sm:hidden"
                    >
                        <ChevronDown className="size-3.5 -rotate-90" />
                        <span>{en ? 'Objects' : 'Objetos'}</span>
                    </button>
                ) : null}

                <div
                    ref={sidePanelRef}
                    className={[
                        'flex flex-col rounded-xl border border-white/12 bg-space-950/88 backdrop-blur-xl',
                        orbitMode
                            ? 'sm:flex sm:h-[min(18rem,49vh)] sm:w-[min(18rem,48vw)]'
                            : 'sm:flex sm:h-[min(22rem,50vh)] sm:w-[min(18rem,48vw)]',
                        panelCollapsed
                            ? 'hidden sm:flex'
                            : orbitMode
                                ? 'flex h-[min(10.5rem,27vh)] w-[min(15rem,calc(100vw-5rem))]'
                                : 'flex h-[min(13rem,33vh)] w-[min(15rem,calc(100vw-5rem))]',
                    ].join(' ')}
                >
                    <div className="border-b border-white/10 px-2 pt-1 pb-1.5 sm:hidden">
                        <button
                            type="button"
                            onClick={closeMobilePanel}
                            aria-label={en ? 'Collapse panel' : 'Recolher painel'}
                            className="flex w-full flex-col items-center gap-1 rounded-lg py-0.5 text-signal-cyan/75 transition hover:text-signal-cyan"
                        >
                            <span className="h-1 w-10 rounded-full bg-white/18" aria-hidden />
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide">
                                <ChevronUp className="size-3" aria-hidden />
                                {en ? 'Objects' : 'Objetos'}
                            </span>
                        </button>
                    </div>

                    <MobileNavigationContent
                        en={en}
                        locale={locale}
                        orbitMode={orbitMode}
                        closestNowObjects={closestNowObjects}
                        selectedId={selectedId}
                        objectLimit={objectLimit}
                        selectionMode={selectionMode}
                        onLimitChange={onLimitChange}
                        onModeChange={onModeChange}
                        radarLoading={radarLoading}
                        onRefresh={onRefresh}
                        mobilePanelSection={mobilePanelSection}
                        onMobilePanelSectionChange={onMobilePanelSectionChange}
                        backToMenu={backToMenu}
                        closeReferenceSection={closeReferenceSection}
                        planetsOpen={planetsOpen}
                        onPlanetsOpenChange={onPlanetsOpenChange}
                        bodyCardOpen={bodyCardOpen}
                        onSelectObject={onSelectObject}
                        onFocusBody={onFocusBody}
                        onFocusPlanet={onFocusPlanet}
                        onFocusSun={onFocusSun}
                    />

                    <DesktopNavigationContent
                        en={en}
                        locale={locale}
                        orbitMode={orbitMode}
                        closestNowObjects={closestNowObjects}
                        selectedId={selectedId}
                        objectLimit={objectLimit}
                        selectionMode={selectionMode}
                        onLimitChange={onLimitChange}
                        onModeChange={onModeChange}
                        radarLoading={radarLoading}
                        onRefresh={onRefresh}
                        planetsOpen={planetsOpen}
                        onPlanetsOpenChange={onPlanetsOpenChange}
                        onSelectObject={onSelectObject}
                        onFocusBody={onFocusBody}
                        onFocusSun={onFocusSun}
                    />
                </div>

                {planetsOpen && !orbitMode && mobilePanelSection !== 'reference' ? (
                    <div
                        ref={planetFlyoutRef}
                        className="flex flex-col rounded-xl border border-white/12 bg-space-950/88 backdrop-blur-xl overflow-y-auto
                                   h-[min(13rem,34vh)] w-[min(15rem,calc(100vw-5rem))]
                                   sm:h-[min(26rem,70vh)] sm:w-[min(14rem,40vw)]"
                    >
                        <div className="px-2 pt-2 pb-1 text-[11px] uppercase tracking-wide text-white/45 border-b border-white/10">
                            {en ? 'Planets' : 'Planetas'}
                        </div>
                        <PlanetFlyout
                            en={en}
                            focusedId={bodyCardOpen as PlanetId | null}
                            onFocus={onFocusPlanet}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}

type NavigationContentProps = Pick<Props,
    'en' | 'locale' | 'orbitMode' | 'closestNowObjects' | 'selectedId' | 'objectLimit' |
    'selectionMode' | 'onLimitChange' | 'onModeChange' | 'radarLoading' | 'onRefresh' |
    'planetsOpen' | 'onPlanetsOpenChange' | 'onSelectObject' | 'onFocusBody' | 'onFocusSun'
>;

function MobileNavigationContent({
    en,
    locale,
    orbitMode,
    closestNowObjects,
    selectedId,
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    radarLoading,
    onRefresh,
    mobilePanelSection,
    onMobilePanelSectionChange,
    backToMenu,
    closeReferenceSection,
    planetsOpen,
    onPlanetsOpenChange,
    bodyCardOpen,
    onSelectObject,
    onFocusBody,
    onFocusPlanet,
    onFocusSun,
}: NavigationContentProps & {
    mobilePanelSection: MobilePanelSection;
    onMobilePanelSectionChange: (section: MobilePanelSection) => void;
    backToMenu: () => void;
    closeReferenceSection: () => void;
    bodyCardOpen: 'earth' | 'moon' | 'sun' | PlanetId | null;
    onFocusPlanet: (id: PlanetId) => void;
}) {
    return (
        <div className="flex flex-1 flex-col sm:hidden">
            {mobilePanelSection === 'menu' ? (
                <div className="flex flex-1 flex-col gap-2 px-2 py-2">
                    {!orbitMode ? (
                        <MobilePanelMenuButton
                            label={en ? 'Filters' : 'Filtros'}
                            subtitle={en ? 'Amount and criterion' : 'Quantidade e critério'}
                            onClick={() => onMobilePanelSectionChange('filters')}
                        />
                    ) : null}
                    <MobilePanelMenuButton
                        label={en ? 'References' : 'Referências'}
                        subtitle={en ? 'Sun, Earth, Moon and planets' : 'Sol, Terra, Lua e planetas'}
                        onClick={() => onMobilePanelSectionChange('reference')}
                    />
                    <MobilePanelMenuButton
                        label={en ? 'Nearest objects' : 'Objetos próximos'}
                        subtitle={listTitle(closestNowObjects.length, selectionMode, en)}
                        onClick={() => onMobilePanelSectionChange('objects')}
                    />
                </div>
            ) : null}

            {mobilePanelSection === 'filters' && !orbitMode ? (
                <div className="flex flex-1 flex-col">
                    <MobilePanelSectionHeader
                        title={en ? 'Filters' : 'Filtros'}
                        backLabel={en ? 'Back' : 'Voltar'}
                        onBack={backToMenu}
                    />
                    <div className="min-h-0 px-2 py-2">
                        <RadarObjectControls
                            objectLimit={objectLimit}
                            selectionMode={selectionMode}
                            onLimitChange={onLimitChange}
                            onModeChange={onModeChange}
                            locale={locale}
                            loading={radarLoading}
                            criterionLocked={orbitMode}
                        />
                    </div>
                </div>
            ) : null}

            {mobilePanelSection === 'reference' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    <MobilePanelSectionHeader
                        title={en ? 'References' : 'Referências'}
                        backLabel={en ? 'Back' : 'Voltar'}
                        onBack={closeReferenceSection}
                    />
                    <ReferenceSection
                        en={en}
                        orbitMode={orbitMode}
                        planetsOpen={planetsOpen}
                        onPlanetsOpenChange={onPlanetsOpenChange}
                        onFocusEarth={() => onFocusBody('earth')}
                        onFocusMoon={() => onFocusBody('moon')}
                        onFocusSun={onFocusSun}
                    />
                    {planetsOpen && !orbitMode ? (
                        <div className="min-h-0 flex-1 border-t border-white/10 px-2 py-2">
                            <div className="max-h-[8.5rem] overflow-y-auto rounded-xl border border-white/10 bg-space-950 px-1 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
                                <PlanetFlyout
                                    en={en}
                                    focusedId={bodyCardOpen as PlanetId | null}
                                    onFocus={onFocusPlanet}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {mobilePanelSection === 'objects' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                    <MobilePanelSectionHeader
                        title={en ? 'Nearest objects' : 'Objetos próximos'}
                        backLabel={en ? 'Back' : 'Voltar'}
                        onBack={backToMenu}
                        trailing={<RefreshButton en={en} onRefresh={onRefresh} loading={radarLoading} />}
                    />
                    <ObjectList
                        objects={closestNowObjects}
                        selectedId={selectedId}
                        objectLimit={objectLimit}
                        selectionMode={selectionMode}
                        onSelect={onSelectObject}
                        locale={locale}
                        orbitMode={orbitMode}
                        radarLoading={radarLoading}
                        mobile
                    />
                </div>
            ) : null}
        </div>
    );
}

function DesktopNavigationContent({
    en,
    locale,
    orbitMode,
    closestNowObjects,
    selectedId,
    objectLimit,
    selectionMode,
    onLimitChange,
    onModeChange,
    radarLoading,
    onRefresh,
    planetsOpen,
    onPlanetsOpenChange,
    onSelectObject,
    onFocusBody,
    onFocusSun,
}: NavigationContentProps) {
    return (
        <>
            {!orbitMode ? (
                <div className="hidden border-b border-white/10 px-2 py-2 sm:block">
                    <RadarObjectControls
                        objectLimit={objectLimit}
                        selectionMode={selectionMode}
                        onLimitChange={onLimitChange}
                        onModeChange={onModeChange}
                        locale={locale}
                        loading={radarLoading}
                        criterionLocked={orbitMode}
                    />
                </div>
            ) : null}

            <div className="hidden sm:block">
                <ReferenceSection
                    en={en}
                    orbitMode={orbitMode}
                    planetsOpen={planetsOpen}
                    onPlanetsOpenChange={onPlanetsOpenChange}
                    onFocusEarth={() => onFocusBody('earth')}
                    onFocusMoon={() => onFocusBody('moon')}
                    onFocusSun={onFocusSun}
                />
            </div>

            <div className="hidden min-h-0 flex-1 flex-col px-2 py-2 sm:flex">
                <div className="flex items-center justify-between px-1 pb-1.5">
                    <span className="text-[11px] uppercase tracking-wide text-white/45">
                        {listTitle(closestNowObjects.length, selectionMode, en)}
                    </span>
                    <RefreshButton en={en} onRefresh={onRefresh} loading={radarLoading} />
                </div>
                <ObjectList
                    objects={closestNowObjects}
                    selectedId={selectedId}
                    objectLimit={objectLimit}
                    selectionMode={selectionMode}
                    onSelect={onSelectObject}
                    locale={locale}
                    orbitMode={orbitMode}
                    radarLoading={radarLoading}
                />
            </div>
        </>
    );
}

function RefreshButton({ en, onRefresh, loading }: { en: boolean; onRefresh?: () => void; loading: boolean }) {
    if (!onRefresh) return null;
    return (
        <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title={en ? 'Refresh data' : 'Atualizar dados'}
            aria-label={en ? 'Refresh data' : 'Atualizar dados'}
            className="rounded p-0.5 text-white/35 transition outline-none hover:text-white/70 focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait disabled:opacity-40"
        >
            <RefreshCw className={['size-3', loading ? 'animate-spin' : ''].join(' ')} />
        </button>
    );
}

function ObjectList({
    objects,
    selectedId,
    objectLimit,
    selectionMode,
    onSelect,
    locale,
    orbitMode,
    radarLoading,
    mobile = false,
}: {
    objects: ClosestNowObject[];
    selectedId: string | null;
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onSelect: (approach: UnifiedApproach) => void;
    locale: 'pt-BR' | 'en';
    orbitMode: boolean;
    radarLoading: boolean;
    mobile?: boolean;
}) {
    const list = radarLoading
        ? null
        : objects.length === 0
            ? <EmptyModeMessage selectionMode={selectionMode} locale={locale} />
            : (
                <ul className={mobile ? 'space-y-0.5' : 'min-h-0 flex-1 space-y-0.5 overflow-y-auto'}>
                    {objects.map((o, index) => (
                        <ObjectListItem
                            key={o.approach.id}
                            object={o}
                            palette={OBJECT_PALETTE[index % OBJECT_PALETTE.length]}
                            isSelected={o.approach.id === selectedId}
                            onSelect={onSelect}
                            locale={locale}
                            selectionMode={selectionMode}
                            compact={objectLimit === 30}
                            orbitMode={orbitMode}
                        />
                    ))}
                </ul>
            );

    if (!mobile) return list;

    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2">
            <div className="min-h-0 max-h-[8.75rem] flex-1 overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-space-950 px-1 py-1 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
                {list}
            </div>
        </div>
    );
}
