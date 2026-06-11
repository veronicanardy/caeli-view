/**
 * Sonda de performance dev-only da cena 3D do radar.
 *
 * Responsabilidade: medir e exibir, sem participar do ciclo React, os sinais
 * necessários para diagnosticar micro-travadas: FPS, tempo de frame, frames
 * acima de 16/33 ms, long tasks, heap JS, draw calls, triângulos, geometrias,
 * texturas, programas e contagem de labels DOM. Inclui um botão de A/B que
 * oculta todos os overlays HTML da cena para isolar o custo de composição
 * dos labels (backdrop-blur) durante a rotação.
 *
 * Ativação: apenas em build de desenvolvimento E com `?perf` na URL.
 * Remoção: apagar esta pasta e a linha de montagem no RadarSceneCanvas.
 *
 * O overlay é um elemento DOM criado imperativamente e atualizado por
 * textContent 2x por segundo — zero re-renders React, zero backdrop-filter,
 * para que a própria sonda não contamine a medição.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';

/** Janela de agregação das métricas, em ms. */
const REPORT_INTERVAL_MS = 500;

export function isPerfProbeEnabled(): boolean {
    return import.meta.env.DEV && typeof window !== 'undefined'
        && new URLSearchParams(window.location.search).has('perf');
}

type FrameStats = {
    frames: number;
    worstMs: number;
    over16: number;
    over33: number;
    lastFrameAt: number;
};

/**
 * Divs de label criadas pelo drei <Html>: filhos diretos do host com position:absolute
 * definido INLINE (o drei seta via el.style; classes Tailwind não contam aqui).
 */
function labelDivsOf(host: HTMLElement): HTMLDivElement[] {
    return Array.from(host.children).filter(
        (el): el is HTMLDivElement => el instanceof HTMLDivElement && el.style.position === 'absolute',
    );
}

/**
 * Sobe a partir do canvas até achar o elemento onde o drei portala os overlays <Html>.
 * A estrutura de wrappers do R3F varia entre versões, então é localizado em runtime.
 */
function findLabelHost(canvas: HTMLCanvasElement): HTMLElement | null {
    let node: HTMLElement | null = canvas.parentElement;
    while (node && node !== document.body) {
        if (labelDivsOf(node).length > 0) return node;
        node = node.parentElement;
    }
    return null;
}

export function PerfProbe() {
    const gl = useThree((s) => s.gl);

    const stats = useRef<FrameStats>({ frames: 0, worstMs: 0, over16: 0, over33: 0, lastFrameAt: 0 });
    const longTasks = useRef({ count: 0, worstMs: 0 });
    const overlayRef = useRef<HTMLDivElement | null>(null);
    const labelsHidden = useRef(false);

    // Overlay DOM + observer de long tasks + relatório periódico.
    useEffect(() => {
        if (!isPerfProbeEnabled()) return;

        const overlay = document.createElement('div');
        overlay.style.cssText = [
            'position:fixed', 'left:8px', 'bottom:8px', 'z-index:9999',
            'background:rgba(3,6,13,0.92)', 'color:#9fe8ff', 'border:1px solid rgba(255,255,255,0.15)',
            'font:11px/1.5 ui-monospace,monospace', 'padding:8px 10px', 'border-radius:8px',
            'pointer-events:auto', 'white-space:pre', 'user-select:none',
        ].join(';');

        const text = document.createElement('div');
        overlay.appendChild(text);

        // Botão de A/B: oculta todos os overlays HTML portalados ao lado do canvas
        // (labels drei <Html>). Se as travadas sumirem com labels ocultos, o custo
        // dominante é composição/estilo do DOM, não a cena WebGL.
        // O host real dos portais varia com a versão do R3F, então é resolvido em
        // runtime (e re-resolvido a cada uso, pois labels podem montar tarde).
        const toggle = document.createElement('button');
        toggle.textContent = 'labels: on';
        toggle.style.cssText = 'margin-top:6px;padding:2px 8px;border:1px solid rgba(255,255,255,0.25);border-radius:6px;background:transparent;color:#9fe8ff;cursor:pointer;font:inherit';
        const styleTag = document.createElement('style');
        styleTag.textContent = '.perf-hide-labels > div[style*="absolute"] { visibility: hidden !important; }';
        document.head.appendChild(styleTag);
        let labelHost: HTMLElement | null = null;
        const resolveLabelHost = (): HTMLElement | null => {
            if (!labelHost || !labelHost.isConnected) labelHost = findLabelHost(gl.domElement);
            return labelHost;
        };
        toggle.onclick = () => {
            labelsHidden.current = !labelsHidden.current;
            toggle.textContent = labelsHidden.current ? 'labels: OFF' : 'labels: on';
            resolveLabelHost()?.classList.toggle('perf-hide-labels', labelsHidden.current);
        };
        overlay.appendChild(toggle);

        document.body.appendChild(overlay);
        overlayRef.current = text as HTMLDivElement;

        let longTaskObserver: PerformanceObserver | null = null;
        try {
            longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    longTasks.current.count += 1;
                    longTasks.current.worstMs = Math.max(longTasks.current.worstMs, entry.duration);
                }
            });
            longTaskObserver.observe({ entryTypes: ['longtask'] });
        } catch {
            // longtask não suportado neste navegador — segue sem essa métrica.
        }

        const report = window.setInterval(() => {
            const s = stats.current;
            const lt = longTasks.current;
            const seconds = REPORT_INTERVAL_MS / 1000;
            const fps = Math.round(s.frames / seconds);
            const info = gl.info;
            const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
            const heapMb = memory ? (memory.usedJSHeapSize / 1048576).toFixed(0) : '—';
            const host = resolveLabelHost();
            const labelCount = host ? labelDivsOf(host).length : 0;

            if (overlayRef.current) {
                overlayRef.current.textContent = [
                    `fps ${fps}  pior ${s.worstMs.toFixed(1)}ms`,
                    `>16ms ${s.over16}  >33ms ${s.over33}  (janela ${REPORT_INTERVAL_MS}ms)`,
                    `longtask ${lt.count}x  pior ${lt.worstMs.toFixed(0)}ms`,
                    `draw ${info.render.calls}  tri ${(info.render.triangles / 1000).toFixed(0)}k`,
                    `geo ${info.memory.geometries}  tex ${info.memory.textures}  prog ${info.programs?.length ?? 0}`,
                    `heap ${heapMb}MB  labels DOM ${labelCount}`,
                ].join('\n');
            }

            stats.current = { frames: 0, worstMs: 0, over16: 0, over33: 0, lastFrameAt: s.lastFrameAt };
            longTasks.current = { count: 0, worstMs: 0 };
        }, REPORT_INTERVAL_MS);

        return () => {
            window.clearInterval(report);
            longTaskObserver?.disconnect();
            overlay.remove();
            styleTag.remove();
            labelHost?.classList.remove('perf-hide-labels');
        };
    }, [gl]);

    useFrame(() => {
        const s = stats.current;
        const now = performance.now();
        if (s.lastFrameAt > 0) {
            const dt = now - s.lastFrameAt;
            s.frames += 1;
            if (dt > s.worstMs) s.worstMs = dt;
            if (dt > 16.7) s.over16 += 1;
            if (dt > 33.4) s.over33 += 1;
        }
        s.lastFrameAt = now;
    });

    return null;
}
