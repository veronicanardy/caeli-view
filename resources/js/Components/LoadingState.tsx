export function LoadingState({ label = 'Sintonizando dados da NASA...' }: { label?: string }) {
    return (
        <div className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/70">
            <span className="size-3 animate-pulse rounded-full bg-signal-cyan" />
            {label}
        </div>
    );
}
