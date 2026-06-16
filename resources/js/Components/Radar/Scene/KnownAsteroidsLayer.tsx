/**
 * Camada dos asteroides conhecidos (Bennu, Eros, Ceres, Vesta, Itokawa) na cena do radar.
 *
 * Responsabilidade: renderizar os asteroides com modelo 3D exclusivo na régua LINEAR dos planetas
 * (Sol na origem), ao lado da região real de cada um. As posições vêm de knownAsteroids (Kepler +
 * helioAUToSunCenteredScene); esta camada só desenha modelo, label e hitbox de clique/hover.
 *
 * Por que vive no espaço heliocêntrico (e não offsetada pela Terra): estes objetos são distantes e
 * usam a mesma escala dos planetas, então caem ao lado deles sem a compressão log do radar. É a
 * resposta a "se está perto de Júpiter, aparece perto de Júpiter".
 *
 * Escala VISUAL deriva do diâmetro REAL, comprimida em log (knownAsteroidVisualScale): preserva a
 * ordem de tamanho (Ceres ≫ Bennu) sem que os menores sumam nem os maiores dominem a cena. A POSIÇÃO
 * é fiel; o TAMANHO é uma compressão honesta em ordem de grandeza, como o resto da cena.
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
 * Hitbox generosa em relação ao raio visual (que agora é pequeno, padronizado com os planetas):
 * um alvo maior que o corpo facilita clique/hover a dezenas de unidades do centro, como o
 * radiusMultiplier dos planetas pequenos.
 */
const HITBOX_RADIUS_FACTOR = 4;
const KNOWN_HITBOX_SEGMENTS: [number, number] = [16, 16];
/** Altura do label acima do corpo, em múltiplos do raio visual. */
const LABEL_OFFSET_FACTOR = 6;

type KnownAsteroidsLayerProps = {
    showLabels: boolean;
    /** Id do conhecido atualmente selecionado (formato knownAsteroidId), ou null. */
    selectedId?: string | null;
    /** Escala AU própria (modo linear); default = ORBIT_AU_SCALE da régua normal. */
    auScale?: number;
    /** Abre o card do conhecido clicado. */
    onSelect?: (known: KnownAsteroid) => void;
};

/**
 * Renderiza os asteroides conhecidos com modelo exclusivo na régua dos planetas (Sol na origem),
 * cada um na região real onde está. As posições são recalculadas por render a partir da data atual
 * (barato: 5 propagações de Kepler).
 */
export function KnownAsteroidsLayer({ showLabels, selectedId, auScale, onSelect }: KnownAsteroidsLayerProps) {
    const placements = useMemo(() => knownAsteroidPlacements(new Date(), auScale), [auScale]);
    const hasSelection = Boolean(selectedId);

    return (
        <group>
            {placements.map(({ known, scenePosition }) => {
                const id = knownAsteroidId(known);
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
    const scale = knownAsteroidVisualScale();
    const opacity = dimmed && !hovered ? 0.5 : 1;
    const labelOffset: [number, number, number] = [0, scale * LABEL_OFFSET_FACTOR, 0];

    return (
        <group position={position}>
            <group scale={scale}>
                <RealAsteroidModel asset={asset} opacity={opacity} seed={known.number} selected={selected || hovered} showOutline={selected} />
            </group>

            {/* Como os asteroides comuns (AsteroidMarker): a hitbox some quando o corpo já está
                selecionado, então clicar de novo no que já está focado não re-dispara a câmera. */}
            {!selected ? (
                <BodyHitbox
                    radius={scale * HITBOX_RADIUS_FACTOR}
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
