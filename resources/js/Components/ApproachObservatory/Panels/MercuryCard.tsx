interface MercuryCardProps {
    onClose: () => void;
    locale: 'pt-BR' | 'en';
}

const MERCURY_FACTS = {
    distanceSun:   { pt: '57,9 milhões km (0,387 UA)',   en: '57.9 million km (0.387 AU)' },
    diameter:      { pt: '4.880 km (38% da Terra)',       en: '4,880 km (38% of Earth)' },
    orbitalPeriod: { pt: '88 dias terrestres',             en: '88 Earth days' },
    rotationPeriod:{ pt: '58,6 dias terrestres',           en: '58.6 Earth days' },
    temperature:   { pt: '−180 °C a +430 °C',             en: '−180 °C to +430 °C' },
    moons:         { pt: 'Nenhum',                         en: 'None' },
} as const;

export function MercuryCard({ onClose, locale }: MercuryCardProps) {
    const en = locale === 'en';

    return (
        <div className="pointer-events-auto absolute left-3 top-[66%] z-20 h-[19rem] w-[min(22rem,48%)] -translate-y-1/2 overflow-hidden rounded-xl border border-white/15 bg-space-950/92 shadow-glow backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-3 pt-3">
                <div>
                    <div className="text-[11px] uppercase tracking-wide text-white/45">
                        {en ? 'Solar system · Inner planet' : 'Sistema solar · Planeta interno'}
                    </div>
                    <div className="mt-0.5 text-base font-semibold text-white">
                        {en ? 'Mercury' : 'Mercúrio'}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="-mr-1 -mt-1 rounded-full p-1 text-white/55 transition outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                    aria-label={en ? 'Close' : 'Fechar'}
                >
                    ×
                </button>
            </div>

            {/* Context note */}
            <div className="mt-2 px-3">
                <p className="text-[12px] leading-relaxed text-white/55">
                    {en
                        ? 'The smallest and innermost planet. Shown here for spatial context — not the focus of CaeliView.'
                        : 'O menor e mais interno dos planetas. Exibido como contexto espacial — não é o foco do CaeliView.'}
                </p>
            </div>

            {/* Facts */}
            <dl className="mt-2.5 space-y-1 px-3 pb-3 text-[12px]">
                <Row label={en ? 'Distance from Sun' : 'Distância do Sol'}>{en ? MERCURY_FACTS.distanceSun.en : MERCURY_FACTS.distanceSun.pt}</Row>
                <Row label={en ? 'Diameter' : 'Diâmetro'}>{en ? MERCURY_FACTS.diameter.en : MERCURY_FACTS.diameter.pt}</Row>
                <Row label={en ? 'Orbital period' : 'Período orbital'}>{en ? MERCURY_FACTS.orbitalPeriod.en : MERCURY_FACTS.orbitalPeriod.pt}</Row>
                <Row label={en ? 'Rotation period' : 'Período de rotação'}>{en ? MERCURY_FACTS.rotationPeriod.en : MERCURY_FACTS.rotationPeriod.pt}</Row>
                <Row label={en ? 'Temperature range' : 'Variação de temperatura'}>{en ? MERCURY_FACTS.temperature.en : MERCURY_FACTS.temperature.pt}</Row>
                <Row label={en ? 'Natural satellites' : 'Satélites naturais'}>{en ? MERCURY_FACTS.moons.en : MERCURY_FACTS.moons.pt}</Row>
            </dl>
        </div>
    );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="text-white/45">{label}</dt>
            <dd className="text-right font-medium text-white/80">{children}</dd>
        </div>
    );
}
