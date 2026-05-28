import { Link } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

type FloatingMissionCardProps = {
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
    className?: string;
};

export function FloatingMissionCard({ href, icon: Icon, title, description, className = '' }: FloatingMissionCardProps) {
    return (
        <Link
            href={href}
            className={`floating-mission-card glow-border group/card relative z-40 flex items-start gap-3 rounded-lg border border-white/12 bg-space-950/58 p-4 text-left shadow-glow backdrop-blur-xl transition duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-space-950 ${className}`}
        >
            <span className="flex size-10 shrink-0 items-center justify-center rounded bg-white/[0.08] text-signal-cyan transition duration-500 group-hover/card:bg-signal-cyan/15 group-hover/card:text-white">
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <span>
                <span className="block text-sm font-semibold text-white">{title}</span>
                <span className="mt-1 block text-xs leading-5 text-white/65">{description}</span>
            </span>
        </Link>
    );
}
