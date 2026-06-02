/**
 * Card informativo para corpos celestes de referência.
 *
 * Responsabilidade: organizar textos e fatos estáticos definidos em
 * `bodyInfoContent`, sem calcular posição, órbita ou efeméride.
 */

import type { Ref } from 'react';
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

    const val = (raw: string) => {
        const parts = raw.split(' / ');
        return en ? (parts[1] ?? parts[0]) : parts[0];
    };

    return (
        <PanelShell
            onClose={onClose}
            closeLabel={en ? 'Close' : 'Fechar'}
            eyebrow={en ? cfg.subtitleEn : cfg.subtitlePt}
            title={en ? cfg.nameEn : cfg.namePt}
            dotColor={cfg.dotColor}
            className="flex h-[24vh] max-h-[24vh] flex-col lg:h-auto lg:max-h-none w-[min(17rem,calc(100vw-6rem))] lg:w-[min(22rem,48%)]"
            mobileTopAlign={mobileTopAlign}
            panelRef={panelRef}
        >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:overflow-visible">
                <div className="px-2.5 pb-2.5 pt-1.5 pr-1.5 lg:px-3 lg:pb-3 lg:pt-2 lg:pr-2">
                    <p className="text-[12px] leading-relaxed text-white/60 lg:text-[13px]">
                        {en ? cfg.contextEn : cfg.contextPt}
                    </p>

                    <dl className="mt-2 space-y-1 text-[12px] lg:mt-2.5 lg:text-[13px]">
                        {cfg.facts.map((fact) => (
                            <div key={fact.labelEn} className="flex items-baseline justify-between gap-3">
                                <dt className="shrink-0 text-white/45">{en ? fact.labelEn : fact.labelPt}</dt>
                                <dd className="text-right font-medium text-white/80">{val(fact.value)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </PanelShell>
    );
}
