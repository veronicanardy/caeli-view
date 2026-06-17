import { SceneLabel } from './SceneLabels';

/**
 * Camada de guias circulares 3D da cena.
 *
 * Os arrays de aneis permanecem vazios de proposito: a referencia de distancia
 * principal e a orbita da Lua, nao aneis de DL. Mantenha este componente como
 * ponto de extensao visual, sem mover calculo orbital para ca.
 */

// Aneis de DL desabilitados; a referencia de 1 DL pertence a orbita da Lua.
const SCENE_GUIDE_RING_STOPS_DL: number[] = [];

export function SceneRingsLayer({ onEarthFocus, showLabels }: { onEarthFocus: () => void; showLabels: boolean }) {
    return (
        <group rotation={[Math.PI / 2, 0, 0]}>
            {showLabels ? SCENE_GUIDE_RING_STOPS_DL.map((ld) => (
                <SceneLabel
                    key={`glabel-${ld}`}
                    position={[0, 0, 0]}
                    tier="ring"
                    onClick={onEarthFocus}
                    title="Focar na Terra"
                >
                    {ld} DL
                </SceneLabel>
            )) : null}
        </group>
    );
}
