import { PropsWithChildren } from 'react';

export function SpaceBackground({ children }: PropsWithChildren) {
    return (
        <div className="relative isolate overflow-hidden bg-space-950">
            <div className="pointer-events-none absolute inset-0 star-field opacity-45" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0 space-grid opacity-[0.14]" aria-hidden="true" />
            <div className="pointer-events-none absolute left-[-10rem] top-[-12rem] size-[34rem] rounded-full bg-signal-cyan/10 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute bottom-[-16rem] right-[-12rem] size-[38rem] rounded-full bg-signal-amber/10 blur-3xl" aria-hidden="true" />
            <div className="relative z-10">{children}</div>
        </div>
    );
}
