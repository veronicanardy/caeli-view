import { useCallback, useState } from 'react';
import type { ObjectLimit, SelectionMode } from '@/types';

export const DEFAULT_RADAR_OBJECT_LIMIT: ObjectLimit = 5;
export const DEFAULT_RADAR_SELECTION_MODE: SelectionMode = 'nearest';

export interface RadarControls {
    objectLimit:      ObjectLimit;
    selectionMode:    SelectionMode;
    setObjectLimit:   (limit: ObjectLimit) => void;
    setSelectionMode: (mode: SelectionMode) => void;
    resetControls:    () => void;
}

/**
 * Estado central dos controles do radar (quantidade de objetos + critério de seleção).
 * Sempre inicia com os defaults (5 objetos, 'nearest') e não persiste entre sessões.
 */
export function useRadarControls(): RadarControls {
    const [objectLimit, setObjectLimitState]     = useState<ObjectLimit>(DEFAULT_RADAR_OBJECT_LIMIT);
    const [selectionMode, setSelectionModeState] = useState<SelectionMode>(DEFAULT_RADAR_SELECTION_MODE);

    const setObjectLimit = useCallback((limit: ObjectLimit) => {
        setObjectLimitState(limit);
    }, []);

    const setSelectionMode = useCallback((mode: SelectionMode) => {
        setSelectionModeState(mode);
        // Volta para 5 objetos ao trocar critério — janela diferente, ranking diferente.
        setObjectLimitState(DEFAULT_RADAR_OBJECT_LIMIT);
    }, []);

    const resetControls = useCallback(() => {
        setObjectLimitState(DEFAULT_RADAR_OBJECT_LIMIT);
        setSelectionModeState(DEFAULT_RADAR_SELECTION_MODE);
    }, []);

    return { objectLimit, selectionMode, setObjectLimit, setSelectionMode, resetControls };
}
