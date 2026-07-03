/**
 * Peças compartilhadas dos cards de foco (asteroide/cometa, nave e corpo celeste).
 *
 * Responsabilidade: shell visual comum aos três cards — abas com semântica ARIA
 * de tablist, linha rótulo/valor, slot de preview ciente do sheet mobile, classes
 * do trilho desktop e os tipos de props/estado de abas. Não contém dados nem
 * regra de domínio; recebe tudo por props. Os cards em si vivem em
 * AsteroidFocusCard, SpacecraftFocusCard e BodyFocusCard; o roteamento em
 * UnifiedFocusCard.
 */

import { useRef, type CSSProperties, type ReactNode, type Ref } from 'react';
import type { ClosestNowObject, UnifiedApproach } from '@/types';
import type { BodyId } from './bodyData';
import { usePanelSheetState } from './PanelShell';
import { useRadarTutorialOptional } from '../Tutorial/RadarTutorialContext';

/**
 * Slot do preview decorativo: no bottom sheet mobile, só aparece no estado
 * expandido. Meio aberto prioriza dados (e evita um segundo contexto WebGL
 * ativo enquanto o usuário só lê métricas).
 */
export function SheetAwarePreview({ children }: { children: ReactNode }) {
    const { isMobileSheet, snap } = usePanelSheetState();
    if (isMobileSheet && snap !== 'full') return null;
    return <>{children}</>;
}

export type Tab = 'summary' | 'physical' | 'approach' | 'mission' | 'history';

export const TAB_LABELS_PT: Record<Tab, string> = {
    summary: 'Resumo',
    physical: 'Perfil físico',
    approach: 'Aproximação',
    mission: 'Missão',
    history: 'História',
};

export const TAB_LABELS_EN: Record<Tab, string> = {
    summary: 'Summary',
    physical: 'Physical Profile',
    approach: 'Approach',
    mission: 'Mission',
    history: 'History',
};

// ─── Props discriminadas dos cards ─────────────────────────────────────────────

export type AsteroidProps = {
    kind: 'asteroid';
    object: ClosestNowObject;
    onOpenFocus?: (approach: UnifiedApproach) => void;
    onClose: () => void;
    orbitMode: boolean;
    hasOrbit: boolean;
    canShowOrbitPosition: boolean;
    onShowOrbit: () => void;
    onShowCloseUp: () => void;
    locale: 'pt-BR' | 'en';
    onShowPanel?: () => void;
    panelRef?: Ref<HTMLDivElement>;
    /** Desktop: painel de navegação recolhido em pill — o card sobe para logo abaixo dele. */
    desktopPanelCollapsed?: boolean;
};

export type BodyProps = {
    kind: 'body';
    body: BodyId;
    onClose: () => void;
    locale: 'pt-BR' | 'en';
    panelRef?: Ref<HTMLDivElement>;
    desktopPanelCollapsed?: boolean;
};

/** Estado de abas e animação de entrada, resolvido pelo UnifiedFocusCard e repassado aos cards. */
export type TabState = {
    en: boolean;
    tab: Tab;
    setTab: (t: Tab) => void;
    contentVisible: boolean;
    enterStyle: CSSProperties;
};

/**
 * Classes desktop de top/max-height do card no trilho esquerdo.
 * O top soma top-3 do painel (0.75rem) + altura do painel + gap (0.5rem);
 * o max-height desconta o top e a folga inferior (0.75rem).
 */
export function desktopRailClasses(panelCollapsed: boolean, orbitMode: boolean): string {
    if (panelCollapsed) return 'lg:top-[3.75rem] lg:max-h-[calc(100%-4.5rem)]';
    if (orbitMode) return 'lg:top-[calc(min(16rem,40vh)+1.25rem)] lg:max-h-[calc(100%-min(16rem,40vh)-2rem)]';
    return 'lg:top-[calc(min(20rem,40vh)+1.25rem)] lg:max-h-[calc(100%-min(20rem,40vh)-2rem)]';
}

/**
 * Barra de abas com semântica ARIA de tablist: setas alternam e ativam as abas,
 * Home/End saltam para as pontas, e só a aba ativa participa do tab order
 * (roving tabindex). O painel de conteúdo correspondente usa id `focus-tabpanel`.
 */
export function FocusTabBar({ tabs, tab, setTab, labels, ariaLabel }: {
    tabs: Tab[];
    tab: Tab;
    setTab: (t: Tab) => void;
    labels: Record<Tab, string>;
    ariaLabel: string;
}) {
    const buttonRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
    const tutorial = useRadarTutorialOptional();

    const activateTab = (next: Tab) => {
        if (!(tutorial?.isActionAllowed('card-tab', { tab: next }) ?? true)) return false;
        setTab(next);
        tutorial?.completeStep('card-tab', { tab: next });
        return true;
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        const idx = tabs.indexOf(tab);
        let next: Tab | undefined;
        if (e.key === 'ArrowRight') next = tabs[(idx + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(idx - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        if (activateTab(next)) buttonRefs.current[next]?.focus();
    };

    return (
        <div role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} data-tutorial="card-tabs" className="flex gap-0 border-b border-white/10 px-3 lg:mt-1 lg:px-4">
            {tabs.map((t) => (
                <FocusTabButton
                    key={t}
                    id={`focus-tab-${t}`}
                    active={tab === t}
                    disabled={tab !== t && !(tutorial?.isActionAllowed('card-tab', { tab: t }) ?? true)}
                    onClick={() => activateTab(t)}
                    buttonRef={(el) => { buttonRefs.current[t] = el; }}
                >
                    {labels[t]}
                </FocusTabButton>
            ))}
        </div>
    );
}

function FocusTabButton({ id, active, onClick, buttonRef, disabled = false, children }: {
    id: string;
    active: boolean;
    onClick: () => void;
    buttonRef: Ref<HTMLButtonElement>;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            ref={buttonRef}
            id={id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="focus-tabpanel"
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={onClick}
            /* py-2 no mobile garante área de toque adequada com altura mais compacta */
            className={[
                '-mb-px flex-1 rounded-t-md border-b-2 px-2.5 py-2 text-center text-[11px] font-medium tracking-wide transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-not-allowed disabled:opacity-35 lg:px-3 lg:py-2 lg:text-[12px]',
                active
                    ? 'border-signal-cyan text-white drop-shadow-[0_1px_12px_rgba(34,211,238,0.55)]'
                    : 'border-transparent text-white/55 hover:bg-white/[0.04] hover:text-white/80',
            ].join(' ')}
        >
            {children}
        </button>
    );
}

/** Linha rótulo/valor dos blocos de fatos dos cards (dt à esquerda, dd à direita). */
export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-2">
            <dt className="shrink-0 text-[10.5px] font-normal uppercase tracking-wide text-white/50">{label}</dt>
            <dd className="text-right text-[12px] font-semibold text-white">{children}</dd>
        </div>
    );
}
