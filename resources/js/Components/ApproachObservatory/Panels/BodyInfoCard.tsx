/**
 * Card informativo para corpos celestes de referência (Terra, Lua, Mercúrio…).
 *
 * Design: mesmo container do FocusCard — altura fixa, posição consistente.
 * Conteúdo: dados físicos básicos + contexto de papel no Caeli.
 * Não substitui o FocusCard de asteroides — coexistem em slots diferentes.
 */

interface BodyFact {
    labelPt: string;
    labelEn: string;
    value: string;
}

interface BodyConfig {
    namePt: string;
    nameEn: string;
    subtitlePt: string;
    subtitleEn: string;
    contextPt: string;
    contextEn: string;
    dotColor: string;
    facts: BodyFact[];
}

const BODIES: Record<'earth' | 'moon' | 'mercury' | 'venus' | 'mars', BodyConfig> = {
    earth: {
        namePt: 'Terra',
        nameEn: 'Earth',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'A nossa casa! E o centro de referência desse radar. Todas as distâncias de asteroides são medidas a partir daqui.',
        contextEn: 'The radar\'s reference center. All asteroid distances are measured from here.',
        dotColor: '#4a9eff',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '149,6 milhões km (1 UA) / 149.6 million km (1 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '12.742 km' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '365,25 dias / 365.25 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '24 horas / 24 hours' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: '1 Lua / Moon' },
        ],
    },
    moon: {
        namePt: 'Lua',
        nameEn: 'Moon',
        subtitlePt: 'Satélite natural da Terra',
        subtitleEn: 'Earth\'s natural satellite',
        contextPt: 'Satélite natural da Terra e marco visual de 1 DL no radar. Sua órbita ajuda a dimensionar rapidamente o espaço ao redor da Terra e a perceber quando um objeto está realmente próximo em escala astronômica.',
        contextEn: 'Earth\'s natural satellite and the radar\'s 1 LD benchmark. Its orbit helps quickly size the space around Earth and grasp when an object is truly close in astronomical terms.',
        dotColor: '#c2c4c8',
        facts: [
            { labelPt: 'Distância da Terra',  labelEn: 'Distance from Earth',  value: '~384.400 km (1 DL)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '3.474 km (27% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '27,3 dias / 27.3 days' },
            { labelPt: 'Rotação',             labelEn: 'Rotation',             value: 'Síncrona (face travada / tidally locked)' },
            { labelPt: 'Fases',               labelEn: 'Phases',               value: 'Ciclo de 29,5 dias / 29.5-day cycle' },
        ],
    },
    mercury: {
        namePt: 'Mercúrio',
        nameEn: 'Mercury',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'Menor planeta do Sistema Solar e o mais próximo do Sol. Exibido como contexto espacial — não é o foco do CaeliView. Posição em tempo real via JPL.',
        contextEn: 'The smallest planet in the Solar System and the closest to the Sun. Shown for spatial context — not CaeliView\'s focus. Real-time position via JPL.',
        dotColor: '#b0b8c8',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '57,9 mi km (0,387 UA) / 57.9M km (0.387 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '4.880 km (38% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '88 dias / 88 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '58,6 dias / 58.6 days' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: 'Nenhum / None' },
        ],
    },
    venus: {
        namePt: 'Vênus',
        nameEn: 'Venus',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'Segundo planeta mais próximo do Sol e o mais brilhante no céu noturno da Terra. Coberto por nuvens densas de CO₂. Exibido como contexto espacial — não é o foco do CaeliView. Posição em tempo real via JPL.',
        contextEn: 'Second closest planet to the Sun and the brightest object in the Earth\'s night sky. Covered in thick CO₂ clouds. Shown for spatial context — not CaeliView\'s focus. Real-time position via JPL.',
        dotColor: '#c8b870',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '108,2 mi km (0,723 UA) / 108.2M km (0.723 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '12.104 km (95% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '224,7 dias / 224.7 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '243 dias (retrógrado) / 243 days (retrograde)' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: 'Nenhum / None' },
        ],
    },
    mars: {
        namePt: 'Marte',
        nameEn: 'Mars',
        subtitlePt: 'Planeta · Sistema Solar Interno',
        subtitleEn: 'Planet · Inner Solar System',
        contextPt: 'Quarto planeta mais próximo do Sol e planeta o mais avermelhado no céu noturno da Terra. Exibido como contexto espacial — não é o foco do CaeliView. Posição em tempo real via JPL.',
        contextEn: 'Fourth closest planet to the Sun and the reddest planet in the Earth\'s night sky. Shown for spatial context — not CaeliView\'s focus. Real-time position via JPL.',
        dotColor: '#c87070',
        facts: [
            { labelPt: 'Distância do Sol',    labelEn: 'Distance from Sun',    value: '227,9 mi km (1,524 UA) / 227.9M km (1.524 AU)' },
            { labelPt: 'Diâmetro',            labelEn: 'Diameter',             value: '6.779 km (53% da Terra)' },
            { labelPt: 'Período orbital',     labelEn: 'Orbital period',       value: '687 dias / 687 days' },
            { labelPt: 'Período de rotação',  labelEn: 'Rotation period',      value: '24,6 horas / 24.6 hours' },
            { labelPt: 'Satélites naturais',  labelEn: 'Natural satellites',   value: 'Dois / Two' },
        ],
    }
};

interface BodyInfoCardProps {
    body: 'earth' | 'moon' | 'mercury' | 'venus' | 'mars';
    onClose: () => void;
    locale: 'pt-BR' | 'en';
}

export function BodyInfoCard({ body, onClose, locale }: BodyInfoCardProps) {
    const en = locale === 'en';
    const cfg = BODIES[body];

    // Split bilingual values at " / " for clean display
    const val = (raw: string) => {
        const parts = raw.split(' / ');
        return en ? (parts[1] ?? parts[0]) : parts[0];
    };

    return (
        <div className="pointer-events-auto absolute left-3 top-[66%] z-20 h-[19rem] w-[min(22rem,48%)] -translate-y-1/2 overflow-hidden rounded-xl border border-white/15 bg-space-950/92 shadow-glow backdrop-blur-xl">

            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-3 pt-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-block size-2.5 rounded-full ring-1 ring-white/20"
                            style={{ backgroundColor: cfg.dotColor }}
                        />
                        <div className="text-[11px] uppercase tracking-wide text-white/45">
                            {en ? cfg.subtitleEn : cfg.subtitlePt}
                        </div>
                    </div>
                    <div className="mt-0.5 text-base font-semibold text-white">
                        {en ? cfg.nameEn : cfg.namePt}
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
                <p className="text-[13px] leading-relaxed text-white/55">
                    {en ? cfg.contextEn : cfg.contextPt}
                </p>
            </div>

            {/* Facts */}
            <dl className="mt-2.5 space-y-1 px-3 pb-3 text-[13px]">
                {cfg.facts.map((f) => (
                    <div key={f.labelEn} className="flex items-baseline justify-between gap-3">
                        <dt className="shrink-0 text-white/45">{en ? f.labelEn : f.labelPt}</dt>
                        <dd className="text-right font-medium text-white/80">{val(f.value)}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}
