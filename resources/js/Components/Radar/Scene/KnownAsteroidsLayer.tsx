/**
 * Camada de FALLBACK dos asteroides conhecidos (Bennu, Eros, Ceres, Vesta, Itokawa) na cena do radar.
 *
 * Responsabilidade: desenhar (modelo 3D exclusivo, label e hitbox) os famosos cuja posição NÃO veio do
 * Horizons, na régua LINEAR dos planetas (Sol na origem), via Kepler local (knownAsteroids: Kepler +
 * helioAUToSunCenteredScene). É a rede de segurança para que nenhum famoso suma quando o Horizons falha.
 *
 * Caminho principal: os famosos agora vêm do feed /radar/famous com posição real do Horizons e são
 * desenhados pelo AsteroidSceneLayer (igual aos NEOs). Esta camada recebe `skipIds` com os famosos que
 * já têm posição real e os PULA, evitando duplicar a rocha.
 *
 * Por que vive no espaço heliocêntrico (e não offsetada pela Terra): estes objetos são distantes e
 * usam a mesma escala dos planetas, então caem ao lado deles sem a compressão log do radar.
 *
 * São exibidos apenas no critério "Asteroides famosos" (SelectionMode 'famous'), que oculta o feed
 * de aproximação. Como os dois conjuntos nunca coexistem, não há duplicação a tratar aqui.
 */

import { useMemo, useState } from 'react';
import { ScreenLabel } from '../Overlays/SceneLabels';
import { BodyHitbox } from '../Bodies/BodyHitbox';
import RealAsteroidModel from '../Bodies/Asteroid/RealAsteroidModel';
import type { KnownAsteroid } from '../Bodies/Asteroid/knownAsteroids';
import { knownAsteroidId, knownAsteroidPlacements, knownAsteroidVisualScale, modelAssetForKnown } from '../Bodies/Asteroid/knownAsteroids';

/**
 * Hitbox generosa em relação ao raio visual (que é pequeno, escala simbólica de asteroide):
 * um alvo maior que o corpo facilita clique/hover a dezenas de unidades do centro, como o
 * radiusMultiplier dos planetas pequenos.
 */
const HITBOX_RADIUS_FACTOR = 4;
/**
 * Piso absoluto do raio da hitbox (DL). As menores rochas (Itokawa, Bennu) têm raio visual ~0,008,
 * então 4× ainda daria um alvo minúsculo; este piso garante um alvo clicável independentemente do
 * tamanho do corpo. Não afeta o tamanho VISUAL da rocha (a hitbox é invisível).
 */
const MIN_HITBOX_RADIUS = 0.06;
const KNOWN_HITBOX_SEGMENTS: [number, number] = [16, 16];
/** Altura do label acima do corpo, em múltiplos do raio visual. */
const LABEL_OFFSET_FACTOR = 6;

type KnownAsteroidsLayerProps = {
    showLabels: boolean;
    /** Id do conhecido atualmente selecionado (formato knownAsteroidId), ou null. */
    selectedId?: string | null;
    /** Escala AU própria (modo linear); default = ORBIT_AU_SCALE da régua normal. */
    auScale?: number;
    /**
     * Ids de conhecidos que já têm posição real do Horizons (desenhados pelo AsteroidSceneLayer).
     * Esta camada (Kepler local) os PULA, atuando só como fallback dos que o Horizons não resolveu.
     */
    skipIds?: Set<string>;
    /** Abre o card do conhecido clicado. */
    onSelect?: (known: KnownAsteroid) => void;
};

/**
 * Renderiza os asteroides conhecidos com modelo exclusivo na régua dos planetas (Sol na origem),
 * cada um na região real onde está. As posições são recalculadas por render a partir da data atual
 * (barato: 5 propagações de Kepler).
 */
export function KnownAsteroidsLayer({ showLabels, selectedId, auScale, skipIds, onSelect }: KnownAsteroidsLayerProps) {
    const placements = useMemo(() => knownAsteroidPlacements(new Date(), auScale), [auScale]);
    const hasSelection = Boolean(selectedId);

    return (
        <group>
            {placements.map(({ known, scenePosition }) => {
                const id = knownAsteroidId(known);
                // Pula os que já têm posição real do Horizons (desenhados pelo AsteroidSceneLayer).
                if (skipIds?.has(id)) return null;
                const isSelected = id === selectedId;
                return (
                    <KnownAsteroidBody
                        key={known.number}
                        known={known}
                        position={scenePosition}
                        showLabel={showLabels}
                        dimmed={hasSelection && !isSelected}
                        selected={isSelected}
                        onSelect={onSelect ? () => onSelect(known) : undefined}
                    />
                );
            })}
        </group>
    );
}

type KnownAsteroidBodyProps = {
    known: KnownAsteroid;
    position: [number, number, number];
    showLabel: boolean;
    dimmed: boolean;
    selected: boolean;
    onSelect?: () => void;
};

function KnownAsteroidBody({ known, position, showLabel, dimmed, selected, onSelect }: KnownAsteroidBodyProps) {
    const [hovered, setHovered] = useState(false);
    const modelAsset = modelAssetForKnown(known);
    const asset = useMemo(
        () => ({ key: 'generic' as const, url: modelAsset.url, rotation: modelAsset.rotation, aliases: [], numbers: [] }),
        [modelAsset.url, modelAsset.rotation],
    );
    const scale = knownAsteroidVisualScale(known);
    const opacity = dimmed && !hovered ? 0.5 : 1;
    // Pisos absolutos: com rochas pequenas (scale ~0,008) os fatores relativos dariam alvo e label
    // colados no corpo. O max garante um mínimo utilizável sem mexer no tamanho visual da rocha.
    const hitboxRadius = Math.max(scale * HITBOX_RADIUS_FACTOR, MIN_HITBOX_RADIUS);
    const labelOffset: [number, number, number] = [0, Math.max(scale * LABEL_OFFSET_FACTOR, 0.05), 0];

    return (
        <group position={position}>
            <group scale={scale}>
                <RealAsteroidModel asset={asset} opacity={opacity} seed={known.number} selected={selected || hovered} showOutline={selected} />
            </group>

            {/* Como os asteroides comuns (AsteroidMarker): a hitbox some quando o corpo já está
                selecionado, então clicar de novo no que já está focado não re-dispara a câmera. */}
            {!selected ? (
                <BodyHitbox
                    radius={hitboxRadius}
                    segments={KNOWN_HITBOX_SEGMENTS}
                    onClick={() => onSelect?.()}
                    onHoverChange={setHovered}
                />
            ) : null}

            {(showLabel || hovered || selected) ? (
                <ScreenLabel
                    position={labelOffset}
                    emphasized={hovered || selected}
                    protectFromFocus={!hovered && !selected}
                    allowSceneOverlap={selected}
                    /* Como nos planetas: o label seleciona quando o corpo NÃO está focado; já focado,
                       não re-dispara (mesma regra da hitbox). */
                    onClick={selected ? undefined : () => onSelect?.()}
                >
                    {known.name}
                </ScreenLabel>
            ) : null}
        </group>
    );
}
