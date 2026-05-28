type SectionTitleProps = {
    eyebrow?: string;
    title: string;
    description?: string;
};

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
    return (
        <div className="max-w-3xl">
            {eyebrow ? <p className="text-sm font-medium uppercase tracking-wide text-signal-cyan">{eyebrow}</p> : null}
            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
            {description ? <p className="mt-3 text-sm leading-6 text-white/[0.65]">{description}</p> : null}
        </div>
    );
}
