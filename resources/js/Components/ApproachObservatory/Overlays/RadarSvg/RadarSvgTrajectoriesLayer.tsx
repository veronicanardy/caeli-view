/**
 * Camadas de trajetoria do radar SVG.
 *
 * Este modulo desenha tanto a trajetoria selecionada quanto os segmentos "agora"
 * por objeto, sempre a partir de paths ja montados. Nao deve reinterpretar os
 * dados fisicos nem gerar amostragens novas aqui.
 */
import type { LayoutNowTrajectory } from '@/lib/radarLayout';
import type { RadarSvgLayoutProps, RadarSvgReferenceProps } from './radarSvgTypes';

export function RadarSvgNowTrajectoriesLayer({ layout }: RadarSvgLayoutProps) {
    const trajectories = layout.nowTrajectories;
    if (!trajectories || trajectories.length === 0) return null;

    return (
        <g aria-hidden="true">
            <defs>
                <marker id="now-traj-arrow" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 Z" fill="rgba(118,228,181,0.95)" />
                </marker>
            </defs>
            {trajectories.map((traj: LayoutNowTrajectory) => (
                <g key={`now-traj-${traj.objectId}`}>
                    {traj.pastPathPx ? (
                        <path d={traj.pastPathPx} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={1.0} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3 4" />
                    ) : null}
                    {traj.futurePathPx ? (
                        <path d={traj.futurePathPx} fill="none" stroke="rgba(118,228,181,0.9)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#now-traj-arrow)" />
                    ) : null}
                    {traj.currentPoint ? (
                        <g>
                            <circle cx={traj.currentPoint.x} cy={traj.currentPoint.y} r={5.5} fill="none" stroke="rgba(118,228,181,0.55)" strokeWidth={1.2} />
                            <circle cx={traj.currentPoint.x} cy={traj.currentPoint.y} r={2.6} fill="rgba(118,228,181,1)" />
                        </g>
                    ) : null}
                </g>
            ))}
        </g>
    );
}

export function RadarSvgTrajectoryLayer({ layout, referenceMode }: RadarSvgReferenceProps) {
    if (!layout.trajectory) return null;
    const closestMode = referenceMode === 'closest_approach';
    const pathOpacity = closestMode ? 0.78 : 0.45;
    const closestPoint = layout.trajectory.closestPoint;

    return (
        <g aria-hidden="true">
            <path d={layout.trajectory.pathPx} fill="none" stroke={`rgba(118,228,181,${pathOpacity})`} strokeWidth={closestMode ? 1.8 : 1.2} strokeLinecap="round" strokeLinejoin="round" />
            {closestPoint ? (
                <g>
                    <circle cx={closestPoint.x} cy={closestPoint.y} r={closestMode ? 18 : 11} fill="none" stroke="rgba(84,214,214,0.28)" strokeWidth={1.2} />
                    <circle cx={closestPoint.x} cy={closestPoint.y} r={closestMode ? 6 : 4} fill="rgba(84,214,214,1)" stroke="rgba(255,255,255,0.9)" strokeWidth={1} />
                </g>
            ) : null}
        </g>
    );
}
