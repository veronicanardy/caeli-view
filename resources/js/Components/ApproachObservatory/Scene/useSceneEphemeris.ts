import { useEffect, useState } from 'react';
import { computeSceneEphemeris } from '@/lib/sceneEphemeris';
import type { SceneEphemeris } from '@/lib/sceneEphemeris';

/**
 * Mantém a efeméride local da cena atualizada em intervalo curto.
 */
export function useSceneEphemeris(): SceneEphemeris | null {
    const [ephemeris, setEphemeris] = useState<SceneEphemeris | null>(null);

    useEffect(() => {
        let active = true;
        const update = () => {
            void computeSceneEphemeris(new Date()).then((result) => {
                if (active && result) setEphemeris(result);
            });
        };
        update();
        const id = window.setInterval(update, 10 * 1000);
        return () => {
            active = false;
            window.clearInterval(id);
        };
    }, []);

    return ephemeris;
}
