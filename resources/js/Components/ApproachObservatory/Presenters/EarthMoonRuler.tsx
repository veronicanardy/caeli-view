import { compactKm, formatNumber } from '@/lib/format';
import { Moon3D } from '../Bodies/Moon/Moon3D';

type Props = {
    lunarDistance: number | null;
    distanceKm: number | null;
    earthLabel: string;
    moonLabel: string;
    objectLabel: string;
    noteLabel: string;
    titleLabel: string;
    unavailableLabel: string;
};

const VIEWBOX_WIDTH = 600;
const VIEWBOX_HEIGHT = 110;
const TRACK_Y = 60;
const EARTH_X = 60;
const MOON_X = 240;
const RIGHT_EDGE = VIEWBOX_WIDTH - 30;
const LINEAR_MAX = 5;
const MOON_LEFT_PERCENT = (MOON_X / VIEWBOX_WIDTH) * 100;
const MOON_TOP_PERCENT = (TRACK_Y / VIEWBOX_HEIGHT) * 100;

export function EarthMoonRuler({
    lunarDistance,
    distanceKm,
    earthLabel,
    moonLabel,
    objectLabel,
    noteLabel,
    titleLabel,
    unavailableLabel,
}: Props) {
    if (lunarDistance === null) {
        return (
            <div className="rounded-lg border border-white/10 bg-space-950/55 p-4 text-xs text-white/55">
                {unavailableLabel}
            </div>
        );
    }

    const objectX = positionForLunarDistance(lunarDistance);
    const lunarLabelText = `${formatNumber(lunarDistance, lunarDistance < 10 ? 1 : 0)} DL`;
    const kmText = distanceKm !== null ? compactKm(distanceKm) : '';

    return (
        <figure className="rounded-lg border border-white/10 bg-space-950/55 p-4">
            <figcaption className="flex items-center justify-between text-[11px] uppercase tracking-wide text-white/45">
                <span>{titleLabel}</span>
                <span>{lunarLabelText}{kmText ? ` · ${kmText}` : ''}</span>
            </figcaption>
            <div className="relative mt-3 h-24 w-full">
                <svg
                    viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
                    className="absolute inset-0 size-full"
                    role="img"
                    aria-label={`${earthLabel}, ${moonLabel}, ${objectLabel}`}
                >
                    <defs>
                        <linearGradient id="ruler-track" x1="0%" x2="100%" y1="0%" y2="0%">
                            <stop offset="0%" stopColor="rgba(84,214,214,0.55)" />
                            <stop offset="40%" stopColor="rgba(167,139,250,0.4)" />
                            <stop offset="100%" stopColor="rgba(255,255,255,0.15)" />
                        </linearGradient>
                    </defs>

                    <line x1={EARTH_X} x2={RIGHT_EDGE} y1={TRACK_Y} y2={TRACK_Y} stroke="url(#ruler-track)" strokeWidth={2} strokeLinecap="round" />

                    {Array.from({ length: 4 }).map((_, index) => {
                        const x = positionForLunarDistance((index + 2));
                        return (
                            <line key={index} x1={x} x2={x} y1={TRACK_Y - 5} y2={TRACK_Y + 5} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
                        );
                    })}

                    <g>
                        <circle cx={EARTH_X} cy={TRACK_Y} r={14} fill="#1a4d6b" stroke="rgba(84,214,214,0.6)" strokeWidth={1.5} />
                        <circle cx={EARTH_X - 4} cy={TRACK_Y - 2} r={3} fill="rgba(118,228,181,0.7)" />
                        <text x={EARTH_X} y={TRACK_Y + 32} textAnchor="middle" fontSize={11} fill="#fff" opacity={0.7}>{earthLabel}</text>
                    </g>

                    <g>
                        <text x={MOON_X} y={TRACK_Y + 32} textAnchor="middle" fontSize={11} fill="#fff" opacity={0.7}>{moonLabel}</text>
                        <text x={MOON_X} y={TRACK_Y - 22} textAnchor="middle" fontSize={9} fill="#fff" opacity={0.45}>1 DL</text>
                    </g>

                    <g
                        style={{
                            transform: `translateX(${objectX - EARTH_X}px)`,
                            transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                    >
                        <circle cx={EARTH_X} cy={TRACK_Y} r={18} fill="rgba(84,214,214,0.18)" />
                        <circle cx={EARTH_X} cy={TRACK_Y} r={6} fill="#54d6d6" stroke="#fff" strokeWidth={1.2} />
                        <text x={EARTH_X} y={TRACK_Y - 16} textAnchor="middle" fontSize={11} fill="#54d6d6">{objectLabel}</text>
                    </g>
                </svg>
                <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${MOON_LEFT_PERCENT}%`, top: `${MOON_TOP_PERCENT}%` }}
                    aria-hidden="true"
                >
                    <Moon3D sizePx={30} label={moonLabel} />
                </div>
            </div>
            <p className="mt-1 text-[11px] text-white/40">{noteLabel}</p>
        </figure>
    );
}

function positionForLunarDistance(lunarDistance: number): number {
    if (lunarDistance <= 0) return EARTH_X;
    if (lunarDistance <= 1) {
        return EARTH_X + (MOON_X - EARTH_X) * lunarDistance;
    }
    if (lunarDistance <= LINEAR_MAX) {
        const segmentEnd = MOON_X + (RIGHT_EDGE - MOON_X) * 0.55;
        return MOON_X + ((lunarDistance - 1) / (LINEAR_MAX - 1)) * (segmentEnd - MOON_X);
    }
    const compressedStart = MOON_X + (RIGHT_EDGE - MOON_X) * 0.55;
    const compressed = Math.log1p(lunarDistance - LINEAR_MAX) / Math.log1p(40);
    return compressedStart + Math.min(1, compressed) * (RIGHT_EDGE - compressedStart);
}
