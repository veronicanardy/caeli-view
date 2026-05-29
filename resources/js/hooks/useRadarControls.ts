import { useState } from 'react';
import type { ObjectLimit, SelectionMode } from '@/types';

const STORAGE_KEY_LIMIT = 'radar:objectLimit';
const STORAGE_KEY_MODE  = 'radar:selectionMode';

const VALID_LIMITS: ObjectLimit[]     = [5, 15, 30];
const VALID_MODES:  SelectionMode[]   = ['nearest', 'upcoming', 'featured', 'attention'];

function readLimit(): ObjectLimit {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_LIMIT);
        const parsed = Number(raw) as ObjectLimit;
        return VALID_LIMITS.includes(parsed) ? parsed : 5;
    } catch {
        return 5;
    }
}

function readMode(): SelectionMode {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_MODE) as SelectionMode | null;
        return raw && VALID_MODES.includes(raw) ? raw : 'nearest';
    } catch {
        return 'nearest';
    }
}

export interface RadarControls {
    objectLimit:      ObjectLimit;
    selectionMode:    SelectionMode;
    setObjectLimit:   (limit: ObjectLimit) => void;
    setSelectionMode: (mode: SelectionMode) => void;
    resetControls:    () => void;
}

/**
 * Estado central dos controles do radar (quantidade de objetos + critério de seleção).
 *
 * Persiste as escolhas do usuário em localStorage para restaurar na próxima visita.
 * Default: 5 objetos, modo 'nearest'.
 */
export function useRadarControls(): RadarControls {
    const [objectLimit, setObjectLimitState]     = useState<ObjectLimit>(readLimit);
    const [selectionMode, setSelectionModeState] = useState<SelectionMode>(readMode);

    const setObjectLimit = (limit: ObjectLimit) => {
        setObjectLimitState(limit);
        try { localStorage.setItem(STORAGE_KEY_LIMIT, String(limit)); } catch { /* ignorado */ }
    };

    const setSelectionMode = (mode: SelectionMode) => {
        setSelectionModeState(mode);
        try { localStorage.setItem(STORAGE_KEY_MODE, mode); } catch { /* ignorado */ }
        // Sempre que o critério muda, volta para 5 objetos — independente do critério anterior.
        setObjectLimitState(5);
        try { localStorage.setItem(STORAGE_KEY_LIMIT, '5'); } catch { /* ignorado */ }
    };

    const resetControls = () => {
        setObjectLimit(5);
        setSelectionMode('nearest');
    };

    return { objectLimit, selectionMode, setObjectLimit, setSelectionMode, resetControls };
}
