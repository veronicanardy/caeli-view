/**
 * Card informativo para corpos celestes de referência.
 *
 * Responsabilidade: organizar textos e fatos estáticos definidos em
 * `bodyInfoContent`, sem calcular posição, órbita ou efeméride.
 */

import { useEffect, useLayoutEffect, useRef, useState, type Ref } from 'react';
import { BODIES, type BodyId } from './bodyInfoContent';
import { PanelShell } from './PanelShell';

interface BodyInfoCardProps {
    body: BodyId;
    onClose: () => void;
    locale: 'pt-BR' | 'en';
    mobileTopAlign?: boolean;
    panelRef?: Ref<HTMLDivElement>;
}

export function BodyInfoCard({ body, onClose, locale, mobileTopAlign, panelRef }: BodyInfoCardProps) {
    const en = locale === 'en';
    const cfg = BODIES[body];

    // Slide+fade de entrada ao montar — mesmo padrão do FocusCard.
    const [mounted, setMounted] = useState(false);
    useLayoutEffect(() => { setMounted(false); }, []);
    useEffect(() => {
        const t = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(t);
    }, []);

    // Fade sutil ao trocar de corpo sem desmontar.
    const [contentVisible, setContentVisible] = useState(true);
    const prevBody = useRef(body);
    useEffect(() => {
        if (prevBody.current === body) return;
        prevBody.current = body;
        setContentVisible(false);
        const t = setTimeout(() => setContentVisible(true), 80);
        return () => clearTimeout(t);
    }, [body]);

    const val = (raw: string) => {
        const parts = raw.split(' / ');
        return en ? (parts[1] ?? parts[0]) : parts[0];
    };

    const enterStyle = {
        transition: 'opacity 0.18s ease, transform 0.22s cubic-bezier(0.25,0.46,0.45,0.94)',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
    };

    return (
        <PanelShell
            onClose={onClose}
            closeLabel={en ? 'Close' : 'Fechar'}
            eyebrow={en ? cfg.subtitleEn : cfg.subtitlePt}
            title={en ? cfg.nameEn : cfg.namePt}
            dotColor={cfg.dotColor}
            borderClass="border-white/15"
            className="flex h-[28vh] max-h-[28vh] flex-col lg:h-auto lg:max-h-none w-[min(17rem,calc(100vw-6rem))] lg:w-[min(22rem,48%)] lg:top-[40%]"
            style={enterStyle}
            mobileTopAlign={mobileTopAlign}
            panelRef={panelRef}
        >
            <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:overflow-visible"
                style={{ transition: 'opacity 0.12s ease', opacity: contentVisible ? 1 : 0 }}
            >
                <div className="px-3 pb-3 pt-2 lg:px-5 lg:pb-4 lg:pt-3">
                    <p className="text-[12px] leading-relaxed text-white/50 lg:text-[13px]">
                        {en ? cfg.contextEn : cfg.contextPt}
                    </p>

                    <dl className="mt-3 space-y-2 lg:mt-4">
                        {cfg.facts.map((fact) => (
                            <div key={fact.labelEn} className="flex items-baseline justify-between gap-4">
                                <dt className="shrink-0 text-[11px] uppercase tracking-wide text-white/40">
                                    {en ? fact.labelEn : fact.labelPt}
                                </dt>
                                <dd className="text-right text-[13px] font-semibold text-white">
                                    {val(fact.value)}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </PanelShell>
    );
}
