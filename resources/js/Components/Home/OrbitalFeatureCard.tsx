import { Link } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

type OrbitalFeatureCardProps = {
    href?: string;
    icon: LucideIcon;
    title: string;
    description: string;
    tone?: 'cyan' | 'mint' | 'amber' | 'violet';
    className?: string;
};

const tones = {
    cyan: 'text-signal-cyan from-signal-cyan/20',
    mint: 'text-signal-mint from-signal-mint/20',
    amber: 'text-signal-amber from-signal-amber/20',
    violet: 'text-[#c4b5fd] from-[#a78bfa]/20',
};

export function OrbitalFeatureCard({ href, icon: Icon, title, description, tone = 'cyan', className = '' }: OrbitalFeatureCardProps) {
    const content = (
        <>
            <span className={`flex size-10 shrink-0 items-center justify-center rounded bg-gradient-to-br ${tones[tone]} to-white/[0.04]`}>
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <span>
                <span className="block text-sm font-semibold text-white">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-white/65">{description}</span>
            </span>
        </>
    );

    const classes = `floating-card glow-border hover-lift subtle-tilt group flex w-full max-w-[17rem] items-start gap-3 rounded-lg border border-white/12 bg-space-900/72 p-4 text-left shadow-glow backdrop-blur-xl transition duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-space-950 ${className}`;

    if (href) {
        return (
            <Link href={href} className={classes}>
                {content}
            </Link>
        );
    }

    return <div className={classes}>{content}</div>;
}
