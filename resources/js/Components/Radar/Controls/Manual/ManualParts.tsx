/**
 * Blocos de construção reutilizáveis do manual do radar.
 *
 * Responsabilidade: fornecer seções, callouts, fórmulas, réguas e hints de
 * interação usados por FriendlyManual e TechnicalManual. Componentes puramente
 * visuais — não acessam estado da cena nem callbacks externos.
 */

import { useState } from 'react';
import { Orbit, Radar } from 'lucide-react';
import type { SceneMode } from './manualTypes';
import {
    EN_CURIOSITIES,
    EN_ORBIT_CURIOSITIES,
    PT_CURIOSITIES,
    PT_ORBIT_CURIOSITIES,
} from './manualCuriosities';

/**
 * Bloco de destaque usado para introduzir a leitura de cada modo.
 */
export function Callout({ icon, children }: { icon: 'radar' | 'orbit'; children: React.ReactNode }) {
    const Icon = icon === 'radar' ? Radar : Orbit;
    return (
        <div className="flex items-start gap-3 rounded-xl border border-signal-cyan/15 bg-signal-cyan/[0.04] px-4 py-3.5">
            <Icon className="mt-0.5 size-5 shrink-0 text-signal-cyan/80" aria-hidden />
            <div>{children}</div>
        </div>
    );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
            {children}
        </section>
    );
}

const TECH_TITLE = 'mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-white/50';

export function TechGroup({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h3 className={TECH_TITLE}>{title}</h3>
            {children}
        </section>
    );
}

export function TechSection({ title, children, prose = false }: { title: string; children: React.ReactNode; prose?: boolean }) {
    if (prose) {
        return (
            <section className="space-y-1">
                <h3 className={TECH_TITLE}>{title}</h3>
                <div className="border-l-2 border-white/[0.07] pl-4">
                    {children}
                </div>
            </section>
        );
    }
    return (
        <section className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
            <h3 className={TECH_TITLE}>{title}</h3>
            {children}
        </section>
    );
}

export function HighlightBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-3 rounded-md border border-signal-cyan/12 bg-signal-cyan/[0.04] px-3.5 py-3 text-[13px] leading-relaxed text-white/80">
            {children}
        </div>
    );
}

export function RulerRow({ label, color, value, desc }: { label: string; color: string; value: string; desc: string }) {
    return (
        <div className="flex gap-3 rounded-md border border-white/10 bg-black/15 px-3 py-2.5">
            <span className={`mt-0.5 shrink-0 font-mono text-sm font-bold ${color}`}>{label}</span>
            <div>
                <span className="text-[13px] font-medium text-white/80">{value}</span>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">{desc}</p>
            </div>
        </div>
    );
}

export function VisualKey({ color, shape, label, desc }: { color: string; shape?: 'cone' | 'dashed' | 'ring' | 'ellipse'; label: string; desc: string }) {
    return (
        <div className="flex items-start gap-2.5 rounded-md border border-white/10 bg-black/15 px-3 py-2">
            <span className="mt-1 shrink-0">
                {shape === 'dashed'
                    ? <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-slate-400/80" />
                    : shape === 'ring'
                        ? <span className={`inline-block size-3.5 rounded-full border-2 ${color.replace('bg-', 'border-')} bg-transparent`} />
                        : shape === 'ellipse'
                            ? <span className={`inline-block h-2.5 w-4 rounded-full border-2 ${color.replace('bg-', 'border-')} bg-transparent`} />
                            : shape === 'cone'
                                ? <span className="inline-block size-0 border-b-[10px] border-l-[5px] border-r-[5px] border-b-cyan-400 border-l-transparent border-r-transparent" />
                                : <span className={`inline-block size-3 rounded-full ${color}`} />}
            </span>
            <div>
                <span className="text-[13px] font-medium text-white/85">{label}</span>
                <p className="text-[12px] leading-relaxed text-white/60">{desc}</p>
            </div>
        </div>
    );
}

/**
 * Linha de observação narrativa — substitui VisualKey no guia amigável.
 * Título em destaque (pergunta / intenção), ícone visual à esquerda, descrição abaixo.
 */
export function ObservationRow({
    color,
    shape,
    title,
    desc,
}: {
    color: string;
    shape?: 'cone' | 'dashed' | 'ring' | 'ellipse' | 'moon' | 'planet';
    title: string;
    desc: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-3.5 py-3">
            <span className="mt-0.5 shrink-0">
                {shape === 'dashed'
                    ? (
                        <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.06]">
                            <span className="inline-block h-px w-5 border-t-2 border-dashed border-slate-400/80" />
                        </span>
                    )
                    : shape === 'cone'
                        ? (
                            <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.06]">
                                <span className="inline-block size-0 border-b-[9px] border-l-[4px] border-r-[4px] border-b-cyan-400 border-l-transparent border-r-transparent" />
                            </span>
                        )
                        : shape === 'ring'
                            ? (
                                <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.06]">
                                    <span className={`inline-block size-3.5 rounded-full border-2 ${color.replace('bg-', 'border-')} bg-transparent`} />
                                </span>
                            )
                            : shape === 'ellipse'
                                ? (
                                    <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.06]">
                                        <span className={`inline-block h-2.5 w-4 rounded-full border-2 ${color.replace('bg-', 'border-')} bg-transparent`} />
                                    </span>
                                )
                                : shape === 'moon'
                                    ? (
                                        <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.06] text-[15px] leading-none">
                                            🌙
                                        </span>
                                    )
                                    : shape === 'planet'
                                        ? (
                                            <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.06] text-[15px] leading-none">
                                                ✦
                                            </span>
                                        )
                                        : (
                                            <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.06]">
                                                <span className={`inline-block size-3 rounded-full ${color}`} />
                                            </span>
                                        )}
            </span>
            <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug text-white/90">{title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">{desc}</p>
            </div>
        </div>
    );
}

/**
 * Unidade de distância com cor de acento — versão mais visual que RulerRow.
 * Label monospace em destaque, valor secundário em linha, descrição abaixo.
 */
export function DistanceUnit({
    label,
    accent,
    value,
    desc,
}: {
    label: string;
    accent: string;
    value: string;
    desc: string;
}) {
    return (
        <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 px-3.5 py-3">
            <span className={`mt-0.5 shrink-0 font-mono text-base font-bold leading-none ${accent}`}>{label}</span>
            <div className="min-w-0">
                <p className="text-[13px] font-medium leading-snug text-white/80">{value}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">{desc}</p>
            </div>
        </div>
    );
}

export function ReadingStep({ label, text }: { label: string; text: string }) {
    return (
        <div className="rounded-md border border-white/10 bg-black/15 px-3 py-2.5">
            <p className="text-[13px] font-semibold text-white/85">{label}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/60">{text}</p>
        </div>
    );
}

export function InteractionHint({ icon, label, desc }: { icon: string; label: string; desc: string }) {
    return (
        <div className="flex items-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
            <span className="shrink-0 text-base leading-none" aria-hidden>{icon}</span>
            <div className="min-w-0">
                <span className="text-[13px] font-semibold text-white/85">{label}</span>
                <span className="ml-2 text-[12px] text-white/60">{desc}</span>
            </div>
        </div>
    );
}

export function SwitchModeHint({ en, targetMode }: { en: boolean; targetMode: 'radar' | 'orbit' }) {
    const isRadar = targetMode === 'radar';
    const Icon = isRadar ? Radar : Orbit;
    return (
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-signal-cyan">
                <Icon className="size-3.5" aria-hidden />
                {isRadar
                    ? (en ? 'Back to radar' : 'Voltar ao radar')
                    : (en ? 'Explore the full orbit' : 'Explorar a órbita completa')}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">
                {isRadar
                    ? (en
                        ? 'Switch to radar to see how close this object actually is to Earth right now, which direction it is heading, and km / LD / AU readings.'
                        : 'Mude para o radar para ver o quanto esse objeto está perto da Terra agora, para onde está indo e as leituras em km / DL / UA.')
                    : (en
                        ? "Switch to orbit mode to see the full ellipse at true proportional scale and understand whether this asteroid's path ever crosses Earth's."
                        : 'Mude para o modo órbita para ver a elipse completa em escala linear, proporcional ao sistema solar, e entender se o caminho deste asteroide cruza o da Terra.')}
            </p>
        </div>
    );
}

export function TechLegend({ items, en }: { items: { kind: 'observed' | 'calculated' | 'visual'; label: string }[]; en: boolean }) {
    const colors: Record<string, string> = {
        observed: 'bg-emerald-400/20 border-emerald-400/30 text-emerald-300',
        calculated: 'bg-sky-400/20 border-sky-400/30 text-sky-300',
        visual: 'bg-amber-400/20 border-amber-400/30 text-amber-300',
    };
    const tags = en
        ? { observed: 'received data', calculated: 'calculated', visual: 'visual choice' }
        : { observed: 'dado recebido', calculated: 'calculado', visual: 'escolha visual' };
    return (
        <div className="mt-4 space-y-1.5 border-t border-white/[0.06] pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/20">
                {en ? 'Legend' : 'Legenda'}
            </p>
            {items.map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${colors[item.kind]}`}>
                        {tags[item.kind]}
                    </span>
                    <span className="text-[12px] leading-relaxed text-white/60">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

export function TechInterpretItem({ label, text }: { label: string; text: string }) {
    return (
        <div className="rounded-md border border-white/10 bg-black/15 px-3 py-2.5">
            <p className="text-[13px] font-semibold text-white/85">{label}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/60">{text}</p>
        </div>
    );
}

type FormulaLine = { expr: string; comment?: { pt: string; en: string } };

export function FormulaPanel({ title, formulas, note, en }: { title: string; formulas: FormulaLine[]; note: string; en: boolean }) {
    return (
        <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className={TECH_TITLE}>{title}</h3>
            <div className="mt-3 space-y-1 rounded-md border border-signal-cyan/15 bg-signal-cyan/[0.055] px-3 py-2.5">
                {formulas.map(({ expr, comment }) => (
                    <div key={expr} className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-mono text-[13px] font-medium text-cyan-100">{expr}</span>
                        {comment && (
                            <span className="text-[11px] text-white/40">{en ? comment.en : comment.pt}</span>
                        )}
                    </div>
                ))}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/60">{note}</p>
        </section>
    );
}

/**
 * FAQ expansível do manual, separado por modo para manter o conteúdo organizado.
 */
export function CuriositiesSection({ en, mode }: { en: boolean; mode: SceneMode }) {
    const items = mode === 'orbit'
        ? (en ? EN_ORBIT_CURIOSITIES : PT_ORBIT_CURIOSITIES)
        : (en ? EN_CURIOSITIES : PT_CURIOSITIES);
    const title = mode === 'orbit'
        ? (en ? 'Want to go deeper?' : 'Quer ir mais fundo?')
        : (en ? 'Curious about what you see?' : 'Curioso sobre o que está vendo?');
    return (
        <section className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
            <h3 className="mb-4 text-sm font-semibold text-white/90">{title}</h3>
            <div className="divide-y divide-white/[0.06]">
                {items.map((item, i) => (
                    <CuriosityItem key={item.q} index={i} question={item.q} answer={item.a} />
                ))}
            </div>
        </section>
    );
}

function CuriosityItem({ index, question, answer }: { index: number; question: string; answer: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const num = String(index + 1).padStart(2, '0');
    return (
        <div className={['py-0.5', open ? 'pb-2' : ''].join(' ')}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="group flex w-full items-start gap-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan rounded"
            >
                <span className="mt-0.5 shrink-0 font-mono text-[11px] font-bold leading-none text-white/20 group-hover:text-signal-cyan/50 transition-colors duration-150 select-none">
                    {num}
                </span>
                <span className="flex-1 text-[13px] leading-relaxed text-white/70 font-medium group-hover:text-white/90 transition-colors duration-150">
                    {question}
                </span>
                <span className={['mt-1 shrink-0 text-white/25 transition-transform duration-200 group-hover:text-white/50', open ? 'rotate-180' : ''].join(' ')}>
                    <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M3 6l5 5 5-5" />
                    </svg>
                </span>
            </button>
            {open && (
                <div className="ml-7 pb-2 pt-0.5 text-[13px] leading-relaxed text-white/60 space-y-2">
                    {answer}
                </div>
            )}
        </div>
    );
}
