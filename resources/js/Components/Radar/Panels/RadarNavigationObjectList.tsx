/**
 * Lista de objetos próximos do radar.
 *
 * Responsabilidade: apresentar objetos já filtrados/rankeados por camadas
 * superiores e encaminhar a intenção de seleção para o componente pai.
 * A moldura externa (painel desktop ou sheet mobile) fica por conta de quem monta.
 */

import { RefreshCw } from 'lucide-react';
import type { ClosestNowObject, ObjectLimit, SelectionMode, UnifiedApproach } from '@/types';
import { OBJECT_PALETTE } from '@/lib/radar/palette';
import { Tooltip } from '../Controls/Tooltip';
import { ObjectListItem } from '../Lists/RadarSceneObjectListItem';
import { EmptyModeMessage } from './MobilePanelControls';

export function RefreshButton({ en, onRefresh, loading }: { en: boolean; onRefresh?: () => void; loading: boolean }) {
    if (!onRefresh) return null;
    return (
        <Tooltip content={en ? 'Refresh data' : 'Atualizar dados'} hideDelay={150}>
            <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                aria-label={en ? 'Refresh data' : 'Atualizar dados'}
                /* p-2 no mobile garante área de toque razoável; compacto no desktop */
                className="rounded-full p-2 text-white/35 transition outline-none hover:text-white/70 focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait disabled:opacity-40 lg:p-0.5"
            >
                <RefreshCw className={['size-3.5 lg:size-3', loading ? 'animate-spin' : ''].join(' ')} />
            </button>
        </Tooltip>
    );
}

export function RadarNavigationObjectList({
    objects,
    selectedId,
    objectLimit,
    selectionMode,
    onSelect,
    locale,
    orbitMode,
    radarLoading,
}: {
    objects: ClosestNowObject[];
    selectedId: string | null;
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onSelect: (approach: UnifiedApproach) => void;
    locale: 'pt-BR' | 'en';
    orbitMode: boolean;
    radarLoading: boolean;
}) {
    if (radarLoading) return null;
    if (objects.length === 0) return <EmptyModeMessage selectionMode={selectionMode} locale={locale} />;

    return (
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
            {objects.map((object, index) => (
                <ObjectListItem
                    key={object.approach.id}
                    object={object}
                    palette={OBJECT_PALETTE[index % OBJECT_PALETTE.length]}
                    isSelected={object.approach.id === selectedId}
                    onSelect={onSelect}
                    locale={locale}
                    selectionMode={selectionMode}
                    compact={objectLimit === 'all'}
                    orbitMode={orbitMode}
                />
            ))}
        </ul>
    );
}
