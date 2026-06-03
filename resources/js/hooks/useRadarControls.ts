import { useState } from 'react';
import type { ObjectLimit, SelectionMode } from '@/types';

const STORAGE_KEY_LIMIT = 'radar:objectLimit';
const STORAGE_KEY_MODE  = 'radar:selectionMode';


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
 * Sempre inicia com os defaults (5 objetos, 'nearest') — independente do que ficou salvo.
 * As escolhas são persistidas durante a sessão mas não restauradas na próxima visita.
 */
export function useRadarControls(): RadarControls {
    const [objectLimit, setObjectLimitState]     = useState<ObjectLimit>(5);
    const [selectionMode, setSelectionModeState] = useState<SelectionMode>('nearest');

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
