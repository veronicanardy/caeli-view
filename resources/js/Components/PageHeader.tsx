import { ReactNode } from 'react';

type PageHeaderProps = {
    eyebrow?: string;
    title: string;
    description: string;
    actions?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
    return (
        <section className="relative overflow-hidden border-b border-white/10 bg-white/[0.02]">
            <div className="pointer-events-none absolute inset-0 space-grid opacity-25" aria-hidden="true" />
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
                <div className="max-w-3xl">
                    {eyebrow ? <p className="mb-3 text-sm font-medium uppercase tracking-wide text-signal-cyan">{eyebrow}</p> : null}
                    <h1 className="text-3xl font-semibold text-white sm:text-5xl">{title}</h1>
                    <p className="mt-4 text-base leading-7 text-white/70">{description}</p>
                </div>
                {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
            </div>
        </section>
    );
}
