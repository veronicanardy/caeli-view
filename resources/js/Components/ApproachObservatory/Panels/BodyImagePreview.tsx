/**
 * Preview de imagem real estática para corpos celestes.
 * Mesmo espaço visual do AsteroidModelPreview — substitui o Canvas por um <img>.
 */

import type { BodyId } from './bodyInfoContent';

const BODY_IMAGE: Record<BodyId, { src: string; credit: string }> = {
    sun:     { src: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e002069/GSFC_20171208_Archive_e002069~orig.jpg', credit: 'NASA/SDO' },
    earth:   { src: 'https://images-assets.nasa.gov/image/PIA00076/PIA00076~orig.jpg',                                          credit: 'NASA/JPL · Galileo' },
    moon:    { src: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001989/GSFC_20171208_Archive_e001989~orig.jpg', credit: 'NASA/GSFC · LRO' },
    mercury: { src: 'https://images-assets.nasa.gov/image/PIA12397/PIA12397~orig.jpg',                                          credit: 'NASA/MESSENGER' },
    venus:   { src: 'https://images-assets.nasa.gov/image/PIA00072/PIA00072~orig.jpg',                                          credit: 'NASA/JPL · Galileo' },
    mars:    { src: 'https://images-assets.nasa.gov/image/PIA02981/PIA02981~orig.jpg',                                          credit: 'NASA/JPL · Mariner 7' },
    jupiter: { src: 'https://images-assets.nasa.gov/image/PIA01509/PIA01509~orig.jpg',                                          credit: 'NASA/JPL · Voyager 1' },
    saturn:  { src: 'https://images-assets.nasa.gov/image/PIA02225/PIA02225~orig.jpg',                                          credit: 'NASA/JPL · Voyager' },
    uranus:  { src: 'https://images-assets.nasa.gov/image/PIA18182/PIA18182~orig.jpg',                                          credit: 'NASA/JPL · Voyager 2' },
    neptune: { src: 'https://images-assets.nasa.gov/image/ARC-1989-AC89-7001/ARC-1989-AC89-7001~orig.jpg',                      credit: 'NASA/JPL · Voyager 2' },
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
