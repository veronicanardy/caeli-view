/**
 * Testes do sinalizador de exibição imediata da barra de progresso de rota.
 *
 * Garante o contrato de uso único: a intenção marcada por forceNextRouteProgress
 * é lida uma vez por consumeForcedRouteProgress e se zera, sem vazar para a
 * navegação seguinte.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { consumeForcedRouteProgress, forceNextRouteProgress } from '@/lib/routeProgressForce';

describe('routeProgressForce', () => {
    // Zera qualquer intenção pendente entre os testes (módulo guarda estado global).
    beforeEach(() => {
        consumeForcedRouteProgress();
    });

    it('por padrão não força a barra', () => {
        expect(consumeForcedRouteProgress()).toBe(false);
    });

    it('força a barra uma única vez após marcar', () => {
        forceNextRouteProgress();
        expect(consumeForcedRouteProgress()).toBe(true);
        // Sem nova marcação, a intenção não persiste para a navegação seguinte.
        expect(consumeForcedRouteProgress()).toBe(false);
    });

    it('marcar de novo restabelece a intenção', () => {
        forceNextRouteProgress();
        consumeForcedRouteProgress();
        forceNextRouteProgress();
        expect(consumeForcedRouteProgress()).toBe(true);
    });

    it('marcações repetidas sem consumir ainda valem por uma única leitura', () => {
        forceNextRouteProgress();
        forceNextRouteProgress();
        expect(consumeForcedRouteProgress()).toBe(true);
        expect(consumeForcedRouteProgress()).toBe(false);
    });
});
