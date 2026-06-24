/**
 * Item de lista de objetos da cena do radar.
 *
 * Responsabilidade: renderizar nome, marcador de tipo (bolinha para asteroide,
 * bolinha com cauda para cometa), distância ou data de aproximação e estado de
 * seleção para um único objeto próximo. Não decide ranking nem aplica filtros —
 * recebe o objeto já resolvido (a ordem por distância vem do backend).
 */

import { TriangleAlert } from 'lucide-react';
import type { ClosestNowObject, SelectionMode, SmallBodyObjectType, UnifiedApproach } from '@/types';
import { Tooltip } from '../Controls/Tooltip';
import { isKnownAsteroidId } from '../Bodies/Asteroid/knownAsteroids';
import { isKnownCometId, knownCometById, knownCometHeliocentricDistanceKm } from '../Bodies/Comet/knownComets';
import { useRadarTutorialOptional } from '../Tutorial/RadarTutorialContext';
import { formatObjectListTrailingLabel } from './radarSceneObjectPresentation';

/** Contador para ids únicos do gradiente de cauda do cometa (um <linearGradient> por marcador). */
let tailGradientId = 0;

type ObjectListItemProps = {
    object: ClosestNowObject;
    /** Primeiro item da lista (a rocha mais próxima). O passo de seleção do tutorial só aceita ele. */
    isFirst?: boolean;
    palette: { future: string };
    isSelected: boolean;
    onSelect: (approach: UnifiedApproach) => void;
    locale: 'pt-BR' | 'en';
    selectionMode: SelectionMode;
    compact?: boolean;
    orbitMode?: boolean;
};

// Representa um item interativo da lista do radar sem alterar regras globais de selecao.
export function ObjectListItem({ object: o, isFirst = false, palette, isSelected, onSelect, locale, selectionMode, compact = false, orbitMode = false }: ObjectListItemProps) {
    const en = locale === 'en';
    // Conhecidos (famosos: asteroides e cometas) são plotados na régua dos planetas via Kepler, sem
    // trajetória geocêntrica: têm posição, só não a do feed. Não marcar "sem posição" para eles.
    const isKnown = isKnownAsteroidId(o.approach.id) || isKnownCometId(o.approach.id);
    const hasScenePosition = isKnown || Boolean(o.trajectory?.currentPoint);
    // Recém-descoberto: está no catálogo (CAD) mas o Horizons ainda não tem efeméride. NÃO é um
    // "não achado" qualquer — é um objeto novo e interessante. Fica aceso (não apaga como os demais
    // sem posição) e ganha um rótulo próprio, em vez do "sem posição" cinza.
    const recentlyDiscovered = !hasScenePosition && o.trajectory?.horizonsFailureKind === 'no_ephemeris';
    const hasOrbit = Boolean(o.trajectory?.orbitalElements);
    const orbitBlocked = orbitMode && !hasOrbit;
    const tutorial = useRadarTutorialOptional();
    const tutorialBlocked = !(tutorial?.isActionAllowed('select-object', { objectId: o.approach.id, objectIsFirst: isFirst }) ?? true);
    const hazard = o.approach.hazardFlag;
    // Cometa famoso sem distância do Horizons (ex.: Halley no afélio): usa a distância heliocêntrica da
    // órbita Kepler local como aproximação, em vez de "Indisponível". Para corpos a dezenas de UA, a
    // diferença entre distância ao Sol e à Terra (1 UA) é desprezível.
    const fallbackComet = o.currentDistanceKm == null ? knownCometById(o.approach.id) : null;
    const distanceKm = o.currentDistanceKm ?? (fallbackComet ? knownCometHeliocentricDistanceKm(fallbackComet) : null);
    const trailingLabel = formatObjectListTrailingLabel(selectionMode, o.approach.approachDate, distanceKm, locale);

    return (
        <li>
            {/* Estados indisponíveis ("sem órbita", "sem posição") já aparecem como texto na
               própria linha; sem title nativo (regra do sistema: tooltips só via <Tooltip>). */}
            <button
                type="button"
                disabled={orbitBlocked || tutorialBlocked}
                data-tutorial={isSelected ? 'selected-rock-list-item' : undefined}
                onClick={() => {
                    if (tutorialBlocked) return;
                    onSelect(o.approach);
                    tutorial?.completeStep('select-object', { objectId: o.approach.id, objectIsFirst: isFirst });
                }}
                className={[
                    'grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 rounded-xl text-left text-[13.5px] transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                    compact ? 'px-2 py-1.5' : 'px-2.5 py-2',
                    orbitBlocked || tutorialBlocked
                        ? 'cursor-not-allowed opacity-20'
                        : isSelected
                          /* Selecionado: fundo suave ciano, sem glow forte — indica escolha sem gritar. */
                          ? 'bg-signal-cyan/[0.05] text-white/90 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.16)]'
                          /* Não-selecionado: apagado mas legível — lista é seletor secundário. */
                          : 'text-white/60 hover:bg-white/[0.04] hover:text-white/75',
                    !orbitBlocked && !hasScenePosition && !recentlyDiscovered ? 'opacity-30' : '',
                ].join(' ')}
            >
                <ObjectTypeMarker
                    objectType={o.approach.objectType}
                    color={palette.future}
                    selected={isSelected}
                />
                <span className="col-start-2 row-start-1 flex min-w-0 items-center gap-1 font-medium">
                    <span className={`min-w-0 truncate ${isSelected ? 'text-white' : ''}`}>{o.approach.displayName ?? o.approach.name}</span>
                    {hazard ? (
                        <Tooltip content={en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL'} hideDelay={150}>
                            <TriangleAlert
                                className="size-3 shrink-0 text-amber-300/75"
                                aria-label={en ? 'Monitored by NASA/JPL' : 'Monitorado pela NASA/JPL'}
                            />
                        </Tooltip>
                    ) : null}
                </span>
                {/* R\u00F3tulos de estado: curtos e fixos, ent\u00E3o whitespace-nowrap (n\u00E3o truncate) para nunca
                   cortar a palavra. Ocupam s\u00F3 as 2 primeiras colunas; a dist\u00E2ncia fica na col-3. */}
                {orbitBlocked ? (
                    <span className="col-start-1 col-span-2 row-start-2 min-w-0 whitespace-nowrap text-[10px] text-white/25" aria-hidden>
                        {en ? 'no orbit' : 'sem \u00F3rbita'}
                    </span>
                ) : recentlyDiscovered ? (
                    /* Rec\u00E9m-descoberto: r\u00F3tulo aceso (n\u00E3o o cinza de "sem posi\u00E7\u00E3o"), porque \u00E9 um objeto novo
                       e interessante, n\u00E3o uma falha. O detalhe completo vai no card ao selecionar. */
                    <span className="col-start-1 col-span-2 row-start-2 min-w-0 whitespace-nowrap text-[10px] text-signal-cyan/70" aria-hidden>
                        {en ? 'newly found' : 'rec\u00E9m-descoberto'}
                    </span>
                ) : !hasScenePosition ? (
                    <span className="col-start-1 col-span-2 row-start-2 min-w-0 whitespace-nowrap text-[10px] text-amber-200/50" aria-hidden>
                        {en ? 'no position' : 'sem posição'}
                    </span>
                ) : null}
                <span className={`col-start-3 row-span-2 row-start-1 justify-self-end whitespace-nowrap text-right tabular-nums text-[11.5px] ${isSelected ? 'text-signal-cyan/55' : 'text-white/55'}`}>
                    {trailingLabel}
                </span>
            </button>
        </li>
    );
}

/**
 * Marcador de tipo ao lado do nome na lista: bolinha simples para asteroide, bolinha com cauda para
 * cometa. Usa a cor da paleta do item e acompanha o estado de seleção (maior e mais opaco quando
 * selecionado), mantendo a mesma célula do grid que a antiga bolinha ocupava.
 */
function ObjectTypeMarker({ objectType, color, selected }: {
    objectType: SmallBodyObjectType;
    color: string;
    selected: boolean;
}) {
    const opacity = selected ? 0.7 : 0.35;
    const filter = selected ? `drop-shadow(0 0 3px ${color}66)` : undefined;
    const common = 'col-start-1 row-start-1 self-center';
    const style = { color, opacity, filter, transition: 'opacity 0.15s, filter 0.15s' } as const;
    // O cometa é desenhado com brilho próprio (gradiente + glow nos elementos), então não recebe o
    // esmaecimento do SVG inteiro — só uma leve redução quando não selecionado, para não ofuscar.
    const cometStyle = { color, opacity: selected ? 1 : 0.7, transition: 'opacity 0.15s' } as const;

    if (objectType === 'comet') {
        // Núcleo (círculo) com uma cauda BRILHANTE que afina apontando para trás. viewBox 12×8: cauda
        // à esquerda, núcleo à direita, para a cabeça ficar perto do nome. A cauda usa um gradiente
        // (intensa junto ao núcleo, esmaecendo na ponta) e um leve glow para parecer luminosa.
        const r = selected ? 2.6 : 2;
        const gradId = `comet-tail-${tailGradientId++}`;
        return (
            <svg
                className={common}
                width={selected ? 13 : 11}
                height={8}
                viewBox="0 0 12 8"
                aria-hidden
                style={cometStyle}
            >
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                        {/* Ponta (esquerda): some. Junto ao núcleo (direita): cor cheia. */}
                        <stop offset="0%" stopColor={color} stopOpacity={0} />
                        <stop offset="60%" stopColor={color} stopOpacity={0.55} />
                        <stop offset="100%" stopColor={color} stopOpacity={1} />
                    </linearGradient>
                </defs>
                {/* Cauda: triângulo afilado do núcleo até a borda esquerda, com glow para brilhar. */}
                <path
                    d={`M ${9 - r} 4 L 0 2.2 L 0 5.8 Z`}
                    fill={`url(#${gradId})`}
                    style={{ filter: `drop-shadow(0 0 2px ${color})` }}
                />
                {/* Núcleo, com halo brilhante. */}
                <circle cx={9} cy={4} r={r} fill={color} style={{ filter: `drop-shadow(0 0 2px ${color})` }} />
            </svg>
        );
    }

    // Asteroide: bolinha simples.
    return (
        <span
            className={`${common} rounded-full`}
            style={{
                width: selected ? '7px' : '5px',
                height: selected ? '7px' : '5px',
                backgroundColor: color,
                opacity,
                boxShadow: selected ? `0 0 4px 0px ${color}66` : undefined,
                transition: 'width 0.15s, height 0.15s, opacity 0.15s, box-shadow 0.15s',
            }}
        />
    );
}
