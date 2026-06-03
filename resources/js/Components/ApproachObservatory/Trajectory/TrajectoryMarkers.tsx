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
import { formatTimestamp } from '@/lib/observatory/format';
import type { ClosestApproachSample } from '@/lib/observatory/trajectorySampling';
import { Html } from '@react-three/drei';
import { FocusProtectedHtml } from '../Overlays/SceneLabels';

/**
 * Contém marcadores visuais ligados à trajetória.
 *
 * Recebe pontos já resolvidos por outras camadas, sem calcular máxima
 * aproximação, decidir ranking ou corrigir fallback.
 */
// Limiar da órbita lunar em px abaixo do qual os ticks temporais somem (zoom out extremo ≈ Júpiter).
const TICK_HIDE_LUNAR_PX = 28;

function TimeTick({
    vec,
    label,
    color,
    zOrder,
    visible,
}: {
    vec: THREE.Vector3;
    label: string;
    color: string;
    zOrder: number;
    visible: boolean;
}) {
    const zTop = Math.max(6 - zOrder, 1);
    return (
        <group position={vec}>
            <mesh>
                <sphereGeometry args={[0.007, 8, 8]} />
                <meshBasicMaterial color={color} transparent opacity={visible ? (zOrder === 0 ? 0.45 : zOrder === 1 ? 0.3 : 0.2) : 0} />
            </mesh>
            {visible ? (
                <Html position={[0, 0.038, 0]} center zIndexRange={[zTop, 0]}>
                    <span
                        className="pointer-events-none select-none -translate-y-1/2 whitespace-nowrap rounded border border-white/10 bg-space-950/85 px-2 py-0.5 text-[13px] font-medium backdrop-blur"
                        style={{
                            color: `rgba(190, 210, 220, ${zOrder === 0 ? 0.65 : zOrder === 1 ? 0.45 : 0.32})`,
                            opacity: zOrder === 0 ? 1 : zOrder === 1 ? 0.85 : 0.7,
                        }}
                    >
                        {label}
                    </span>
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
}: {
    ticks: Array<{ vec: THREE.Vector3; label: string; zOrder: number }>;
    color: string;
}) {
    const { camera, size } = useThree();
    const controls = useThree((s) => s.controls) as unknown as Controls | null;
    const [visible, setVisible] = useState<boolean[]>(() => ticks.map(() => true));
    const visibleRef = useRef<boolean[]>(ticks.map(() => true));
    useFrame(() => {
        // Verifica zoom out extremo.
        const orbitTarget = controls?.target ?? new THREE.Vector3(0, 0, 0);
        const center = orbitTarget.clone().project(camera);
        const oneDl = orbitTarget.clone().add(new THREE.Vector3(1, 0, 0)).project(camera);
        const lunarPx = Math.hypot(
            (oneDl.x - center.x) * size.width * 0.5,
            (oneDl.y - center.y) * size.height * 0.5,
        );
        const allVisible = lunarPx >= TICK_HIDE_LUNAR_PX;
        const next = ticks.map(() => allVisible);
        if (next.some((v, i) => v !== visibleRef.current[i])) {
            visibleRef.current = next;
            setVisible(next);
        }

    });

    return (
        <>
            {ticks.map((tick, i) => (
                <TimeTick
                    key={tick.label}
                    vec={tick.vec}
                    label={tick.label}
                    color={color}
                    zOrder={tick.zOrder}
                    visible={visible[i] ?? true}
                />
            ))}
        </>
    );
}


export function ClosestApproachMarker({
    point,
    emphasized,
    locale,
    showLabel = true,
}: {
    point: ClosestApproachSample;
    emphasized: boolean;
    locale: 'pt-BR' | 'en';
    showLabel?: boolean;
}) {
    const en = locale === 'en';

    return (
        <group position={point.vec}>
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
