/**
 * Provider e máquina de estados do tutorial do radar.
 *
 * Responsabilidade: decidir quando o tutorial abre (primeira visita), manter o
 * passo atual e avançar quando a ação esperada acontece. Ações que vivem no
 * estado da página (critério, limite, seleção) são detectadas por observação
 * de props; ações de DOM (cliques, teclado, gestos) são detectadas pelo
 * overlay. Nada aqui toca a cena 3D nem os dados científicos.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ObjectLimit, SelectionMode } from '@/types';
import { MOBILE_MEDIA_QUERY } from '../radarLayoutConstants';
import { RadarTutorialContext, type RadarTutorialContextValue } from './RadarTutorialContext';
import { RadarTutorialOverlay } from './RadarTutorialOverlay';
import { indexAfterGroup, stepsForViewport, type TutorialStep, type TutorialLiveFacts } from './radarTutorialSteps';
import {
    allowedActionsForStep,
    doesTutorialActionCompleteStep,
    isTutorialActionAllowed,
    type TutorialAction,
    type TutorialActionPayload,
} from './radarTutorialFlow';
import {
    persistRadarTutorialOutcome,
    readRadarTutorialState,
    shouldAutoStartTutorial,
    type RadarTutorialStatus,
} from './radarTutorialStorage';

/** Espera curta após o radar carregar antes do auto-início, só para a cena assentar. */
const AUTO_START_DELAY_MS = 300;

type Phase = 'boot' | 'pending' | 'running' | 'done';

type Props = {
    locale: 'pt-BR' | 'en';
    selectionMode: SelectionMode;
    objectLimit: ObjectLimit;
    /** Id do objeto efetivamente selecionado (null sem seleção). */
    selectedId: string | null;
    /** Dados do radar carregados; o auto-início espera por isso. */
    radarReady: boolean;
    /** Radar buscando dados agora; passos de filtro esperam terminar antes de avançar. */
    radarLoading: boolean;
    /** Normaliza controles externos do Radar antes de iniciar/reiniciar o tutorial. */
    onResetRadarState?: () => void;
    /** Fatos reais do céu de agora (nome/métrica da rocha no topo), para passos personalizados. */
    liveFacts?: TutorialLiveFacts | null;
    children: ReactNode;
};

export function RadarTutorialProvider({
    locale,
    selectionMode,
    objectLimit,
    selectedId,
    radarReady,
    radarLoading,
    onResetRadarState,
    liveFacts = null,
    children,
}: Props) {
    const [phase, setPhase] = useState<Phase>('boot');
    const [steps, setSteps] = useState<TutorialStep[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [settling, setSettling] = useState(false);
    // Pulso que incrementa só quando o tutorial é CONCLUÍDO (não pulado): a cena
    // observa para garantir o guia fechado no fim, deixando a tela limpa.
    const [completionNonce, setCompletionNonce] = useState(0);

    // Refs espelhando o estado para callbacks estáveis (sem stale closures).
    const phaseRef = useRef(phase);
    phaseRef.current = phase;
    const stepsRef = useRef(steps);
    stepsRef.current = steps;
    const stepIndexRef = useRef(stepIndex);
    stepIndexRef.current = stepIndex;
    const radarLoadingRef = useRef(radarLoading);
    radarLoadingRef.current = radarLoading;
    const selectedIdRef = useRef(selectedId);
    selectedIdRef.current = selectedId;

    const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    /** Passo de filtro aguardando o radar terminar de carregar para avançar. */
    const loadWaitRef = useRef<{ fromIndex: number } | null>(null);
    /** O usuário viu a explicação da órbita: pode silenciar o toast da órbita ao concluir. */
    const sawOrbitExplain = useRef(false);

    const clearAdvanceTimer = useCallback(() => {
        if (advanceTimer.current) {
            clearTimeout(advanceTimer.current);
            advanceTimer.current = null;
        }
    }, []);

    // Decide o auto-início uma única vez, no mount (client-side).
    const prepareStart = useCallback(() => {
        clearAdvanceTimer();
        loadWaitRef.current = null;
        setSettling(false);
        setStepIndex(0);
        onResetRadarState?.();
        setPhase('pending');
    }, [clearAdvanceTimer, onResetRadarState]);

    useEffect(() => {
        if (shouldAutoStartTutorial(readRadarTutorialState())) {
            prepareStart();
            return;
        }
        setPhase('done');
    }, [prepareStart]);

    const begin = useCallback(() => {
        const mobile = typeof window !== 'undefined' && window.matchMedia(MOBILE_MEDIA_QUERY).matches;
        sawOrbitExplain.current = false;
        clearAdvanceTimer();
        loadWaitRef.current = null;
        setSettling(false);
        setIsMobile(mobile);
        setSteps(stepsForViewport(mobile));
        setStepIndex(0);
        setPhase('running');
    }, [clearAdvanceTimer]);

    // Auto-início: primeira visita + radar carregado + pequena espera.
    useEffect(() => {
        if (phase !== 'pending' || !radarReady) return undefined;
        const timer = setTimeout(begin, AUTO_START_DELAY_MS);
        return () => clearTimeout(timer);
    }, [phase, radarReady, begin]);

    const finish = useCallback((status: RadarTutorialStatus) => {
        clearAdvanceTimer();
        loadWaitRef.current = null;
        setSettling(false);
        setPhase('done');
        // Concluído (chegou ao fim), não pulado: sinaliza a cena para fechar o guia.
        if (status === 'completed') setCompletionNonce((n) => n + 1);
        persistRadarTutorialOutcome(status, {
            markOrbitToastSeen: status === 'completed' && sawOrbitExplain.current,
        });
    }, [clearAdvanceTimer]);

    const advanceTo = useCallback((index: number) => {
        clearAdvanceTimer();
        loadWaitRef.current = null;
        setSettling(false);
        if (index >= stepsRef.current.length) {
            finish('completed');
            return;
        }
        setStepIndex(index);
    }, [clearAdvanceTimer, finish]);

    const next = useCallback(() => advanceTo(stepIndexRef.current + 1), [advanceTo]);
    const skip = useCallback(() => finish('skipped'), [finish]);

    const skipUnavailableStep = useCallback(() => {
        const steps = stepsRef.current;
        const index = stepIndexRef.current;
        const step = steps[index];
        // Pular o passo de SELEÇÃO (intenção: não conhecer o objeto) ou um passo
        // que depende de seleção sem objeto escolhido salta o BLOCO do objeto
        // inteiro, até o primeiro passo que não precisa de rocha selecionada.
        // No passo de seleção, salta mesmo que já haja uma seleção herdada: o
        // usuário pediu para pular o bloco, não para entrar nele.
        const isSelectionStep = step?.advance.kind === 'selection';
        const needsSelection = isSelectionStep || step?.requiresSelection;
        if (needsSelection && (isSelectionStep || !selectedIdRef.current)) {
            let i = index + 1;
            while (i < steps.length && (steps[i].requiresSelection || steps[i].advance.kind === 'selection')) i += 1;
            advanceTo(i);
            return;
        }
        advanceTo(indexAfterGroup(steps, index));
    }, [advanceTo]);

    /**
     * Avanço com atraso curto: a ação do usuário (clique, troca de filtro) tem
     * tempo de refletir na interface antes do tooltip pular de lugar. O dedupe
     * por passo evita avanço duplo quando a mesma ação dispara dois sinais.
     */
    const advanceFromAction = useCallback((delayMs = 350) => {
        if (advanceTimer.current) return;
        const fromIndex = stepIndexRef.current;
        advanceTimer.current = setTimeout(() => {
            advanceTimer.current = null;
            if (phaseRef.current !== 'running' || stepIndexRef.current !== fromIndex) return;
            advanceTo(fromIndex + 1);
        }, delayMs);
    }, [advanceTo]);

    /**
     * Avança com espera longa e escurecimento removido: o usuário vê a câmera
     * viajar (referências, seleção) ou a aba escolhida antes do próximo passo.
     */
    const advanceAfterSettle = useCallback((delayMs = 1200) => {
        if (advanceTimer.current || loadWaitRef.current) return;
        setSettling(true);
        advanceFromAction(delayMs);
    }, [advanceFromAction]);

    /**
     * Avanço dos passos de filtro: remove o escurecimento na hora (o usuário vê
     * o "Carregando" da cena) e só avança quando o radar terminar de buscar os
     * dados. Se nenhum carregamento começar (resposta em cache), um temporizador
     * de tolerância avança mesmo assim.
     */
    const advanceAfterRadarLoads = useCallback(() => {
        if (advanceTimer.current || loadWaitRef.current) return;
        const fromIndex = stepIndexRef.current;
        setSettling(true);
        loadWaitRef.current = { fromIndex };
        setTimeout(() => {
            const wait = loadWaitRef.current;
            if (!wait || wait.fromIndex !== stepIndexRef.current || phaseRef.current !== 'running') return;
            if (!radarLoadingRef.current) {
                loadWaitRef.current = null;
                advanceTo(wait.fromIndex + 1);
            }
            // Se ainda está carregando, a borda de descida de radarLoading resolve abaixo.
        }, 350);
    }, [advanceTo]);

    const isActionAllowed = useCallback((action: TutorialAction, payload: TutorialActionPayload = {}) => {
        if (phaseRef.current !== 'running') return true;
        return isTutorialActionAllowed(stepsRef.current[stepIndexRef.current] ?? null, action, payload);
    }, []);

    const completeStep = useCallback((action: TutorialAction, payload: TutorialActionPayload = {}) => {
        if (phaseRef.current !== 'running') return true;
        const step = stepsRef.current[stepIndexRef.current] ?? null;
        if (!doesTutorialActionCompleteStep(step, action, payload)) return false;

        if (step?.advance.kind === 'criterion-change' || step?.advance.kind === 'limit-change') {
            advanceAfterRadarLoads();
            return true;
        }

        if (step?.advance.kind === 'manual') {
            advanceTo(stepIndexRef.current + 1);
            return true;
        }

        if (step?.settleWhileAdvancing) advanceAfterSettle(step.advanceDelayMs ?? 1200);
        else advanceFromAction(step?.advanceDelayMs ?? 350);
        return true;
    }, [advanceAfterRadarLoads, advanceAfterSettle, advanceFromAction, advanceTo]);

    // Borda de descida do carregamento: o "Carregando" sumiu, dá um respiro e avança.
    useEffect(() => {
        if (radarLoading) return;
        const wait = loadWaitRef.current;
        if (!wait || phaseRef.current !== 'running') return;
        if (stepIndexRef.current !== wait.fromIndex) {
            loadWaitRef.current = null;
            return;
        }
        loadWaitRef.current = null;
        advanceFromAction(250);
    }, [radarLoading, advanceFromAction]);

    // ─── Observadores de estado da página ─────────────────────────────────────

    const prevSelectionMode = useRef(selectionMode);
    useEffect(() => {
        const changed = prevSelectionMode.current !== selectionMode;
        prevSelectionMode.current = selectionMode;
        if (!changed || phaseRef.current !== 'running') return;
        if (stepsRef.current[stepIndexRef.current]?.advance.kind === 'criterion-change') advanceAfterRadarLoads();
    }, [selectionMode, advanceAfterRadarLoads]);

    const prevObjectLimit = useRef(objectLimit);
    useEffect(() => {
        const changed = prevObjectLimit.current !== objectLimit;
        prevObjectLimit.current = objectLimit;
        if (!changed || phaseRef.current !== 'running') return;
        if (stepsRef.current[stepIndexRef.current]?.advance.kind === 'limit-change') advanceAfterRadarLoads();
    }, [objectLimit, advanceAfterRadarLoads]);

    // Seleção: avança o passo de seleção quando há objeto selecionado e volta
    // para ele quando um passo que depende do card perde a seleção. Se a seleção
    // sumir com um avanço agendado (ex.: reset ao entrar no passo limpa a
    // seleção anterior), o avanço é cancelado para esperar a escolha real.
    useEffect(() => {
        if (phase !== 'running') return;
        const step = steps[stepIndex];
        if (!step) return;
        if (step.advance.kind === 'selection') {
            if (selectedId) {
                if (step.settleWhileAdvancing) advanceAfterSettle(step.advanceDelayMs ?? 1200);
                else advanceFromAction(step.advanceDelayMs ?? 350);
            } else {
                clearAdvanceTimer();
                setSettling(false);
            }
            return;
        }
        if (step.requiresSelection && !selectedId) {
            const backIndex = steps.findIndex((s) => s.advance.kind === 'selection');
            if (backIndex >= 0 && backIndex !== stepIndex) advanceTo(backIndex);
        }
    }, [phase, steps, stepIndex, selectedId, advanceFromAction, advanceAfterSettle, advanceTo, clearAdvanceTimer]);

    // Marca que a explicação da órbita foi exibida nesta execução.
    useEffect(() => {
        if (phase === 'running' && steps[stepIndex]?.id === 'orbit-explain') sawOrbitExplain.current = true;
    }, [phase, steps, stepIndex]);

    // ESC encerra o tutorial, exceto quando o guia está aberto (ESC fecha o
    // guia) ou a cena está em tela cheia (ESC sai do fullscreen).
    useEffect(() => {
        if (phase !== 'running') return undefined;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (document.getElementById('map-manual-title')) return;
            if (document.querySelector('[data-tutorial="radar-canvas"][data-fullscreen="true"]')) return;
            skip();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [phase, skip]);

    // Limpa o timer pendente ao desmontar.
    useEffect(() => clearAdvanceTimer, [clearAdvanceTimer]);

    const value = useMemo<RadarTutorialContextValue>(() => ({
        active: phase === 'running',
        pendingAutoStart: phase === 'pending',
        step: phase === 'running' ? steps[stepIndex] ?? null : null,
        stepIndex,
        stepCount: steps.length,
        isMobile,
        locale,
        settling,
        completionNonce,
        liveFacts,
        allowedActions: phase === 'running' ? allowedActionsForStep(steps[stepIndex] ?? null) : [],
        start: prepareStart,
        next,
        skip,
        advanceFromAction,
        advanceAfterSettle,
        skipUnavailableStep,
        isActionAllowed,
        completeStep,
    }), [phase, steps, stepIndex, isMobile, locale, settling, completionNonce, liveFacts, prepareStart, next, skip, advanceFromAction, advanceAfterSettle, skipUnavailableStep, isActionAllowed, completeStep]);

    return (
        <RadarTutorialContext.Provider value={value}>
            {children}
            <RadarTutorialOverlay />
        </RadarTutorialContext.Provider>
    );
}
