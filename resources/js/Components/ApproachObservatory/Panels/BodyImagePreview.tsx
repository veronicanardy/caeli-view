/**
 * Preview de imagem real estática para corpos celestes.
 * Mesmo espaço visual do AsteroidModelPreview — substitui o Canvas por um <img>.
 */

import type { BodyId } from './bodyInfoContent';

const BODY_IMAGE: Record<BodyId, { src: string; credit: string }> = {
    sun:     { src: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e002069/GSFC_20171208_Archive_e002069~orig.jpg', credit: 'NASA/SDO' },
    earth:   { src: 'https://images-assets.nasa.gov/image/PIA00076/PIA00076~orig.jpg',                                          credit: 'NASA/JPL · Galileo' },
    moon:    { src: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001989/GSFC_20171208_Archive_e001989~orig.jpg', credit: 'NASA/GSFC · LRO' },
    mercury: { src: 'https://images-assets.nasa.gov/image/PIA00437/PIA00437~orig.jpg',                                          credit: 'NASA/JPL · Mariner 10' },
    venus:   { src: 'https://images-assets.nasa.gov/image/PIA23791/PIA23791~orig.jpg',                                          credit: 'NASA/JPL · Mariner 10' },
    mars:    { src: 'https://images-assets.nasa.gov/image/PIA03154/PIA03154~orig.jpg',                                          credit: 'NASA/ESA · Hubble' },
    jupiter: { src: 'https://images-assets.nasa.gov/image/PIA22946/PIA22946~orig.jpg',                                          credit: 'NASA/JPL-Caltech · Juno' },
    saturn:  { src: 'https://images-assets.nasa.gov/image/PIA14934/PIA14934~orig.jpg',                                          credit: 'NASA/JPL-Caltech · Cassini' },
    uranus:  { src: 'https://images-assets.nasa.gov/image/PIA18182/PIA18182~orig.jpg',                                          credit: 'NASA/JPL · Voyager 2' },
    neptune: { src: 'https://images-assets.nasa.gov/image/PIA01492/PIA01492~orig.jpg',                                          credit: 'NASA/JPL · Voyager 2' },
};

export function BodyImagePreview({ body }: { body: BodyId }) {
    const { src, credit } = BODY_IMAGE[body];

    return (
        <div className="mx-3 mt-2.5 lg:mx-4">
            <div
                className="relative h-28 overflow-hidden rounded-xl border border-white/6 lg:h-32"
                style={{ background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.04) 0%, rgba(3,6,13,0.95) 70%)' }}
            >
                <img
                    src={src}
                    alt={body}
                    className="h-full w-full object-cover opacity-0 transition-opacity duration-500"
                    style={{ objectPosition: 'center' }}
                    loading="lazy"
                    decoding="async"
                    onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                />
                <p className="absolute bottom-1.5 right-2 text-[9px] text-white/25 tracking-wide">{credit}</p>
            </div>
        </div>
    );
}
