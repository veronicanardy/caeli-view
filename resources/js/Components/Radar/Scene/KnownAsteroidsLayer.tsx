/**
 * Camada dos asteroides conhecidos (Bennu, Eros, Ceres, Vesta, Itokawa) na cena do radar.
 *
 * Responsabilidade: renderizar os asteroides com modelo 3D exclusivo na régua LINEAR dos planetas
 * (Sol na origem), ao lado da região real de cada um. As posições vêm de knownAsteroids (Kepler +
 * helioAUToSunCenteredScene); esta camada só desenha modelo, label e hitbox de hover.
 *
 * Por que vive no espaço heliocêntrico (e não offsetada pela Terra): estes objetos são distantes e
 * usam a mesma escala dos planetas, então caem ao lado deles sem a compressão log do radar — é a
 * resposta a "se está perto de Júpiter, aparece perto de Júpiter".
 *
 * Escala VISUAL é artística (grande o bastante para ser achável a dezenas de unidades do centro),
 * exatamente como os planetas ambiente: a aparência é ampliada, a POSIÇÃO é fiel.
 */

import { useMemo, useState } from 'react';
import { ScreenLabel } from '../Overlays/SceneLabels';
import { BodyHitbox } from '../Bodies/BodyHitbox';
import RealAsteroidModel from '../Bodies/Asteroid/RealAsteroidModel';
import { knownAsteroidPlacements, modelAssetForKnown } from '../Bodies/Asteroid/knownAsteroids';

/** Escala visual do modelo GLB (artística): achável na zona dos planetas, a dezenas de unidades do centro. */
const KNOWN_MODEL_SCALE = 0.9;
/** Raio da hitbox de hover/clique, em unidades de cena. */
const KNOWN_HITBOX_RADIUS = 1.4;
const KNOWN_HITBOX_SEGMENTS: [number, number] = [16, 16];
const KNOWN_LABEL_OFFSET: [number, number, number] = [0, 1.6, 0];

type KnownAsteroidsLayerProps = {
    showLabels: boolean;
    /** Quando o radar tem uma seleção ativa, esmaece os conhecidos para não competir. */
    dimmed?: boolean;
    onSelect?: (number: string) => void;
};

/**
 * Renderiza os asteroides conhecidos com modelo exclusivo na régua dos planetas (Sol na origem),
 * cada um na região real onde está. As posições são recalculadas por render a partir da data atual
 * — barato (5 propagações de Kepler).
 */
export function KnownAsteroidsLayer({ showLabels, dimmed = false, onSelect }: KnownAsteroidsLayerProps) {
    const placements = useMemo(() => knownAsteroidPlacements(new Date()), []);

    return (
        <group>
            {placements.map(({ known, scenePosition }) => (
                <KnownAsteroidBody
                    key={known.number}
                    name={known.name}
                    position={scenePosition}
                    assetUrl={modelAssetForKnown(known).url}
                    rotation={modelAssetForKnown(known).rotation}
                    seed={known.number}
                    showLabel={showLabels}
                    dimmed={dimmed}
                    onSelect={onSelect ? () => onSelect(known.number) : undefined}
                />
            ))}
        </group>
    );
}

type KnownAsteroidBodyProps = {
    name: string;
    position: [number, number, number];
    assetUrl: string;
    rotation: [number, number, number];
    seed: string;
    showLabel: boolean;
    dimmed: boolean;
    onSelect?: () => void;
};

function KnownAsteroidBody({ name, position, assetUrl, rotation, seed, showLabel, dimmed, onSelect }: KnownAsteroidBodyProps) {
    const [hovered, setHovered] = useState(false);
    const asset = useMemo(() => ({ key: 'generic' as const, url: assetUrl, rotation, aliases: [], numbers: [] }), [assetUrl, rotation]);
    const opacity = dimmed && !hovered ? 0.5 : 1;

    return (
        <group position={position}>
            <group scale={KNOWN_MODEL_SCALE}>
                <RealAsteroidModel asset={asset} opacity={opacity} seed={seed} showOutline={false} />
            </group>

            <BodyHitbox
                radius={KNOWN_HITBOX_RADIUS}
                segments={KNOWN_HITBOX_SEGMENTS}
                onClick={() => onSelect?.()}
                onHoverChange={setHovered}
            />

            {(showLabel || hovered) ? (
                <ScreenLabel position={KNOWN_LABEL_OFFSET} emphasized={hovered} protectFromFocus={!hovered}>
                    {name}
                </ScreenLabel>
            ) : null}
        </group>
    );
}
