/**
 * Camada declarativa dos planetas ambiente.
 *
 * Responsabilidade: montar os wrappers visuais dos planetas a partir das posições
 * heliocêntricas já resolvidas, repassando foco local e visibilidade de labels.
 */

import { Jupiter } from '../Bodies/Jupiter/Jupiter';
import { Mars } from '../Bodies/Mars/Mars';
import { Mercury } from '../Bodies/Mercury/Mercury';
import { Neptune } from '../Bodies/Neptune/Neptune';
import { Saturn } from '../Bodies/Saturn/Saturn';
import { Uranus } from '../Bodies/Uranus/Uranus';
import { Venus } from '../Bodies/Venus/Venus';
import type { PlanetScenePositions } from './scenePositions';

/**
 * Renderiza planetas a partir de posições heliocêntricas já resolvidas.
 */
type PlanetLayerProps = PlanetScenePositions & {
    locale: 'pt-BR' | 'en';
    showLabels: boolean;
    onFocusMercury: () => void;
    isMercuryFocused: boolean;
    onFocusVenus: () => void;
    isVenusFocused: boolean;
    onFocusMars: () => void;
    isMarsFocused: boolean;
    onFocusJupiter: () => void;
    isJupiterFocused: boolean;
    onFocusSaturn: () => void;
    isSaturnFocused: boolean;
    onFocusUranus: () => void;
    isUranusFocused: boolean;
    onFocusNeptune: () => void;
    isNeptuneFocused: boolean;
};

export function PlanetLayer({
    mercuryPos,
    venusPos,
    marsPos,
    jupiterPos,
    saturnPos,
    uranusPos,
    neptunePos,
    locale,
    showLabels,
    onFocusMercury,
    isMercuryFocused,
    onFocusVenus,
    isVenusFocused,
    onFocusMars,
    isMarsFocused,
    onFocusJupiter,
    isJupiterFocused,
    onFocusSaturn,
    isSaturnFocused,
    onFocusUranus,
    isUranusFocused,
    onFocusNeptune,
    isNeptuneFocused,
}: PlanetLayerProps) {
    return (
        <>
            {mercuryPos ? <Mercury position={mercuryPos} locale={locale} onFocus={onFocusMercury} isFocused={isMercuryFocused} showLabel={showLabels} /> : null}
            {venusPos ? <Venus position={venusPos} locale={locale} onFocus={onFocusVenus} isFocused={isVenusFocused} showLabel={showLabels} /> : null}
            {marsPos ? <Mars position={marsPos} locale={locale} onFocus={onFocusMars} isFocused={isMarsFocused} showLabel={showLabels} /> : null}
            {jupiterPos ? <Jupiter position={jupiterPos} locale={locale} onFocus={onFocusJupiter} isFocused={isJupiterFocused} showLabel={showLabels} /> : null}
            {saturnPos ? <Saturn position={saturnPos} locale={locale} onFocus={onFocusSaturn} isFocused={isSaturnFocused} showLabel={showLabels} /> : null}
            {uranusPos ? <Uranus position={uranusPos} locale={locale} onFocus={onFocusUranus} isFocused={isUranusFocused} showLabel={showLabels} /> : null}
            {neptunePos ? <Neptune position={neptunePos} locale={locale} onFocus={onFocusNeptune} isFocused={isNeptuneFocused} showLabel={showLabels} /> : null}
        </>
    );
}
