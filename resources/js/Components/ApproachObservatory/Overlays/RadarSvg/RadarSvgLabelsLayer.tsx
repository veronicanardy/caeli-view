/**
 * Labels textuais do radar SVG.
 *
 * Esta camada apenas desenha rótulos já decididos pelo layout. Nao deve mudar
 * heuristicas de visibilidade, recalcular ancoragem ou criar novos tipos sem
 * alinhar com a camada pura de layout.
 */
import type { RadarSvgLayoutProps } from './radarSvgTypes';

export function RadarSvgLabelsLayer({ layout }: RadarSvgLayoutProps) {
    return (
        <g aria-hidden="true">
            {layout.labels.filter((label) => label.visible && label.kind !== 'ring' && label.kind !== 'ring-guide').map((label) => (
                <text
                    key={label.id}
                    x={label.x}
                    y={label.y}
                    textAnchor={label.anchor}
                    fontSize={label.fontSizePx}
                    fontWeight={label.kind === 'moon' || label.kind === 'closest' ? 600 : label.kind === 'ring' ? 500 : 400}
                    fill={
                        label.kind === 'moon' ? 'rgba(255,255,255,0.92)'
                        : label.kind === 'closest' ? 'rgba(180,240,240,1)'
                        : label.kind === 'ring' ? 'rgba(255,255,255,0.75)'
                        : 'rgba(255,255,255,0.42)'
                    }
                    style={{ paintOrder: 'stroke', stroke: 'rgba(10,14,28,0.85)', strokeWidth: 3, strokeLinejoin: 'round' }}
                >
                    {label.text}
                </text>
            ))}
        </g>
    );
}
