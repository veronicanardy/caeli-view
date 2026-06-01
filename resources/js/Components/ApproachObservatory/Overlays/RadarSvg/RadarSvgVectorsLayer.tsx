/**
 * Camada dos vetores sinteticos passado-atual-futuro do radar.
 *
 * Ela apenas desenha segmentos ja calculados. Este arquivo nao deve inferir
 * trajetorias reais, consultar Horizons ou alterar o modo de referencia.
 */
import type { RadarSvgReferenceProps } from './radarSvgTypes';

export function RadarSvgVectorsLayer({ layout, referenceMode }: RadarSvgReferenceProps) {
    if (layout.vectors.length === 0) return null;
    const isCurrent = referenceMode === 'current';
    const futureStroke = isCurrent ? 'rgba(118,228,181,0.85)' : 'rgba(118,228,181,0.32)';
    const futureWidth = isCurrent ? 2.2 : 1.0;
    const pastStroke = isCurrent ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.14)';
    const pastWidth = isCurrent ? 1.4 : 0.8;

    return (
        <g aria-hidden="true">
            <defs>
                <marker id="vector-arrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 Z" fill={futureStroke} />
                </marker>
            </defs>
            {layout.vectors.map((vector) => (
                <g key={vector.objectId}>
                    <line x1={vector.past.x} y1={vector.past.y} x2={vector.current.x} y2={vector.current.y} stroke={pastStroke} strokeWidth={pastWidth} strokeLinecap="round" strokeDasharray="3 3" />
                    <line x1={vector.current.x} y1={vector.current.y} x2={vector.future.x} y2={vector.future.y} stroke={futureStroke} strokeWidth={futureWidth} strokeLinecap="round" markerEnd={isCurrent ? 'url(#vector-arrow)' : undefined} />
                </g>
            ))}
        </g>
    );
}
