import { LucideIcon } from 'lucide-react';

type StatCardProps = {
    label: string;
    value: string;
    icon: LucideIcon;
    tone?: 'cyan' | 'mint' | 'amber' | 'coral';
};

const tones = {
    cyan: 'text-signal-cyan bg-signal-cyan/10',
    mint: 'text-signal-mint bg-signal-mint/10',
    amber: 'text-signal-amber bg-signal-amber/10',
    coral: 'text-signal-coral bg-signal-coral/10',
};

export function StatCard({ label, value, icon: Icon, tone = 'cyan' }: StatCardProps) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.045] p-5 shadow-glow backdrop-blur">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm text-white/60">{label}</p>
                    <p className="mt-2 break-words text-2xl font-semibold text-white">{value}</p>
                </div>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded ${tones[tone]}`}>
                    <Icon className="size-5" aria-hidden="true" />
                </span>
            </div>
        </div>
    );
}
