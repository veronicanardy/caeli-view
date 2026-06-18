/**
 * Marcadores visuais de trajetória.
 *
 * Responsabilidade: renderizar ticks temporais e máxima aproximação a partir de
 * pontos já resolvidos, sem calcular ranking, seleção ou fallback científico.
 */

import * as THREE from 'three';
import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { compactKm } from '@/lib/format';
import { TICK_Z_INDEX_RANGE } from '@/lib/radar/radarLabels';
import type { ClosestApproachSample } from '@/lib/radar/trajectorySampling';
import { Html } from '@react-three/drei';
import { FocusProtectedHtml } from '../Overlays/SceneLabels';
import { Tooltip } from '../Controls/Tooltip';

/**
 * Contém marcadores visuais ligados à trajetória.
 *
 * Recebe pontos já resolvidos por outras camadas, sem calcular máxima
 * aproximação, decidir ranking ou corrigir fallback.
 */
// Limiar da órbita lunar em px abaixo do qual os ticks temporais somem (zoom out extremo ≈ Júpiter).
const TICK_HIDE_LUNAR_PX = 5;

function TimeTick({
    vec,
    label,
    tooltip,
    color,
    visible,
    onClick,
}: {
    vec: THREE.Vector3;
    label: string;
    tooltip: string;
    color: string;
    visible: boolean;
    onClick?: () => void;
}) {
    return (
        <group position={vec}>
            <mesh>
                <sphereGeometry args={[0.007, 8, 8]} />
                <meshBasicMaterial color={color} transparent opacity={visible ? 0.45 : 0} />
            </mesh>
            {visible ? (
                <Html position={[0, 0.038, 0]} center zIndexRange={TICK_Z_INDEX_RANGE}>
                    <Tooltip content={(() => { const [line1, line2] = tooltip.split('|'); return line2 ? <><span>{line1}</span><br /><span className="text-white/50">{line2}</span></> : <span>{line1}</span>; })()} side="top" offset={28} hideDelay={200}>
                        <span
                            onClick={onClick}
                            className={[
                                'select-none -translate-y-1/2 whitespace-nowrap rounded border border-white/10 bg-space-950/85 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur',
                                onClick ? 'cursor-pointer transition hover:border-signal-cyan/50 hover:text-signal-cyan hover:bg-space-950' : 'cursor-default',
                            ].join(' ')}
                            style={{
                                color: 'rgba(190, 210, 220, 0.65)',
                                opacity: 1,
                                pointerEvents: 'auto',
                            }}
                        >
                            {label}
                        </span>
                    </Tooltip>
                </Html>
            ) : null}
        </group>
    );
}

type Controls = {
    target: THREE.Vector3;
    update: () => void;
};

/** Renderiza todos os ticks temporais de uma trajetória. Esconde tudo em zoom-out extremo. */
export function TimeTickGroup({
    ticks,
    color,
    onFocusPoint,
}: {
    ticks: Array<{ vec: THREE.Vector3; label: string; tooltip: string; zOrder: number }>;
    color: string;
    onFocusPoint?: (vec: THREE.Vector3) => void;
}) {
    const { camera, size } = useThree();
    const controls = useThree((s) => s.controls) as unknown as Controls | null;
    const [visible, setVisible] = useState<boolean[]>(() => ticks.map(() => true));
    const visibleRef = useRef<boolean[]>(ticks.map(() => true));

    // Vetores reutilizados dentro do useFrame — evitam ~3 alocações por frame por trajetória.
    const _tmpOrigin = useRef(new THREE.Vector3());
    const _tmpOneDl  = useRef(new THREE.Vector3());
    const _tmpFallback = useRef(new THREE.Vector3(0, 0, 0));

    useFrame(() => {
        // Verifica zoom out extremo.
        const orbitTarget = controls?.target ?? _tmpFallback.current;
        _tmpOrigin.current.copy(orbitTarget).project(camera);
        _tmpOneDl.current.copy(orbitTarget).setX(orbitTarget.x + 1).project(camera);
        const lunarPx = Math.hypot(
            (_tmpOneDl.current.x - _tmpOrigin.current.x) * size.width * 0.5,
            (_tmpOneDl.current.y - _tmpOrigin.current.y) * size.height * 0.5,
        );
        const allVisible = lunarPx >= TICK_HIDE_LUNAR_PX;
        // Reutiliza o mesmo array — só chama setVisible se o estado realmente mudou.
        let changed = false;
        for (let i = 0; i < ticks.length; i++) {
            if (visibleRef.current[i] !== allVisible) { changed = true; break; }
        }
        if (changed) {
            visibleRef.current = ticks.map(() => allVisible);
            setVisible(visibleRef.current.slice());
        }
    });

    return (
        <>
            {ticks.map((tick, i) => (
                <TimeTick
                    key={tick.label}
                    vec={tick.vec}
                    label={tick.label}
                    tooltip={tick.tooltip}
                    color={color}
                    visible={visible[i] ?? true}
                    onClick={onFocusPoint ? () => onFocusPoint(tick.vec) : undefined}
                />
            ))}
        </>
    );
}


export function ClosestApproachMarker({
    point,
    emphasized,
    showLabel = true,
}: {
    point: ClosestApproachSample;
    emphasized: boolean;
    showLabel?: boolean;
}) {
    return (
        <group position={point.vec}>
            {emphasized && showLabel ? (
                <FocusProtectedHtml position={[0, 0.09, 0]} center distanceFactor={5} zIndexRange={[8, 0]}>
                    {/* Apenas distância: identificação compacta. Timestamp e rótulo textual ficam no card. */}
                    <div className="pointer-events-none whitespace-nowrap rounded-md border border-white/10 bg-space-950/90 px-2 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur">
                        {point.distanceLD !== null ? `${point.distanceLD.toFixed(2)} DL` : '—'}
                        {' '}
                        <span className="font-normal text-white/55">· {compactKm(point.distanceKm)}</span>
                    </div>
                </FocusProtectedHtml>
            ) : null}
        </group>
    );
}
