import { useState } from 'react';
import type { ObjectLimit, SelectionMode } from '@/types';

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
    const [objectLimit, setObjectLimitState]     = useState<ObjectLimit>(5);
    const [selectionMode, setSelectionModeState] = useState<SelectionMode>('nearest');

    const setObjectLimit = (limit: ObjectLimit) => {
        setObjectLimitState(limit);
    };

    const setSelectionMode = (mode: SelectionMode) => {
        setSelectionModeState(mode);
        // Volta para 5 objetos ao trocar critério — janela diferente, ranking diferente.
        setObjectLimitState(5);
    };

    const resetControls = () => {
        setObjectLimitState(5);
        setSelectionModeState('nearest');
    };

    return { objectLimit, selectionMode, setObjectLimit, setSelectionMode, resetControls };
}
