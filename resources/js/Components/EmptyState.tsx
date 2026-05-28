import { SearchX } from 'lucide-react';

type EmptyStateProps = {
    title: string;
    message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
    return (
        <div className="rounded-lg border border-white/10 bg-white/[0.035] px-6 py-12 text-center shadow-glow">
            <SearchX className="mx-auto size-10 text-signal-cyan/80" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold text-white">{title}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-white/60">{message}</p>
        </div>
    );
}
