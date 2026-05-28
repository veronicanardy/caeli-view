import { PropsWithChildren } from 'react';

export function SpaceBackground({ children }: PropsWithChildren) {
    return (
        <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 space-grid opacity-45" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0 star-field opacity-35" aria-hidden="true" />
            <div className="pointer-events-none absolute -left-32 top-10 size-96 rounded-full bg-signal-cyan/15 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-40 top-36 size-[30rem] rounded-full bg-[#8b5cf6]/15 blur-3xl" aria-hidden="true" />
            <div className="relative">{children}</div>
        </div>
    );
}
