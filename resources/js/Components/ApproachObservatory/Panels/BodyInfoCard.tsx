import type { Ref } from 'react';
import { BODIES, type BodyId } from './bodyInfoContent';
import { PanelShell } from './PanelShell';

/**
 * Card informativo para corpos celestes de referência.
 *
 * Recebe dados estáticos já definidos para os corpos e apenas organiza a leitura
 * visual. Não calcula posição, órbita ou efeméride.
 */

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
            className="flex h-[24vh] max-h-[24vh] flex-col sm:h-auto sm:max-h-none w-[min(17rem,calc(100vw-6rem))] sm:w-[min(22rem,48%)]"
            mobileTopAlign={mobileTopAlign}
            panelRef={panelRef}
        >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain sm:overflow-visible">
                <div className="px-2.5 pb-2.5 pt-1.5 pr-1.5 sm:px-3 sm:pb-3 sm:pt-2 sm:pr-2">
                    <p className="text-[12px] leading-relaxed text-white/60 sm:text-[13px]">
                        {en ? cfg.contextEn : cfg.contextPt}
                    </p>

                    <dl className="mt-2 space-y-1 text-[12px] sm:mt-2.5 sm:text-[13px]">
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
