import { useEffect, useRef, useState } from 'react';
import { BookOpen, Calculator, GripHorizontal, Orbit, Radar, X } from 'lucide-react';
import { KM_PER_AU } from '@/lib/sceneEphemeris';

export type SceneMode = 'radar' | 'orbit';

type ManualTab = 'guide' | 'technical';

const MANUAL_MIN_WIDTH = 360;
const MANUAL_MIN_HEIGHT = 320;
const MANUAL_MARGIN = 12;

function clampManualBox(
    x: number,
    y: number,
    width: number,
    height: number,
): { x: number; y: number; width: number; height: number } {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.max(MANUAL_MIN_WIDTH, Math.min(width, vw - MANUAL_MARGIN * 2));
    const h = Math.max(MANUAL_MIN_HEIGHT, Math.min(height, vh - MANUAL_MARGIN * 2));
    const cx = Math.max(MANUAL_MARGIN, Math.min(x, vw - w - MANUAL_MARGIN));
    const cy = Math.max(MANUAL_MARGIN, Math.min(y, vh - h - MANUAL_MARGIN));
    return { x: cx, y: cy, width: w, height: h };
}

export function MapManualModal({
    mode,
    locale,
    lunarDistanceKm,
    onClose,
}: {
    mode: SceneMode;
    locale: 'pt-BR' | 'en';
    lunarDistanceKm: number;
    onClose: () => void;
}) {
    const en = locale === 'en';
    const [tab, setTab] = useState<ManualTab>('guide');

    const [box, setBox] = useState(() => {
        const vw = typeof window === 'undefined' ? 1280 : window.innerWidth;
        const vh = typeof window === 'undefined' ? 800 : window.innerHeight;
        const width = Math.min(1024, vw - MANUAL_MARGIN * 2);
        const height = Math.min(Math.round(vh * 0.92), vh - MANUAL_MARGIN * 2);
        return clampManualBox((vw - width) / 2, (vh - height) / 2, width, height);
    });

    const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
    const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => { document.removeEventListener('keydown', onKeyDown); };
    }, [onClose]);

    useEffect(() => {
        const onResize = () => { setBox((b) => clampManualBox(b.x, b.y, b.width, b.height)); };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (!dragging && !resizing) return;
        const onMove = (event: PointerEvent) => {
            if (dragging && dragRef.current) {
                setBox((b) => clampManualBox(event.clientX - dragRef.current!.offsetX, event.clientY - dragRef.current!.offsetY, b.width, b.height));
            } else if (resizing && resizeRef.current) {
                const dx = event.clientX - resizeRef.current.startX;
                const dy = event.clientY - resizeRef.current.startY;
                setBox((b) => clampManualBox(b.x, b.y, resizeRef.current!.startWidth + dx, resizeRef.current!.startHeight + dy));
            }
        };
        const onUp = () => {
            dragRef.current = null;
            resizeRef.current = null;
            setDragging(false);
            setResizing(false);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
    }, [dragging, resizing]);

    const startDrag = (event: React.PointerEvent<HTMLElement>) => {
        if (event.button !== 0) return;
        if ((event.target as HTMLElement).closest('button')) return;
        dragRef.current = { offsetX: event.clientX - box.x, offsetY: event.clientY - box.y };
        setDragging(true);
    };

    const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        resizeRef.current = { startX: event.clientX, startY: event.clientY, startWidth: box.width, startHeight: box.height };
        setResizing(true);
    };

    const resetBox = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const width = Math.min(1024, vw - MANUAL_MARGIN * 2);
        const height = Math.min(Math.round(vh * 0.92), vh - MANUAL_MARGIN * 2);
        setBox(clampManualBox((vw - width) / 2, (vh - height) / 2, width, height));
    };

    const modeLabel = mode === 'radar'
        ? (en ? 'Radar mode' : 'Modo radar')
        : (en ? 'Orbit mode' : 'Modo órbita');

    const modeSubtitle = mode === 'radar'
        ? (en ? 'Earth-centred · geocentric view' : 'Centrado na Terra · vista geocêntrica')
        : (en ? 'Sun-centred · heliocentric view' : 'Centrado no Sol · vista heliocêntrica');

    return (
        <div
            className="pointer-events-none fixed inset-0 z-50"
            role="dialog"
            aria-modal="false"
            aria-labelledby="map-manual-title"
        >
            <div
                className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl border border-white/20 bg-[#07101d]/95 shadow-[0_24px_80px_rgba(0,0,0,0.75)] ring-1 ring-black/40 backdrop-blur"
                style={{
                    left: box.x,
                    top: box.y,
                    width: box.width,
                    height: box.height,
                    userSelect: dragging || resizing ? 'none' : undefined,
                }}
            >
                <header
                    onPointerDown={startDrag}
                    className={[
                        'flex shrink-0 flex-col gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5',
                        dragging ? 'cursor-grabbing' : 'cursor-grab',
                    ].join(' ')}
                >
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-signal-cyan">
                                {mode === 'radar' ? <Radar className="size-3.5" aria-hidden /> : <Orbit className="size-3.5" aria-hidden />}
                                {modeLabel}
                            </div>
                            <span
                                className="inline-flex items-center gap-1 text-[11px] text-white/40"
                                title={en ? 'Drag to move' : 'Arraste para mover'}
                            >
                                <GripHorizontal className="size-3.5" aria-hidden />
                                {en ? 'drag' : 'arraste'}
                            </span>
                        </div>
                        <h2 id="map-manual-title" className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                            {en ? 'Map manual' : 'Manual do mapa'}
                        </h2>
                        <p className="mt-0.5 text-sm text-white/45">{modeSubtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                        <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={onClose}
                            className="inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            aria-label={en ? 'Close manual' : 'Fechar manual'}
                        >
                            <X className="size-4" aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="flex shrink-0 gap-1 border-b border-white/10 bg-black/16 px-3 py-2 sm:px-5">
                    <ManualTabButton active={tab === 'guide'} onClick={() => setTab('guide')} icon="guide">
                        {en ? 'Reading guide' : 'Guia de leitura'}
                    </ManualTabButton>
                    <ManualTabButton active={tab === 'technical'} onClick={() => setTab('technical')} icon="technical">
                        {en ? 'Under the hood' : 'Por dentro'}
                    </ManualTabButton>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                    {tab === 'guide'
                        ? <FriendlyManual mode={mode} locale={locale} lunarDistanceKm={lunarDistanceKm} />
                        : <TechnicalManual mode={mode} locale={locale} lunarDistanceKm={lunarDistanceKm} />}
                </div>

                <button
                    type="button"
                    onPointerDown={startResize}
                    aria-label={en ? 'Resize manual' : 'Redimensionar manual'}
                    title={en ? 'Drag to resize' : 'Arraste para redimensionar'}
                    className="absolute bottom-0 right-0 z-10 flex size-5 cursor-se-resize items-end justify-end p-0.5 text-white/40 outline-none hover:text-white/80 focus-visible:text-white"
                >
                    <svg viewBox="0 0 10 10" className="size-3" aria-hidden>
                        <path d="M9 1 L1 9 M9 5 L5 9 M9 9 L9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

function ManualTabButton({ active, onClick, icon, children }: {
    active: boolean;
    onClick: () => void;
    icon: ManualTab;
    children: React.ReactNode;
}) {
    const Icon = icon === 'guide' ? BookOpen : Calculator;
    return (
        <button
            type="button"
            onClick={onClick}
            className={[
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan',
                active ? 'bg-signal-cyan text-space-950' : 'text-white/62 hover:bg-white/[0.08] hover:text-white',
            ].join(' ')}
        >
            <Icon className="size-3.5" aria-hidden />
            {children}
        </button>
    );
}

// ─── Friendly / Reading guide ───────────────────────────────────────────────

function FriendlyManual({ mode, locale, lunarDistanceKm }: { mode: SceneMode; locale: 'pt-BR' | 'en'; lunarDistanceKm: number }) {
    const en = locale === 'en';
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

    if (mode === 'radar') return <RadarFriendly en={en} nf={nf} lunarDistanceKm={lunarDistanceKm} />;
    return <OrbitFriendly en={en} />;
}

function RadarFriendly({ en, nf, lunarDistanceKm }: { en: boolean; nf: Intl.NumberFormat; lunarDistanceKm: number }) {
    const ldKm = nf.format(Math.round(lunarDistanceKm));

    return (
        <div className="space-y-6">

            <Callout icon="radar">
                <p className="text-sm leading-relaxed text-white/80">
                    {en
                        ? 'Each dot on this map is a real rock flying through space near Earth right now. Earth is in the centre. The further a dot is from the centre, the further that rock is from us.'
                        : 'Cada ponto nesse mapa é uma rocha real voando pelo espaço perto da Terra agora. A Terra fica no centro. Quanto mais longe do centro, mais longe essa rocha está de nós.'}
                </p>
            </Callout>

            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-5">

                    <Section title={en ? 'The map squishes distances to fit the screen' : 'O mapa comprime as distâncias para caber na tela'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'Space is so vast that if this map were to scale, the visualization would be impossible. To make them visible, the map squishes everything — nearby objects look much closer to the Earth than they really are.'
                                : 'O espaço é tão grande que se esse mapa fosse em escala real, a visualização seria impossível. Para deixá-los visíveis, o mapa comprime tudo — objetos próximos parecem muito mais perto da Terra do que realmente estão.'}
                        </p>
                        <HighlightBox>
                            {en
                                ? <><strong className="text-white">The visual positions are not to scale.</strong> To know the real distance, look at the numbers in the panel on the left — those are always accurate.</>
                                : <><strong className="text-white">As posições visuais não são em escala.</strong> Para saber a distância real, olhe os números no painel à esquerda — esses são sempre precisos.</>}
                        </HighlightBox>
                    </Section>

                    <Section title={en ? 'What the numbers mean' : 'O que os números significam'}>
                        <div className="space-y-2">
                            <RulerRow
                                label="km"
                                color="text-white/80"
                                value=""
                                desc={en
                                    ? 'Kilometres — the same unit used on Earth. For reference, the Moon is about 384,000 km away.'
                                    : 'Quilômetros — a mesma unidade usada aqui na Terra. Para referência, a Lua fica a cerca de 384.000 km.'}
                            />
                            <RulerRow
                                label="DL"
                                color="text-violet-300"
                                value={en ? `= ${ldKm} km today` : `= ${ldKm} km hoje`}
                                desc={en
                                    ? 'Lunar Distance — 1 DL means "as far as the Moon". An object at 2 DL is twice that distance.'
                                    : 'Distância Lunar — 1 DL significa "tão longe quanto a Lua". Um objeto a 2 DL está duas vezes essa distância.'}
                            />
                            <RulerRow
                                label="UA"
                                color="text-amber-300"
                                value={en ? '≈ 150 million km' : '≈ 150 milhões de km'}
                                desc={en
                                    ? 'Astronomical Unit — the distance from Earth to the Sun. Used when objects are very far away.'
                                    : 'Unidade Astronômica — a distância da Terra ao Sol. Usada quando os objetos estão muito longe.'}
                            />
                        </div>
                    </Section>

                    <Section title={en ? 'What you see on the map' : 'O que você vê no mapa'}>
                        <div className="space-y-2">
                            <VisualKey color="bg-violet-400" label={en ? 'Coloured dot' : 'Ponto colorido'} desc={en ? 'One asteroid or comet. The colour indicates how closely it has been monitored for impact risk.' : 'Um asteroide ou cometa. A cor indica o quão de perto ele foi monitorado quanto ao risco de impacto.'} />
                            <VisualKey color="bg-cyan-400" shape="cone" label={en ? 'Small cone on the dot' : 'Cone pequeno no ponto'} desc={en ? 'Shows which direction the object is heading.' : 'Mostra em qual direção o objeto está indo.'} />
                            <VisualKey color="bg-slate-400" shape="dashed" label={en ? 'Grey dashed trail' : 'Rastro tracejado cinza'} desc={en ? 'The path the object travelled to get here — like a wake behind a boat.' : 'O caminho que o objeto percorreu até chegar aqui — como o rastro atrás de um barco.'} />
                            <VisualKey color="bg-yellow-400" label={en ? 'Yellow dot' : 'Ponto amarelo'} desc={en ? 'The Moon. Useful to compare how far the asteroids are relative to it.' : 'A Lua. Útil para comparar o quão longe os asteroides estão em relação a ela.'} />
                        </div>
                    </Section>
                </div>

                <div className="space-y-5">
                    <RadarGuideDiagram locale={en ? 'en' : 'pt-BR'} />

                    <Section title={en ? 'Rotate to see depth' : 'Gire para ver a profundidade'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'Space is 3D, not flat. An object that looks close on the map might actually be passing far above or below Earth. Drag the scene to rotate it and check from different angles.'
                                : 'O espaço é 3D, não plano. Um objeto que parece próximo no mapa pode estar passando bem acima ou abaixo da Terra. Arraste a cena para girá-la e checar de ângulos diferentes.'}
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-white/65">
                            <li><span className="font-medium text-white/80">{en ? 'Top' : 'Superior'}</span>{en ? ' — view from above, like a bird\'s eye.' : ' — vista de cima, como olho de pássaro.'}</li>
                            <li><span className="font-medium text-white/80">{en ? 'Side' : 'Lateral'}</span>{en ? ' — view from the side, to see if objects are above or below Earth.' : ' — vista de lado, para ver se os objetos estão acima ou abaixo da Terra.'}</li>
                        </ul>
                    </Section>

                    <SwitchModeHint en={en} targetMode="orbit" />
                </div>
            </div>
        </div>
    );
}

function OrbitFriendly({ en }: { en: boolean }) {
    return (
        <div className="space-y-6">

            <Callout icon="orbit">
                <p className="text-sm leading-relaxed text-white/80">
                    {en
                        ? "Now the Sun is in the centre. You are seeing the full path this asteroid takes as it travels around the Sun — like seeing the whole racetrack instead of just where the car is right now."
                        : 'Agora o Sol está no centro. Você está vendo o caminho completo que esse asteroide faz ao redor do Sol — como ver toda a pista de corrida em vez de só onde o carro está agora.'}
                </p>
            </Callout>

            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-5">

                    <Section title={en ? 'What changed from the radar view?' : 'O que mudou em relação ao radar?'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'The radar showed how close the asteroid is to Earth right now. This view zooms out and shows the whole journey — a loop around the Sun that repeats every few years.'
                                : 'O radar mostrava o quão perto o asteroide está da Terra agora. Esta vista dá um zoom out e mostra a jornada inteira — uma volta ao redor do Sol que se repete a cada alguns anos.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'Here the distances are true to scale, so what you see actually reflects the real shape of the orbit.'
                                : 'Aqui as distâncias são em escala real, então o que você vê reflete de verdade a forma da órbita.'}
                        </p>
                    </Section>

                    <Section title={en ? 'How to read this view' : 'Como ler essa vista'}>
                        <div className="space-y-2.5">
                            <ReadingStep
                                label={en ? "1. The oval is the asteroid's road" : '1. O oval é a estrada do asteroide'}
                                text={en
                                    ? 'The asteroid goes around the Sun in a loop — that oval is its full path. Some ovals are nearly circular, others are very stretched. The shape stays the same year after year.'
                                    : 'O asteroide vai ao redor do Sol em um loop — esse oval é o caminho completo dele. Alguns ovals são quase circulares, outros são muito esticados. A forma é a mesma ano após ano.'}
                            />
                            <ReadingStep
                                label={en ? '2. The dot is where it is right now' : '2. O ponto é onde ele está agora'}
                                text={en
                                    ? "The bright dot on the oval marks today's position. As days pass, this dot moves along the path."
                                    : 'O ponto brilhante no oval marca a posição de hoje. Com o passar dos dias, esse ponto avança pelo caminho.'}
                            />
                            <ReadingStep
                                label={en ? '3. Does the path come close to where Earth orbits?' : '3. O caminho passa pela região onde a Terra orbita?'}
                                text={en
                                    ? 'Earth orbits the Sun at about 1 AU. If the oval passes through that region (roughly the same distance from the Sun as Earth), the asteroid can come close to us at some point on its loop.'
                                    : 'A Terra orbita o Sol a cerca de 1 UA. Se o oval passa por essa região (aproximadamente à mesma distância do Sol que a Terra), o asteroide pode se aproximar de nós em algum ponto do seu loop.'}
                            />
                            <ReadingStep
                                label={en ? '4. Rotate to check the tilt' : '4. Gire para checar a inclinação'}
                                text={en
                                    ? "An orbit that looks close to Earth from above might actually pass well above or below it. Drag to rotate and see from the side."
                                    : 'Uma órbita que parece próxima da Terra vista de cima pode na verdade passar bem acima ou abaixo dela. Arraste para girar e ver de lado.'}
                            />
                        </div>
                    </Section>
                </div>

                <div className="space-y-5">
                    <OrbitGuideDiagram locale={en ? 'en' : 'pt-BR'} />

                    <Section title={en ? 'What you see on the map' : 'O que você vê no mapa'}>
                        <div className="space-y-2">
                            <VisualKey color="bg-orange-400" label={en ? 'Big glowing sphere' : 'Grande esfera brilhante'} desc={en ? 'The Sun, at the centre.' : 'O Sol, no centro.'} />
                            <VisualKey color="bg-violet-400" shape="ellipse" label={en ? 'Bright oval line' : 'Linha oval brilhante'} desc={en ? "The asteroid's full path around the Sun." : 'O caminho completo do asteroide ao redor do Sol.'} />
                            <VisualKey color="bg-white" label={en ? 'Dot on the oval' : 'Ponto no oval'} desc={en ? "The asteroid's position today." : 'A posição do asteroide hoje.'} />
                        </div>
                    </Section>

                    <SwitchModeHint en={en} targetMode="radar" />
                </div>
            </div>
        </div>
    );
}

// ─── Technical / Under the hood ─────────────────────────────────────────────

function TechnicalManual({ mode, locale, lunarDistanceKm }: { mode: SceneMode; locale: 'pt-BR' | 'en'; lunarDistanceKm: number }) {
    const en = locale === 'en';
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    const auKm = nf.format(KM_PER_AU);
    const ldKm = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(lunarDistanceKm));

    if (mode === 'radar') return <RadarTechnical en={en} auKm={auKm} ldKm={ldKm} lunarDistanceKm={lunarDistanceKm} locale={locale} />;
    return <OrbitTechnical en={en} locale={locale} />;
}

function RadarTechnical({ en, ldKm, lunarDistanceKm, locale }: { en: boolean; auKm: string; ldKm: string; lunarDistanceKm: number; locale: 'pt-BR' | 'en' }) {
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    const auKm = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(KM_PER_AU);
    return (
        <div className="space-y-6">
            <p className="text-sm leading-relaxed text-white/65">
                {en
                    ? 'This section explains the data pipeline and the math behind what you see. Switch to the reading guide if you just need to interpret the scene.'
                    : 'Esta seção explica o pipeline de dados e a matemática por trás do que você vê. Mude para o guia de leitura se você só precisa interpretar a cena.'}
            </p>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-5">
                    <RadarGuideDiagram locale={locale} technical />

                    <TechSection title={en ? 'Why log compression?' : 'Por que compressão logarítmica?'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? `The Sun is ≈ 389 LD from Earth. On a linear scale, the Lunar-distance band — where near-Earth asteroids live — would span less than 0.3 % of the canvas. Objects beyond 2 LD would be invisible.`
                                : `O Sol está a ≈ 389 DL da Terra. Em escala linear, a faixa de distância lunar — onde os asteroides próximos à Terra vivem — ocuparia menos de 0,3 % do canvas. Objetos além de 2 DL seriam invisíveis.`}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'The log function stretches the near region and compresses the far region, keeping both visible at once. The transition radius R₀ = 8 LD is chosen so the mapping is nearly linear below 1 LD (where precision matters most), and K is calibrated so the Moon always lands at exactly 1 scene unit.'
                                : 'A função logarítmica estica a região próxima e comprime a região distante, mantendo ambas visíveis ao mesmo tempo. O raio de transição R₀ = 8 DL é escolhido para que o mapeamento seja quase linear abaixo de 1 DL (onde a precisão importa mais), e K é calibrado para que a Lua sempre caia exatamente em 1 unidade de cena.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'Direction and inclination are preserved exactly — only the radial distance is remapped. The numeric distances in the UI are always the original, uncompressed values.'
                                : 'Direção e inclinação são preservadas exatamente — apenas a distância radial é remapeada. As distâncias numéricas na interface são sempre os valores originais, sem compressão.'}
                        </p>
                    </TechSection>
                </div>

                <div className="space-y-4">
                    <FormulaPanel
                        title={en ? '1. Geocentric state vectors (input from JPL Horizons)' : '1. Vetores de estado geocêntricos (entrada do JPL Horizons)'}
                        formulas={[
                            'r = (x, y, z)   [km, J2000 geocentric]',
                            'v = (vx, vy, vz) [km/s]',
                            'd_km  = ||r||',
                            `d_DL  = d_km / ${ldKm}`,
                            `d_AU  = d_km / ${auKm}`,
                        ]}
                        note={en
                            ? 'JPL Horizons delivers position and velocity in the geocentric J2000 equatorial frame. All three distance units (km, LD, AU) derive from the same Euclidean norm of r — they are consistent by construction.'
                            : 'O JPL Horizons entrega posição e velocidade no referencial equatorial geocêntrico J2000. As três unidades de distância (km, DL, UA) derivam da mesma norma euclidiana de r — são consistentes por construção.'}
                    />

                    <FormulaPanel
                        title={en ? '2. Radial log compression (scene placement)' : '2. Compressão radial logarítmica (posicionamento na cena)'}
                        formulas={[
                            `R₀ = 8 DL  (= ${nf.format(8 * lunarDistanceKm)} km)`,
                            'K  = 1 / ln(1 + 1/R₀)',
                            'f(r) = K · ln(1 + r/R₀)',
                            'r_scene = f(d_DL) · r̂     where r̂ = r/||r||',
                        ]}
                        note={en
                            ? 'f maps real distance d_DL → scene radius. K forces f(1) = 1, so the Moon always lands at 1 scene unit regardless of its actual km value that day. The direction unit vector r̂ is applied after compression, so angles are never distorted.'
                            : 'f mapeia a distância real d_DL → raio de cena. K força f(1) = 1, de modo que a Lua sempre cai em 1 unidade de cena independente do valor km do dia. O vetor unitário de direção r̂ é aplicado após a compressão, portanto ângulos nunca são distorcidos.'}
                    />

                    <FormulaPanel
                        title={en ? '3. Motion cone and trajectory trail' : '3. Cone de movimento e trilha de trajetória'}
                        formulas={[
                            'û = v / ||v||           (unit velocity)',
                            en ? 'cone direction ← û' : 'direção do cone ← û',
                            en ? 'trail ← geocentric positions near t_now' : 'trilha ← posições geocêntricas próximas a t_now',
                            en ? 'trail_scene = same f compression per point' : 'trilha_cena = mesma compressão f por ponto',
                        ]}
                        note={en
                            ? 'The cone orientation is physically meaningful — it points where the object is heading, at the true velocity direction. The trail samples the geocentric ephemeris at a few nearby epochs and applies the same log compression, so its shape is visually consistent with the object position.'
                            : 'A orientação do cone tem significado físico — aponta para onde o objeto está indo, na direção de velocidade real. A trilha amostra a efeméride geocêntrica em algumas épocas próximas e aplica a mesma compressão logarítmica, portanto sua forma é visualmente consistente com a posição do objeto.'}
                    />

                    <TechSection title={en ? '3D body models' : 'Modelos 3D de corpos'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'When NASA has a published shape model for a body (Bennu, Ceres, Eros, Itokawa, Vesta), the corresponding asset is loaded. All other bodies are rendered as representative rock meshes selected by estimated diameter.'
                                : 'Quando a NASA tem um modelo de forma publicado para um corpo (Bennu, Ceres, Eros, Itokawa, Vesta), o asset correspondente é carregado. Todos os outros corpos são renderizados como meshes de rocha representativas selecionadas pelo diâmetro estimado.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'Body radii are amplified for legibility — true diameters would be sub-pixel at scene scale. This affects only the visual size; distances remain the uncompressed measurement layer and are always printed from the original data.'
                                : 'Os raios dos corpos são amplificados para legibilidade — os diâmetros reais seriam sub-pixel na escala da cena. Isso afeta apenas o tamanho visual; as distâncias permanecem a camada de medição sem compressão e são sempre impressas a partir dos dados originais.'}
                        </p>
                    </TechSection>
                </div>
            </div>
        </div>
    );
}

function OrbitTechnical({ en, locale }: { en: boolean; locale: 'pt-BR' | 'en' }) {
    return (
        <div className="space-y-6">
            <p className="text-sm leading-relaxed text-white/65">
                {en
                    ? 'This section explains how the orbital ellipse is computed and drawn. Switch to the reading guide to understand what you are looking at visually.'
                    : 'Esta seção explica como a elipse orbital é calculada e desenhada. Mude para o guia de leitura para entender o que você está vendo visualmente.'}
            </p>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-5">
                    <OrbitGuideDiagram locale={locale} technical />

                    <TechSection title={en ? 'Why a separate heliocentric view?' : 'Por que uma vista heliocêntrica separada?'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'The radar uses logarithmic compression calibrated for the Earth neighbourhood (LD scale). The orbit uses a linear AU scale calibrated for the solar system. Mixing the two would mean the same ruler represents different physical distances depending on the mode — guaranteed confusion.'
                                : 'O radar usa compressão logarítmica calibrada para a vizinhança da Terra (escala DL). A órbita usa escala linear em UA calibrada para o sistema solar. Misturar os dois significaria que a mesma régua representa distâncias físicas diferentes dependendo do modo — confusão garantida.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'Keeping modes strictly separated means each view has one consistent scale. The radar answers "how close is it now?" The orbit answers "what path does gravity hold it on?"'
                                : 'Manter os modos estritamente separados significa que cada vista tem uma escala consistente. O radar responde "quão perto está agora?" A órbita responde "em que caminho a gravidade o mantém?"'}
                        </p>
                    </TechSection>
                </div>

                <div className="space-y-4">
                    <FormulaPanel
                        title={en ? '1. Osculating orbital elements (input from JPL Horizons)' : '1. Elementos orbitais osculadores (entrada do JPL Horizons)'}
                        formulas={[
                            'q  — perihelion distance [AU]',
                            'e  — eccentricity',
                            'i  — inclination [deg]',
                            'Ω  — longitude of ascending node [deg]',
                            'ω  — argument of perihelion [deg]',
                            'Tₚ — time of perihelion passage [JD]',
                        ]}
                        note={en
                            ? 'These six classical Keplerian elements define a unique conic section in 3D space. They come from JPL Horizons as the osculating orbit at the current solution epoch — the best-fit ellipse to the actual numerical trajectory at this moment in time.'
                            : 'Esses seis elementos Keplerianos clássicos definem uma seção cônica única no espaço 3D. Vêm do JPL Horizons como a órbita osculadora na época da solução atual — a elipse de melhor ajuste à trajetória numérica real neste momento.'}
                    />

                    <FormulaPanel
                        title={en ? '2. Kepler propagation — finding position on the ellipse' : '2. Propagação Kepleriana — encontrando a posição na elipse'}
                        formulas={[
                            'a  = q / (1 − e)          (semi-major axis)',
                            'k  = 0.01720209895        (Gaussian grav. const.)',
                            'n  = sqrt(k² / a³)        (mean motion)',
                            'M  = n · (JD_now − Tₚ)   (mean anomaly)',
                            'E − e·sin(E) = M          (Kepler\'s equation)',
                        ]}
                        note={en
                            ? 'M grows linearly with time; E is the eccentric anomaly, which together with a and e gives the actual position on the ellipse. Kepler\'s equation has no closed-form solution — it is solved iteratively by Newton\'s method, converging in 3–5 iterations for typical eccentricities.'
                            : 'M cresce linearmente com o tempo; E é a anomalia excêntrica, que junto com a e e dá a posição real na elipse. A equação de Kepler não tem solução analítica fechada — é resolvida iterativamente pelo método de Newton, convergindo em 3–5 iterações para excentricidades típicas.'}
                    />

                    <FormulaPanel
                        title={en ? '3. 3D position from the orbital plane to the ecliptic' : '3. Posição 3D do plano orbital para o eclíptico'}
                        formulas={[
                            'x = a·(cos E − e)',
                            'y = a·sqrt(1 − e²)·sin E',
                            'R = Rz(Ω) · Rx(i) · Rz(ω)   (Euler rotation)',
                            'p_ecl = R · (x, y, 0)        [AU, J2000 ecliptic]',
                        ]}
                        note={en
                            ? 'x,y are computed in the orbital plane with the Sun at the origin. The composite rotation R applies three sequential rotations — argument of perihelion ω, inclination i, ascending node Ω — to tilt and orient the ellipse in the J2000 ecliptic frame.'
                            : 'x,y são calculados no plano orbital com o Sol na origem. A rotação composta R aplica três rotações sequenciais — argumento do periélio ω, inclinação i, nodo ascendente Ω — para inclinar e orientar a elipse no referencial eclíptico J2000.'}
                    />

                    <FormulaPanel
                        title={en ? '4. Mapping to the 3D scene' : '4. Mapeamento para a cena 3D'}
                        formulas={[
                            '1 AU = ORBIT_AU_SCALE scene units',
                            'scene(x,y,z) = (x, z, y) · ORBIT_AU_SCALE',
                            en ? 'Earth ← real heliocentric ephemeris' : 'Terra ← efeméride heliocêntrica real',
                        ]}
                        note={en
                            ? 'The axis swap (y↔z) aligns the J2000 ecliptic convention — where Z points to the ecliptic north pole — with the scene convention where Y is up. Earth is placed from the same local ephemeris used for lighting, so the Sun direction is physically correct. Only Earth\'s rendered radius is amplified for visibility.'
                            : 'A troca de eixos (y↔z) alinha a convenção eclíptica J2000 — onde Z aponta para o polo norte eclíptico — com a convenção da cena onde Y é para cima. A Terra é posicionada pela mesma efeméride local usada para iluminação, então a direção do Sol é fisicamente correta. Apenas o raio renderizado da Terra é amplificado para visibilidade.'}
                    />
                </div>
            </div>
        </div>
    );
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function Callout({ icon, children }: { icon: 'radar' | 'orbit'; children: React.ReactNode }) {
    const Icon = icon === 'radar' ? Radar : Orbit;
    return (
        <div className="flex items-start gap-3 rounded-xl border border-signal-cyan/20 bg-signal-cyan/[0.07] px-4 py-3.5">
            <Icon className="mt-0.5 size-5 shrink-0 text-signal-cyan" aria-hidden />
            <div>{children}</div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
            {children}
        </section>
    );
}

function TechSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">{title}</h3>
            {children}
        </section>
    );
}

function HighlightBox({ children }: { children: React.ReactNode }) {
    return (
        <div className="mt-3 rounded-md border border-amber-300/15 bg-amber-300/[0.06] px-3.5 py-2.5 text-[13px] leading-relaxed text-white/70">
            {children}
        </div>
    );
}

function RulerRow({ label, color, value, desc }: { label: string; color: string; value: string; desc: string }) {
    return (
        <div className="flex gap-3 rounded-md border border-white/8 bg-black/15 px-3 py-2.5">
            <span className={`mt-0.5 shrink-0 font-mono text-sm font-bold ${color}`}>{label}</span>
            <div>
                <span className="text-[13px] font-medium text-white/80">{value}</span>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/55">{desc}</p>
            </div>
        </div>
    );
}

function VisualKey({ color, shape, label, desc }: { color: string; shape?: 'cone' | 'dashed' | 'ring' | 'ellipse'; label: string; desc: string }) {
    return (
        <div className="flex items-start gap-2.5 rounded-md border border-white/8 bg-black/15 px-3 py-2">
            <span className="mt-1 shrink-0">
                {shape === 'dashed'
                    ? <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-slate-400/80" />
                    : shape === 'ring'
                        ? <span className={`inline-block size-3.5 rounded-full border-2 ${color.replace('bg-', 'border-')} bg-transparent`} />
                        : shape === 'ellipse'
                            ? <span className={`inline-block h-2.5 w-4 rounded-full border-2 ${color.replace('bg-', 'border-')} bg-transparent`} />
                            : shape === 'cone'
                                ? <span className={`inline-block size-0 border-b-[10px] border-l-[5px] border-r-[5px] border-b-cyan-400 border-l-transparent border-r-transparent`} />
                                : <span className={`inline-block size-3 rounded-full ${color}`} />}
            </span>
            <div>
                <span className="text-[13px] font-medium text-white/85">{label}</span>
                <p className="text-[12px] leading-relaxed text-white/55">{desc}</p>
            </div>
        </div>
    );
}

function ReadingStep({ label, text }: { label: string; text: string }) {
    return (
        <div className="rounded-md border border-white/8 bg-black/15 px-3 py-2.5">
            <p className="text-[13px] font-semibold text-white/85">{label}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/62">{text}</p>
        </div>
    );
}

function SwitchModeHint({ en, targetMode }: { en: boolean; targetMode: 'radar' | 'orbit' }) {
    const isRadar = targetMode === 'radar';
    return (
        <div className="rounded-lg border border-white/8 bg-black/20 p-4">
            <p className="text-[13px] font-semibold text-white/70">
                {en ? 'When to switch mode' : 'Quando trocar de modo'}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">
                {isRadar
                    ? (en
                        ? 'Switch back to radar when you want to know the real distance to Earth right now, check the approach direction, or read the km/LD/AU numbers.'
                        : 'Volte para o radar quando quiser saber a distância real da Terra agora, checar a direção da aproximação ou ler os números em km/DL/UA.')
                    : (en
                        ? 'Switch to orbit mode when you want to see the full ellipse, compare the orbit shape with Earth\'s, or understand whether the orbit intersects Earth\'s path at all.'
                        : 'Mude para o modo órbita quando quiser ver a elipse completa, comparar a forma da órbita com a da Terra ou entender se a órbita intersecta o caminho da Terra.')}
            </p>
        </div>
    );
}

function FormulaPanel({ title, formulas, note }: { title: string; formulas: string[]; note: string }) {
    return (
        <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <div className="mt-3 space-y-0.5 rounded-md border border-signal-cyan/15 bg-signal-cyan/[0.055] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-cyan-100/88">
                {formulas.map((formula) => <div key={formula}>{formula}</div>)}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/62">{note}</p>
        </section>
    );
}

// ─── SVG Diagrams ────────────────────────────────────────────────────────────

function RadarGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
    const en = locale === 'en';
    return (
        <figure className="overflow-hidden rounded-lg border border-white/10 bg-[#050b15]">
            <svg viewBox="0 0 540 380" className="h-auto w-full" role="img" aria-label={en ? 'Earth-centred radar diagram' : 'Diagrama do radar centrado na Terra'}>
                <defs>
                    <radialGradient id="rg-earth" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#7dd3fc" />
                        <stop offset="55%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#0f172a" />
                    </radialGradient>
                    <radialGradient id="rg-moon" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="#e2e8f0" />
                        <stop offset="100%" stopColor="#64748b" />
                    </radialGradient>
                    <marker id="rg-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L8,3 z" fill="#67e8f9" />
                    </marker>
                    <filter id="rg-glow">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                <rect width="540" height="380" fill="#050b15" />

                {/* Distance rings */}
                <circle cx="270" cy="195" r="54" fill="none" stroke="#94a3b8" strokeOpacity="0.22" strokeWidth="1" />
                <circle cx="270" cy="195" r="108" fill="none" stroke="#94a3b8" strokeOpacity="0.13" strokeWidth="1" strokeDasharray="5 7" />
                <circle cx="270" cy="195" r="162" fill="none" stroke="#94a3b8" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 9" />

                {/* Moon */}
                <circle cx="270" cy="141" r="9" fill="url(#rg-moon)" />
                <text x="285" y="136" fill="#94a3b8" fontSize="11">{en ? 'Moon (1 LD)' : 'Lua (1 DL)'}</text>

                {/* Asteroid trail */}
                <path d="M270 195 C306 130 372 112 432 88" fill="none" stroke="#94a3b8" strokeOpacity="0.40" strokeWidth="2.5" strokeDasharray="6 8" />

                {/* Asteroid cone + position */}
                <circle cx="396" cy="112" r="12" fill="#d8b4fe" filter="url(#rg-glow)" />
                {/* Cone shape pointing in velocity direction */}
                <polygon points="396,100 388,120 404,120" fill="#67e8f9" opacity="0.85" transform="rotate(-40 396 112)" />
                {/* Arrow for movement */}
                <line x1="396" y1="112" x2="450" y2="80" stroke="#67e8f9" strokeWidth="3" markerEnd="url(#rg-arrow)" />

                {/* Second object, farther out */}
                <circle cx="190" cy="290" r="8" fill="#fb923c" opacity="0.8" />
                <polygon points="190,278 183,296 197,296" fill="#67e8f9" opacity="0.6" transform="rotate(150 190 290)" />

                {/* Earth */}
                <circle cx="270" cy="195" r="28" fill="url(#rg-earth)" />
                <text x="270" y="239" textAnchor="middle" fill="#e0f2fe" fontSize="14" fontWeight="700">{en ? 'Earth' : 'Terra'}</text>

                {/* Technical overlays */}
                {technical && (
                    <>
                        <line x1="270" y1="195" x2="396" y2="112" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.85" strokeDasharray="3 4" />
                        <text x="308" y="142" fill="#fef3c7" fontSize="11.5" fontStyle="italic">r = (x,y,z)</text>
                        <text x="270" y="358" textAnchor="middle" fill="#bae6fd" fontSize="11.5">r_cena = f(d_DL) · r̂</text>
                        <text x="270" y="373" textAnchor="middle" fill="#bae6fd" fontSize="11" opacity="0.7">f(r) = K·ln(1 + r/R₀)</text>
                    </>
                )}

                {/* Labels — title + ring labels */}
                <text x="20" y="30" fill="#cbd5e1" fontSize="13" fontWeight="700">{en ? 'Read outward from Earth' : 'Leia saindo da Terra'}</text>
                <text x="20" y="48" fill="#64748b" fontSize="11">{en ? '— numbers in the focus panel are uncompressed' : '— números no painel de foco são descomprimidos'}</text>

                {/* Ring labels */}
                <text x="327" y="192" fill="#475569" fontSize="10">1 DL</text>
                <text x="381" y="192" fill="#334155" fontSize="10">2 DL</text>

                {/* Object labels */}
                <text x="412" y="105" fill="#e2e8f0" fontSize="12">{en ? 'object' : 'objeto'}</text>
                <text x="448" y="72" fill="#67e8f9" fontSize="12" fontWeight="600">{en ? 'moving' : 'movimento'}</text>
            </svg>
            <figcaption className="border-t border-white/10 px-4 py-3 text-[12px] leading-relaxed text-white/55">
                {en
                    ? 'Earth at centre. Grey rings are distance bands (logarithmically spaced in the real view). The cone points in the direction of motion. The grey dashed line is the recent trajectory.'
                    : 'Terra no centro. Anéis cinzas são faixas de distância (com espaçamento logarítmico na vista real). O cone aponta na direção do movimento. A linha tracejada cinza é a trajetória recente.'}
            </figcaption>
        </figure>
    );
}

function OrbitGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
    const en = locale === 'en';
    return (
        <figure className="overflow-hidden rounded-lg border border-white/10 bg-[#050b15]">
            <svg viewBox="0 0 540 380" className="h-auto w-full" role="img" aria-label={en ? 'Sun-centred orbit diagram' : 'Diagrama orbital centrado no Sol'}>
                <defs>
                    <radialGradient id="og-sun" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#fef9c3" />
                        <stop offset="40%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#7c2d12" />
                    </radialGradient>
                    <radialGradient id="og-earth" cx="50%" cy="50%" r="60%">
                        <stop offset="0%" stopColor="#7dd3fc" />
                        <stop offset="100%" stopColor="#1e40af" />
                    </radialGradient>
                    <marker id="og-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L8,3 z" fill="#67e8f9" />
                    </marker>
                    <filter id="og-glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                <rect width="540" height="380" fill="#050b15" />

                {/* Asteroid orbit — tilted ellipse, offset focus */}
                <ellipse
                    cx="290" cy="190" rx="185" ry="88"
                    fill="none" stroke="#a78bfa" strokeOpacity="0.85" strokeWidth="2.5"
                    transform="rotate(-15 290 190)"
                />

                {/* Sun */}
                <circle cx="270" cy="190" r="22" fill="url(#og-sun)" filter="url(#og-glow)" />
                <text x="270" y="228" textAnchor="middle" fill="#fed7aa" fontSize="14" fontWeight="700">{en ? 'Sun' : 'Sol'}</text>

                {/* Asteroid position */}
                <circle cx="448" cy="128" r="11" fill="#f8fafc" filter="url(#og-glow)" />
                <path d="M436 136 L468 102" stroke="#67e8f9" strokeWidth="3" markerEnd="url(#og-arrow)" />

                {/* Technical overlays */}
                {technical && (
                    <>
                        <line x1="270" y1="190" x2="448" y2="128" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="3 4" />
                        <text x="340" y="148" fill="#fef3c7" fontSize="11.5" fontStyle="italic">p_ecl</text>
                        <text x="20" y="355" fill="#bae6fd" fontSize="11.5">E − e·sin(E) = M</text>
                        <text x="20" y="372" fill="#bae6fd" fontSize="11" opacity="0.7">a = q/(1−e)</text>
                    </>
                )}

                {/* Labels */}
                <text x="20" y="30" fill="#cbd5e1" fontSize="13" fontWeight="700">{en ? 'Read the whole orbit' : 'Leia a órbita inteira'}</text>
                <text x="20" y="48" fill="#64748b" fontSize="11">{en ? '— find where Earth and the asteroid are today' : '— encontre onde a Terra e o asteroide estão hoje'}</text>

                {/* Object label */}
                <text x="454" y="122" fill="#e2e8f0" fontSize="12">{en ? 'asteroid now' : 'asteroide agora'}</text>
                <text x="468" y="98" fill="#67e8f9" fontSize="11" fontWeight="600">{en ? 'moving' : 'movimento'}</text>
            </svg>
            <figcaption className="border-t border-white/10 px-4 py-3 text-[12px] leading-relaxed text-white/55">
                {en
                    ? 'Sun at centre (orange). The purple oval is the asteroid\'s full orbit around the Sun. The white dot is where the asteroid is today.'
                    : 'Sol no centro (laranja). O oval roxo é a órbita completa do asteroide ao redor do Sol. O ponto branco é onde o asteroide está hoje.'}
            </figcaption>
        </figure>
    );
}
