/**
 * Persistência do tutorial do radar em localStorage.
 *
 * Responsabilidade: decidir quando o tutorial abre sozinho e registrar o
 * desfecho (concluído ou pulado) com a versão vigente. A decisão em si
 * (`shouldAutoStartTutorial`, `parseStoredTutorialState`) é pura e testável;
 * apenas as funções read/persist tocam o localStorage, sempre com try/catch
 * porque o storage pode estar indisponível (modo privado restrito etc.).
 *
 * Versionamento: se o tutorial mudar de forma relevante no futuro, incremente
 * `RADAR_TUTORIAL_VERSION`. Registros de versões anteriores voltam a abrir o
 * tutorial automaticamente uma única vez.
 */

const STORAGE_KEY = 'caeliview.radar.tutorial';

/** Chaves legadas dos toasts de boas-vindas. O tutorial os substitui na primeira visita. */
const LEGACY_RADAR_TOAST_KEY = 'caeli_radar_visited';
const LEGACY_ORBIT_TOAST_KEY = 'caeli_orbit_visited';

export const RADAR_TUTORIAL_VERSION = 1;

export type RadarTutorialStatus = 'completed' | 'skipped';

export type StoredRadarTutorialState = {
    status: RadarTutorialStatus;
    version: number;
    updatedAt: string;
};

/** Valida e converte o JSON cru do storage. Qualquer formato inesperado vira null. */
export function parseStoredTutorialState(raw: string | null): StoredRadarTutorialState | null {
    if (!raw) return null;
    try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return null;
        const candidate = parsed as Record<string, unknown>;
        if (candidate.status !== 'completed' && candidate.status !== 'skipped') return null;
        if (typeof candidate.version !== 'number' || !Number.isFinite(candidate.version)) return null;
        return {
            status: candidate.status,
            version: candidate.version,
            updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '',
        };
    } catch {
        return null;
    }
}

/**
 * O tutorial abre sozinho quando nunca houve desfecho registrado ou quando o
 * registro é de uma versão anterior à vigente (tutorial mudou o suficiente
 * para valer uma nova exibição, mesmo para quem concluiu).
 */
export function shouldAutoStartTutorial(stored: StoredRadarTutorialState | null, version = RADAR_TUTORIAL_VERSION): boolean {
    if (!stored) return true;
    return stored.version < version;
}

/** Lê o estado persistido do tutorial. Null quando não há registro válido. */
export function readRadarTutorialState(): StoredRadarTutorialState | null {
    try {
        return parseStoredTutorialState(window.localStorage.getItem(STORAGE_KEY));
    } catch {
        return null;
    }
}

/**
 * Registra o desfecho do tutorial e silencia os toasts legados de boas-vindas:
 * o toast do radar sempre (o tutorial o substitui), o da órbita apenas quando o
 * usuário realmente viu a explicação da órbita durante o tutorial.
 */
export function persistRadarTutorialOutcome(
    status: RadarTutorialStatus,
    { markOrbitToastSeen = false }: { markOrbitToastSeen?: boolean } = {},
): void {
    try {
        const state: StoredRadarTutorialState = {
            status,
            version: RADAR_TUTORIAL_VERSION,
            updatedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        window.localStorage.setItem(LEGACY_RADAR_TOAST_KEY, '1');
        if (markOrbitToastSeen) window.localStorage.setItem(LEGACY_ORBIT_TOAST_KEY, '1');
    } catch {
        // storage indisponível: o tutorial volta a abrir na próxima visita, sem quebrar nada
    }
}

/** Remove o registro do tutorial (útil para testar a primeira visita no console). */
export function clearRadarTutorialState(): void {
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // silêncio intencional
    }
}
