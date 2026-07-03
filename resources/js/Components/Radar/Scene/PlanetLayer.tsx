/**
 * Camada declarativa dos planetas ambiente.
 *
 * Responsabilidade: montar os wrappers visuais dos planetas a partir das posições
 * heliocêntricas já resolvidas, repassando foco e visibilidade de labels. O foco
 * chega como um único callback por id (`onFocusPlanet`) e um id focado
 * (`focusedPlanetId`), em vez de um par de props por planeta.
 */

import type { ComponentType } from 'react';
import { Jupiter } from '../Bodies/Jupiter/Jupiter';
import { Mars } from '../Bodies/Mars/Mars';
import { Mercury } from '../Bodies/Mercury/Mercury';
import { Neptune } from '../Bodies/Neptune/Neptune';
import { Saturn } from '../Bodies/Saturn/Saturn';
import { Uranus } from '../Bodies/Uranus/Uranus';
import { Venus } from '../Bodies/Venus/Venus';
import type { PlanetBodyProps } from '../Bodies/planetBodyTypes';
import type { PlanetId } from './planetConfig';
import type { PlanetScenePositions } from './scenePositions';

type PlanetLayerProps = {
    positions: PlanetScenePositions;
    locale: 'pt-BR' | 'en';
    showLabels: boolean;
    /** Foca a câmera no planeta clicado (label/hitbox da cena). */
    onFocusPlanet: (id: PlanetId) => void;
    /** Planeta com card aberto (realce de foco), ou null. */
    focusedPlanetId: PlanetId | null;
};

/** Ordem de montagem dos planetas e a chave da posição de cada um em PlanetScenePositions. */
const PLANETS: Array<{ id: PlanetId; posKey: keyof PlanetScenePositions; Component: ComponentType<PlanetBodyProps> }> = [
    { id: 'mercury', posKey: 'mercuryPos', Component: Mercury },
    { id: 'venus', posKey: 'venusPos', Component: Venus },
    { id: 'mars', posKey: 'marsPos', Component: Mars },
    { id: 'jupiter', posKey: 'jupiterPos', Component: Jupiter },
    { id: 'saturn', posKey: 'saturnPos', Component: Saturn },
    { id: 'uranus', posKey: 'uranusPos', Component: Uranus },
    { id: 'neptune', posKey: 'neptunePos', Component: Neptune },
];

/**
 * Renderiza planetas a partir de posições heliocêntricas já resolvidas.
 */
export function PlanetLayer({ positions, locale, showLabels, onFocusPlanet, focusedPlanetId }: PlanetLayerProps) {
    return (
        <>
            {PLANETS.map(({ id, posKey, Component }) => {
                const position = positions[posKey];
                if (!position) return null;
                return (
                    <Component
                        key={id}
                        position={position}
                        locale={locale}
                        onFocus={() => onFocusPlanet(id)}
                        isFocused={focusedPlanetId === id}
                        showLabel={showLabels}
                    />
                );
            })}
        </>
    );
}
