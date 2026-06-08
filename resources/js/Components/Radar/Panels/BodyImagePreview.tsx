/**
 * Preview de imagem real estática para corpos celestes.
 * Mesmo espaço visual do AsteroidModelPreview — substitui o Canvas por um <img>.
 */

import type { BodyId } from './bodyInfoContent';

type ImageConfig = {
    src: string;
    credit: string;
    fit?: 'cover' | 'contain';
    position?: string;
    // Escala visual do disco no frame — calibrada pelos diâmetros reais mas com range
    // comprimido (0.55–1.0) para que a hierarquia seja perceptível sem a Lua sumir.
    // Júpiter/Saturno usam cover e preenchem o frame naturalmente (escala implícita 1.0).
    scale?: number;
};

// Diâmetros reais (km) para referência da hierarquia visual:
// Sol 1.39M · Júpiter 139k · Saturno 116k · Urano 51k · Netuno 49k
// Terra 12.7k · Vênus 12.1k · Marte 6.8k · Mercúrio 4.9k · Lua 3.5k
const BODY_IMAGE: Record<BodyId, ImageConfig> = {
    sun:     { src: '/images/bodies/sun.jpg',     credit: 'NASA/SDO',             fit: 'cover',   scale: 1.4    },
    jupiter: { src: '/images/bodies/jupiter.jpg', credit: 'NASA/JPL · Cassini',   fit: 'cover'                  },
    saturn:  { src: '/images/bodies/saturn.jpg',  credit: 'NASA/JPL · Cassini',   fit: 'cover'                  },
    uranus:  { src: '/images/bodies/uranus.jpg',  credit: 'NASA/JPL · Voyager 2', fit: 'contain', scale: 0.90   },
    neptune: { src: '/images/bodies/neptune.jpg', credit: 'NASA/JPL · Voyager 2', fit: 'contain', scale: 0.88   },
    earth:   { src: '/images/bodies/earth.jpg',   credit: 'NASA/JPL · Galileo',   fit: 'contain', scale: 0.86   },
    venus:   { src: '/images/bodies/venus.jpg',   credit: 'NASA/JPL · Galileo',   fit: 'contain', scale: 0.77   },
    mars:    { src: '/images/bodies/mars.jpg',    credit: 'NASA/JPL · Viking',    fit: 'contain', scale: 0.68   },
    mercury: { src: '/images/bodies/mercury.jpg', credit: 'NASA/MESSENGER',       fit: 'contain', scale: 0.62   },
    moon:    { src: '/images/bodies/moon.jpg',    credit: 'NASA/JPL · Galileo',   fit: 'contain', scale: 0.58   },
};

export function BodyImagePreview({ body }: { body: BodyId }) {
    const { src, credit, fit = 'contain', position = 'center', scale } = BODY_IMAGE[body];

    return (
        <div className="mx-3 mt-1.5 lg:mx-4 lg:mt-2.5">
            <div
                className="relative h-14 overflow-hidden rounded-xl border border-white/6 lg:h-32"
                style={{ background: '#000' }}
            >
                <img
                    src={src}
                    alt=""
                    className="absolute inset-0 h-full w-full"
                    style={{
                        objectFit: fit,
                        objectPosition: position,
                        transform: scale !== undefined ? `scale(${scale})` : undefined,
                        transformOrigin: 'center',
                    }}
                    loading="lazy"
                    decoding="async"
                />
                <p className="absolute bottom-1.5 right-2 z-10 text-[9px] text-white/25 tracking-wide">{credit}</p>
            </div>
        </div>
    );
}
