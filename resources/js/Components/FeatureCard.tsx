import { LucideIcon } from 'lucide-react';

type FeatureCardProps = {
    icon: LucideIcon;
    title: string;
    description: string;
    tone?: 'cyan' | 'mint' | 'amber' | 'violet';
};

const tones = {
    cyan: 'from-signal-cyan/25 text-signal-cyan',
    mint: 'from-signal-mint/25 text-signal-mint',
    amber: 'from-signal-amber/25 text-signal-amber',
    violet: 'from-[#a78bfa]/25 text-[#c4b5fd]',
};

export function FeatureCard({ icon: Icon, title, description, tone = 'cyan' }: FeatureCardProps) {
    return (
        <article className="group relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.045] p-6 shadow-glow backdrop-blur transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]">
            <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${tones[tone]} to-transparent`} aria-hidden="true" />
            <span className={`inline-flex size-11 items-center justify-center rounded bg-gradient-to-br ${tones[tone]} to-white/[0.03]`}>
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-white/[0.65]">{description}</p>
        </article>
    );
}
