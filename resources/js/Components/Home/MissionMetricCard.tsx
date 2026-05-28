import { LucideIcon } from 'lucide-react';

type MissionMetricCardProps = {
    icon: LucideIcon;
    label: string;
    value: string;
    description: string;
    tone?: 'cyan' | 'mint' | 'amber';
};

const tones = {
    cyan: 'text-signal-cyan bg-signal-cyan/10 border-signal-cyan/20',
    mint: 'text-signal-mint bg-signal-mint/10 border-signal-mint/20',
    amber: 'text-signal-amber bg-signal-amber/10 border-signal-amber/20',
};

export function MissionMetricCard({ icon: Icon, label, value, description, tone = 'cyan' }: MissionMetricCardProps) {
    return (
        <article className="hover-lift rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow backdrop-blur transition duration-300">
            <div className={`inline-flex size-10 items-center justify-center rounded border ${tones[tone]}`}>
                <Icon className="size-5" aria-hidden="true" />
            </div>
            <p className="mt-5 text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-sm leading-6 text-white/62">{description}</p>
        </article>
    );
}
