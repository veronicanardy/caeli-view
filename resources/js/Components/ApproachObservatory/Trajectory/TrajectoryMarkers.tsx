/**
 * Marcadores visuais de trajetória.
 *
 * Responsabilidade: renderizar ticks temporais e máxima aproximação a partir de
 * pontos já resolvidos, sem calcular ranking, seleção ou fallback científico.
 */

import * as THREE from 'three';
import { compactKm } from '@/lib/format';
import { formatTimestamp } from '@/lib/observatory/format';
import type { ClosestApproachSample } from '@/lib/observatory/trajectorySampling';
import { FocusProtectedHtml } from '../Overlays/SceneLabels';

/**
 * Contém marcadores visuais ligados à trajetória.
 *
 * Recebe pontos já resolvidos por outras camadas, sem calcular máxima
 * aproximação, decidir ranking ou corrigir fallback.
 */
export function TimeTick({
    vec,
    label,
    color,
}: {
    vec: THREE.Vector3;
    label: string;
    color: string;
}) {
    return (
        <group position={vec}>
            <mesh>
                <sphereGeometry args={[0.012, 12, 12]} />
                <meshBasicMaterial color={color} transparent opacity={0.85} />
            </mesh>
            <FocusProtectedHtml position={[0, 0.055, 0]} center distanceFactor={7} zIndexRange={[6, 0]}>
                <span className="pointer-events-none select-none whitespace-nowrap rounded-full bg-space-950/70 px-1.5 py-0.5 text-[10px] font-medium text-white/75 backdrop-blur">
                    {label}
                </span>
            </FocusProtectedHtml>
        </group>
    );
}

export function ClosestApproachMarker({
    point,
    color,
    emphasized,
    dimmed,
    locale,
    showLabel = true,
}: {
    point: ClosestApproachSample;
    color: string;
    emphasized: boolean;
    dimmed: boolean;
    locale: 'pt-BR' | 'en';
    showLabel?: boolean;
}) {
    const en = locale === 'en';
    const opacity = dimmed ? 0.3 : 0.85;

    return (
        <group position={point.vec}>
            <mesh>
                <sphereGeometry args={[0.016, 16, 16]} />
                <meshBasicMaterial color={color} transparent opacity={opacity} />
            </mesh>
            {emphasized && showLabel ? (
                <FocusProtectedHtml position={[0, 0.09, 0]} center distanceFactor={5} zIndexRange={[8, 0]}>
                    <div className="pointer-events-none whitespace-nowrap rounded-md border border-white/10 bg-space-950/90 px-2 py-1 text-[11px] text-white/90 shadow-glow backdrop-blur">
                        <div className="text-[9px] uppercase tracking-wide text-white/60">
                            {en ? 'Closest approach' : 'Máxima aproximação'}
                        </div>
                        <div className="font-semibold">
                            {point.distanceLD !== null ? `${point.distanceLD.toFixed(2)} DL` : '—'}{' '}
                            <span className="font-normal text-white/60">· {compactKm(point.distanceKm)}</span>
                        </div>
                        <div className="text-[9px] text-white/50">{formatTimestamp(point.timestamp, locale)}</div>
                    </div>
                </FocusProtectedHtml>
            ) : null}
        </group>
    );
}
