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
import type { TutorialStep } from './radarTutorialSteps';

export type RadarTutorialContextValue = {
    /** Tutorial em execução agora. */
    active: boolean;
    /** Primeira visita detectada: o tutorial vai abrir sozinho em instantes. */
    pendingAutoStart: boolean;
    /** Passo atual, ou null quando inativo. */
    step: TutorialStep | null;
    stepIndex: number;
    stepCount: number;
    isMobile: boolean;
    locale: 'pt-BR' | 'en';
    /** Ação do passo concluída: o escurecimento sai para o usuário ver a cena (câmera viajando, carregando). */
    settling: boolean;
    /** Inicia (ou reinicia) o tutorial do primeiro passo. */
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
};

export const RadarTutorialContext = createContext<RadarTutorialContextValue | null>(null);

/** Acesso opcional ao tutorial: null em páginas sem o provider. */
export function useRadarTutorialOptional(): RadarTutorialContextValue | null {
    return useContext(RadarTutorialContext);
}
