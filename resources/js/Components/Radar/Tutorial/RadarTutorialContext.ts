/**
 * Contexto React do tutorial do radar.
 *
 * Responsabilidade: expor o estado e as ações do tutorial para qualquer
 * componente do Radar sem prop drilling. Fica em arquivo próprio para que
 * consumidores leves (toast de boas-vindas, modal do guia) importem apenas o
 * hook, sem puxar o provider e a UI do tutorial junto.
 *
 * `useRadarTutorialOptional` retorna null fora do provider: componentes
 * compartilhados podem consumir sem acoplar sua renderização à existência do
 * tutorial na página atual.
 */

import { createContext, useContext } from 'react';
import type { TutorialStep, TutorialLiveFacts } from './radarTutorialSteps';
import type { TutorialAction, TutorialActionPayload, TutorialPermission } from './radarTutorialFlow';

export type RadarTutorialContextValue = {
    /** Tutorial em execução agora. */
    active: boolean;
    /** Tutorial aguardando o Radar ficar pronto antes de abrir. */
    pendingAutoStart: boolean;
    /** Passo atual, ou null quando inativo. */
    step: TutorialStep | null;
    stepIndex: number;
    stepCount: number;
    isMobile: boolean;
    locale: 'pt-BR' | 'en';
    /** Ação do passo concluída: o escurecimento sai para o usuário ver a cena (câmera viajando, carregando). */
    settling: boolean;
    /** Pulso que incrementa quando o tutorial é CONCLUÍDO (não pulado). A cena fecha o guia ao mudar. */
    completionNonce: number;
    /** Fatos reais do céu de agora (nome e métrica da rocha no topo), para passos personalizados. */
    liveFacts: TutorialLiveFacts | null;
    /** Ações permitidas para a etapa atual. Vazio quando o tutorial está inativo. */
    allowedActions: TutorialPermission[];
    /** Reseta o Radar para os filtros padrÃ£o e inicia/reinicia o tutorial do primeiro passo. */
    start: () => void;
    /** Avança imediatamente para o próximo passo (botões do tooltip). */
    next: () => void;
    /** Encerra o tutorial e persiste como pulado. */
    skip: () => void;
    /** Avança com pequeno atraso após uma ação detectada, com dedupe por passo. */
    advanceFromAction: (delayMs?: number) => void;
    /** Como advanceFromAction, mas remove o escurecimento durante a espera. */
    advanceAfterSettle: (delayMs?: number) => void;
    /** Pula o passo atual (e seu grupo) quando o alvo não existe na tela. */
    skipUnavailableStep: () => void;
    /** Consulta central: toda interação do Radar deve passar por aqui durante o tutorial. */
    isActionAllowed: (action: TutorialAction, payload?: TutorialActionPayload) => boolean;
    /** Registra uma ação permitida e avança a etapa quando ela completa o objetivo atual. */
    completeStep: (action: TutorialAction, payload?: TutorialActionPayload) => boolean;
};

export const RadarTutorialContext = createContext<RadarTutorialContextValue | null>(null);

/** Acesso opcional ao tutorial: null em páginas sem o provider. */
export function useRadarTutorialOptional(): RadarTutorialContextValue | null {
    return useContext(RadarTutorialContext);
}
