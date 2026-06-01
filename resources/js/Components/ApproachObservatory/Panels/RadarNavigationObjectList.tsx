import { RefreshCw } from 'lucide-react';
import type { ClosestNowObject, ObjectLimit, SelectionMode, UnifiedApproach } from '@/types';
import { OBJECT_PALETTE } from '@/lib/observatory/palette';
import { ObjectListItem } from '../Lists/RadarSceneObjectListItem';
import { EmptyModeMessage } from './MobilePanelControls';

/**
 * Lista de objetos próximos do radar.
 *
 * Apenas apresenta os objetos já filtrados/rankeados por camadas superiores e
 * encaminha a intenção de seleção para o componente pai.
 */

export function RefreshButton({ en, onRefresh, loading }: { en: boolean; onRefresh?: () => void; loading: boolean }) {
    if (!onRefresh) return null;
    return (
        <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title={en ? 'Refresh data' : 'Atualizar dados'}
            aria-label={en ? 'Refresh data' : 'Atualizar dados'}
            className="rounded p-0.5 text-white/35 transition outline-none hover:text-white/70 focus-visible:ring-2 focus-visible:ring-signal-cyan disabled:cursor-wait disabled:opacity-40"
        >
            <RefreshCw className={['size-3', loading ? 'animate-spin' : ''].join(' ')} />
        </button>
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
    mobile = false,
}: {
    objects: ClosestNowObject[];
    selectedId: string | null;
    objectLimit: ObjectLimit;
    selectionMode: SelectionMode;
    onSelect: (approach: UnifiedApproach) => void;
    locale: 'pt-BR' | 'en';
    orbitMode: boolean;
    radarLoading: boolean;
    mobile?: boolean;
}) {
    const list = radarLoading
        ? null
        : objects.length === 0
            ? <EmptyModeMessage selectionMode={selectionMode} locale={locale} />
            : (
                <ul className={mobile ? 'w-full min-w-0 space-y-0.5' : 'min-h-0 flex-1 space-y-0.5 overflow-y-auto'}>
                    {objects.map((object, index) => (
                        <ObjectListItem
                            key={object.approach.id}
                            object={object}
                            palette={OBJECT_PALETTE[index % OBJECT_PALETTE.length]}
                            isSelected={object.approach.id === selectedId}
                            onSelect={onSelect}
                            locale={locale}
                            selectionMode={selectionMode}
                            compact={objectLimit === 30}
                            orbitMode={orbitMode}
                        />
                    ))}
                </ul>
            );

    if (!mobile) return list;

    return (
        <div className="flex min-h-0 flex-1 w-full px-2 py-2">
            <div className="h-full min-h-0 w-full min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border border-white/10 bg-space-950/90 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
                {list}
            </div>
        </div>
    );
}
