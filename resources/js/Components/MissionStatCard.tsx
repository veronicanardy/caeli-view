type MissionStatCardProps = {
    label: string;
    value: string;
    description: string;
};

export function MissionStatCard({ label, value, description }: MissionStatCardProps) {
    return (
        <div className="rounded-lg border border-white/10 bg-space-900/70 p-5 backdrop-blur">
            <p className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-sm leading-5 text-white/60">{description}</p>
        </div>
    );
}
