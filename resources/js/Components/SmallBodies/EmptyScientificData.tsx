import { Telescope } from 'lucide-react';

export function EmptyScientificData({ title, message }: { title: string; message: string }) {
    return (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.035] p-6 text-center">
            <Telescope className="mx-auto size-8 text-white/45" aria-hidden="true" />
            <h3 className="mt-3 text-base font-semibold text-white">{title}</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/60">{message}</p>
        </div>
    );
}
