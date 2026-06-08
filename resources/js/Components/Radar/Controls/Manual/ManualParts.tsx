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
        <div className="flex items-start gap-3 rounded-xl border border-signal-cyan/20 bg-signal-cyan/[0.07] px-4 py-3.5">
            <Icon className="mt-0.5 size-5 shrink-0 text-signal-cyan" aria-hidden />
            <div>{children}</div>
        </div>
    );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
            {children}
        </section>
    );
}

export function TechSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
            {children}
        </section>
    );
}

export function HighlightBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-3 rounded-md border border-amber-300/15 bg-amber-300/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/70">
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
        <div className="flex items-center gap-2.5 rounded-md border border-white/10 bg-black/15 px-3 py-2">
            <span className="shrink-0 text-base leading-none" aria-hidden>{icon}</span>
            <span className="text-[13px] font-medium text-white/80">{label}</span>
            <span className="text-[12px] text-white/50">{desc}</span>
        </div>
    );
}

export function SwitchModeHint({ en, targetMode }: { en: boolean; targetMode: 'radar' | 'orbit' }) {
    const isRadar = targetMode === 'radar';
    return (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-[13px] font-semibold text-white/70">
                {en ? 'When to switch mode' : 'Quando trocar de modo'}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                {isRadar
                    ? (en
                        ? 'Switch back to radar when you want to know the real distance to Earth right now, check the approach direction, or read the km/LD/AU numbers.'
                        : 'Volte para o radar quando quiser saber a distância real da Terra agora, checar a direção da aproximação ou ler os números em km/DL/UA.')
                    : (en
                        ? "Switch to orbit mode when you want to see the full ellipse, compare the orbit shape with Earth's, or understand whether the orbit intersects Earth's path at all."
                        : 'Mude para o modo órbita quando quiser ver a elipse completa, comparar a forma da órbita com a da Terra ou entender se a órbita intersecta o caminho da Terra.')}
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
        <div className="mt-3 space-y-1.5">
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

export function FormulaPanel({ title, formulas, note }: { title: string; formulas: string[]; note: string }) {
    return (
        <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <div className="mt-3 space-y-0.5 rounded-md border border-signal-cyan/15 bg-signal-cyan/[0.055] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-cyan-100/90">
                {formulas.map((formula) => <div key={formula}>{formula}</div>)}
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
        ? (en ? 'Orbit curiosities' : 'Curiosidades sobre órbitas')
        : (en ? 'Curiosities — your questions answered' : 'Curiosidades — suas perguntas respondidas');
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
            <div className="space-y-3">
                {items.map((item) => (
                    <CuriosityItem key={item.q} question={item.q} answer={item.a} />
                ))}
            </div>
        </section>
    );
}

function CuriosityItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="overflow-hidden rounded-md border border-white/10 bg-black/15">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
            >
                <span className="text-[13px] leading-relaxed text-white/85 font-medium">{question}</span>
                <span className={['mt-0.5 shrink-0 text-white/40 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}>
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6l5 5 5-5" />
                    </svg>
                </span>
            </button>
            {open && (
                <div className="border-t border-white/10 px-3 pb-3 pt-2.5">
                    <p className="text-[13px] leading-relaxed text-white/65">{answer}</p>
                </div>
            )}
        </div>
    );
}
