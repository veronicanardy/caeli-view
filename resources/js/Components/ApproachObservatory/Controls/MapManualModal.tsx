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
                const { offsetX, offsetY } = dragRef.current;
                setBox((b) => clampManualBox(event.clientX - offsetX, event.clientY - offsetY, b.width, b.height));
            } else if (resizing && resizeRef.current) {
                const { startX, startY, startWidth, startHeight } = resizeRef.current;
                const dx = event.clientX - startX;
                const dy = event.clientY - startY;
                setBox((b) => clampManualBox(b.x, b.y, startWidth + dx, startHeight + dy));
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
                        ? "You're looking at the space around Earth, seen from outside — as if you were floating in space and looking down. The blue sphere at the centre is our planet. The silver sphere beside it is the Moon. And those coloured dots scattered around the scene? Real rocks passing through Earth's neighbourhood right now — live data, not simulations."
                        : 'Você está olhando para o espaço ao redor da Terra, visto de fora — como se você estivesse flutuando no espaço e olhasse para baixo. A esfera azul no centro é o nosso planeta. A esfera prateada ao lado é a Lua. E esses pontos coloridos espalhados pela cena? São rochas reais passando pela vizinhança da Terra agora — dados ao vivo, não simulações.'}
                </p>
            </Callout>

            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-5">

                    <Section title={en ? 'Why does everything look so close?' : 'Por que tudo parece tão perto?'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'Because space is absurdly large. If this map used real distances, every asteroid would be an invisible speck far off screen — and the Moon would be outside the frame. To show them at all, the radar compresses distances: objects that are millions of kilometres away end up looking nearby on screen. The shape of the scene is real. The visual distances are not.'
                                : 'Porque o espaço é absurdamente grande. Se esse mapa usasse distâncias reais, cada asteroide seria um pontinho invisível longe da tela — e a Lua estaria fora do quadro. Para mostrá-los, o radar comprime as distâncias: objetos que estão a milhões de quilômetros acabam parecendo próximos na tela. O formato da cena é real. As distâncias visuais, não.'}
                        </p>
                        <HighlightBox>
                            {en
                                ? <><strong className="text-white">Trust the numbers, not the visuals.</strong> The real distance is always in the left panel — those values are never compressed.</>
                                : <><strong className="text-white">Confie nos números, não no visual.</strong> A distância real está sempre no painel à esquerda — esses valores nunca são comprimidos.</>}
                        </HighlightBox>
                    </Section>

                    <Section title={en ? 'The three distance units' : 'As três unidades de distância'}>
                        <p className="text-sm leading-relaxed text-white/70 mb-2">
                            {en
                                ? "The distances in the left panel use three different units depending on how far the object is. They all measure the same thing — just at different scales. Understanding them helps you interpret what you see on screen."
                                : 'As distâncias no painel à esquerda aparecem em três unidades diferentes, dependendo de quão longe o objeto está. Todas medem a mesma coisa — só em escalas diferentes. Entender isso ajuda a interpretar o que você vê na cena.'}
                        </p>
                        <div className="space-y-2">
                            <RulerRow
                                label="km"
                                color="text-white/80"
                                value=""
                                desc={en
                                    ? 'Kilometres — the everyday unit. The Moon is ~384,000 km from Earth.'
                                    : 'Quilômetros — a unidade do dia a dia. A Lua fica a ~384.000 km da Terra.'}
                            />
                            <RulerRow
                                label="DL"
                                color="text-violet-300"
                                value={en ? `= ${ldKm} km today` : `= ${ldKm} km hoje`}
                                desc={en
                                    ? '1 DL = Earth–Moon distance right now (it varies slightly through the month). At 0.5 DL the object is closer than the Moon; at 10 DL it is ten times farther.'
                                    : '1 DL = distância Terra-Lua agora (varia um pouco ao longo do mês). A 0,5 DL, o objeto está mais perto que a Lua. A 10 DL, está dez vezes mais longe.'}
                            />
                            <RulerRow
                                label="UA"
                                color="text-amber-300"
                                value={en ? '≈ 150 million km' : '≈ 150 milhões de km'}
                                desc={en
                                    ? 'Astronomical Unit — Earth–Sun distance. Used when objects are very far away. Mars is ~1.5 AU from the Sun.'
                                    : 'Unidade Astronômica — a distância da Terra ao Sol. Usada quando o objeto está muito distante. Marte fica a ~1,5 UA do Sol.'}
                            />
                        </div>
                    </Section>

                    <Section title={en ? 'What each thing on screen means' : 'O que cada coisa na tela significa'}>
                        <p className="text-sm leading-relaxed text-white/60 mb-3">
                            {en
                                ? 'The radar has two layers drawn on top of each other. The inner layer shows the Earth\'s neighbourhood — asteroids, the Moon, and distance rings. A second, much larger background layer shows the planets for scale, so you can see how the whole solar system fits around the scene. Here is what each element represents:'
                                : 'O radar tem duas camadas sobrepostas. A camada interna mostra a vizinhança da Terra — asteroides, a Lua e os anéis de distância. Uma segunda camada de fundo, muito maior, mostra os planetas para escala, para que você veja como o sistema solar inteiro se encaixa ao redor da cena. Aqui está o que cada elemento representa:'}
                        </p>
                        <div className="space-y-2">
                            <VisualKey color="bg-violet-400" label={en ? 'Coloured dot' : 'Ponto colorido'} desc={en ? 'One asteroid or comet, tracked live. Each gets its own colour so you can follow it as you rotate.' : 'Um asteroide ou cometa, rastreado ao vivo. Cada um tem sua cor para você acompanhá-lo enquanto gira a cena.'} />
                            <VisualKey color="bg-cyan-400" shape="cone" label={en ? 'Cone on the dot' : 'Cone no ponto'} desc={en ? 'The direction it is heading right now. The tip is where it will be next.' : 'A direção em que ele está indo agora. A ponta é onde ele estará em seguida.'} />
                            <VisualKey color="bg-slate-400" shape="dashed" label={en ? 'Dashed trail' : 'Rastro tracejado'} desc={en ? 'Where it came from — its recent path through space.' : 'De onde ele veio — seu caminho recente pelo espaço.'} />
                            <VisualKey color="bg-slate-300" label={en ? 'Silver sphere' : 'Esfera prateada'} desc={en ? 'The Moon, always at 1 DL from Earth. Use it as a reference: if an object is closer than the Moon, it is inside the lunar orbit.' : 'A Lua, sempre a 1 DL da Terra. Use-a como referência: se um objeto está mais perto que a Lua, ele está dentro da órbita lunar.'} />
                            <VisualKey color="bg-amber-300" shape="ring" label={en ? 'Planet ring + dashed orbit (background layer)' : 'Anel de planeta + órbita tracejada (camada de fundo)'} desc={en ? 'Mercury, Venus, Mars, Jupiter, Saturn, Uranus and Neptune — drawn in a separate heliocentric background layer for scale context only. Their positions are real, from live ephemeris data. The dashed ellipse around each is its actual orbit.' : 'Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano e Netuno — desenhados numa camada heliocêntrica de fundo separada, apenas para referência de escala. As posições são reais, vindas de efeméride ao vivo. A elipse tracejada ao redor de cada um é sua órbita real.'} />
                        </div>
                    </Section>
                </div>

                <div className="space-y-5">
                    <RadarGuideDiagram locale={en ? 'en' : 'pt-BR'} />

                    <Section title={en ? 'How to explore the radar' : 'Como explorar o radar'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'The radar is three-dimensional — you can rotate, zoom and click freely. Try it before reading anything else: drag with the mouse and watch the scene spin. Asteroids that looked close together may actually be separated by millions of kilometres in depth.'
                                : 'O radar é tridimensional — você pode girar, aproximar e clicar livremente. Experimente isso antes de ler qualquer outra coisa: arraste com o mouse e veja a cena girar. Os asteroides que pareciam próximos uns dos outros podem estar, na realidade, separados por milhões de quilômetros em profundidade.'}
                        </p>
                        <div className="mt-3 space-y-2">
                            <InteractionHint icon="🖱️" label={en ? 'Drag' : 'Arrastar'} desc={en ? 'Rotate the scene in any direction' : 'Girar a cena em todas as direções'} />
                            <InteractionHint icon="🔍" label={en ? 'Scroll' : 'Scroll'} desc={en ? 'Zoom the camera in or out' : 'Aproximar ou afastar a câmera'} />
                            <InteractionHint icon="👆" label={en ? 'Click a dot' : 'Clicar num ponto'} desc={en ? 'Select it and see all its data' : 'Selecionar o objeto e ver todos os seus dados'} />
                        </div>
                        <div className="mt-3 space-y-1.5">
                            <p className="text-[12px] font-semibold uppercase tracking-wide text-white/35">{en ? 'Quick views' : 'Ângulos rápidos'}</p>
                            <ul className="space-y-1 text-sm leading-relaxed text-white/60">
                                <li><span className="font-medium text-white/80">{en ? 'Top' : 'Superior'}</span>{en ? ' — bird\'s-eye. Good overview, but hides depth. Use it to see the big picture.' : ' — visão de cima. Boa visão geral, mas esconde a profundidade. Use para ter uma ideia do conjunto.'}</li>
                                <li><span className="font-medium text-white/80">{en ? 'Side' : 'Lateral'}</span>{en ? ' — from the side. Reveals which objects are above or below Earth\'s plane.' : ' — lateral. Revela quais objetos estão acima ou abaixo do plano da Terra.'}</li>
                                <li><span className="font-medium text-white/80">{en ? 'Reset' : 'Resetar'}</span>{en ? ' — back to the default angle, if you get lost.' : ' — volta ao ângulo padrão, caso você se perca.'}</li>
                            </ul>
                        </div>
                        <p className="mt-3 text-[13px] leading-relaxed text-white/50">
                            {en
                                ? 'Tip: if something looks strange from the top, rotate to the side. Depth changes everything.'
                                : 'Dica: se algo parecer estranho na vista superior, gire para o lado. A profundidade muda tudo.'}
                        </p>
                    </Section>

                    <SwitchModeHint en={en} targetMode="orbit" />
                </div>
            </div>

            <div className="rounded-lg border border-white/8 bg-black/20 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-white/55">
                    {en
                        ? "Now you have everything you need. Rotate, zoom, click on objects — and if you want to understand an asteroid's full trajectory, switch to orbit mode."
                        : 'Agora você tem tudo que precisa. Gire, aproxime, clique nos objetos — e se quiser entender a trajetória completa de um asteroide, troque para o modo órbita.'}
                </p>
            </div>

            <CuriositiesSection en={en} mode="radar" />
        </div>
    );
}

function OrbitFriendly({ en }: { en: boolean }) {
    return (
        <div className="space-y-6">

            <Callout icon="orbit">
                <p className="text-sm leading-relaxed text-white/80">
                    {en
                        ? "Think of a car on a racetrack. The radar mode showed where the car is right now — its real-time position. This mode shows the entire track. The scale jumped from thousands to hundreds of millions of kilometres. The Sun is now at the centre, and that glowing oval is the complete path this asteroid has been travelling — the same loop, repeated for millions of years."
                        : 'Pense em um carro numa pista de corrida. O modo radar mostrava onde o carro está agora — sua posição em tempo real. Este modo mostra a pista inteira. A escala saltou de milhares para centenas de milhões de quilômetros. O Sol agora está no centro, e aquele oval brilhante é o caminho completo que este asteroide percorre — o mesmo loop, repetido há milhões de anos.'}
                </p>
            </Callout>

            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-5">

                    <Section title={en ? 'What changed — and why it matters' : 'O que mudou — e por que importa'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? "You're no longer looking at Earth's neighbourhood. The scale jumped from thousands of kilometres to hundreds of millions — and for the first time, the distances are real. No compression. That oval you see is the actual shape of the orbit."
                                : 'Você não está mais olhando para a vizinhança da Terra. A escala saltou de milhares para centenas de milhões de quilômetros — e pela primeira vez, as distâncias são reais. Sem compressão. Aquele oval que você vê é a forma real da órbita.'}
                        </p>
                        <HighlightBox>
                            {en
                                ? <><strong className="text-white">If the oval looks stretched, the orbit really is stretched.</strong> A nearly circular oval means a nearly circular orbit.</>
                                : <><strong className="text-white">Se o oval parece esticado, a órbita realmente é esticada.</strong> Um oval quase circular significa uma órbita quase circular.</>}
                        </HighlightBox>
                    </Section>

                    <Section title={en ? 'How to read this view' : 'Como ler essa vista'}>
                        <div className="space-y-2.5">
                            <ReadingStep
                                label={en ? "1. The oval is the asteroid's road" : '1. O oval é a estrada do asteroide'}
                                text={en
                                    ? "That glowing ellipse is the path the asteroid follows forever — the same loop, year after year. Notice the Sun isn't at the centre of the oval. It sits at one of the two focal points, which is why the oval looks off-centre."
                                    : 'Aquela elipse brilhante é o caminho que o asteroide segue para sempre — o mesmo loop, ano após ano. Note que o Sol não está no centro do oval. Ele fica em um dos dois focos, por isso o oval parece descentrado.'}
                            />
                            <ReadingStep
                                label={en ? '2. The bright dot is where it is right now' : '2. O ponto brilhante é onde ele está agora'}
                                text={en
                                    ? "The dot on the ellipse marks today's position. As days pass, it moves along the oval — faster near the Sun, slower far away."
                                    : 'O ponto na elipse marca a posição de hoje. Com o passar dos dias, ele avança pelo oval — mais rápido perto do Sol, mais devagar longe dele.'}
                            />
                            <ReadingStep
                                label={en ? '3. Does the oval come near where Earth orbits?' : '3. O oval passa perto de onde a Terra orbita?'}
                                text={en
                                    ? "Earth orbits about 1 AU from the Sun — 1 AU (Astronomical Unit) is the average Earth–Sun distance, roughly 150 million kilometres. If this ellipse passes through that distance at any point, the two bodies share a crossing zone. But that doesn't automatically mean danger — the orbital tilt (how steeply the orbit is angled relative to Earth's plane) determines whether they actually get close. That's why the next step matters."
                                    : 'A Terra orbita a cerca de 1 UA do Sol — 1 UA (Unidade Astronômica) é a distância média entre a Terra e o Sol, aproximadamente 150 milhões de quilômetros. Se essa elipse passa por essa distância em algum ponto, os dois corpos compartilham uma zona onde seus caminhos se cruzam. Mas isso não significa necessariamente perigo — a inclinação da órbita (o quanto ela está "tombada" em relação ao plano da Terra) determina se eles chegam a se aproximar de verdade. É por isso que o próximo passo é tão importante.'}
                            />
                            <ReadingStep
                                label={en ? '4. Always rotate to check the tilt' : '4. Sempre gire para ver a inclinação'}
                                text={en
                                    ? "From above, orbits look flat. But many asteroid orbits are steeply tilted — passing far above or below the plane where Earth travels. An orbit that looks like it crosses Earth's from above might actually miss by tens of millions of kilometres. The side view reveals this."
                                    : 'Visto de cima, as órbitas parecem planas. Mas muitas órbitas de asteroides são bem inclinadas — passando muito acima ou abaixo do plano onde a Terra viaja. Uma órbita que parece cruzar a da Terra vista de cima pode na verdade passar dezenas de milhões de quilômetros acima ou abaixo. A vista lateral revela isso.'}
                            />
                        </div>
                    </Section>
                </div>

                <div className="space-y-5">
                    <OrbitGuideDiagram locale={en ? 'en' : 'pt-BR'} />

                    <Section title={en ? 'What you see on the map' : 'O que você vê no mapa'}>
                        <div className="space-y-2">
                            <VisualKey color="bg-orange-400" label={en ? 'Glowing sphere at centre' : 'Esfera brilhante no centro'} desc={en ? 'The Sun. Everything orbits it.' : 'O Sol. Tudo orbita ao redor dele.'} />
                            <VisualKey color="bg-violet-400" shape="ellipse" label={en ? 'Glowing oval line' : 'Linha oval brilhante'} desc={en ? "The asteroid's complete orbit — the same road, every year." : 'A órbita completa do asteroide — a mesma estrada, todo ano.'} />
                            <VisualKey color="bg-white" label={en ? 'Bright dot on the oval' : 'Ponto brilhante no oval'} desc={en ? "Where the asteroid is today. It moves as days pass." : 'Onde o asteroide está hoje. Ele avança com o passar dos dias.'} />
                        </div>
                    </Section>

                    <SwitchModeHint en={en} targetMode="radar" />
                </div>
            </div>

            <div className="rounded-lg border border-white/8 bg-black/20 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-white/55">
                    {en
                        ? "Now you know how to read an orbit. To see where the asteroid is relative to Earth right now, switch back to radar mode."
                        : 'Agora você sabe ler uma órbita. Para ver onde o asteroide está em relação à Terra agora, troque para o modo radar.'}
                </p>
            </div>

            <CuriositiesSection en={en} mode="orbit" />
        </div>
    );
}

// ─── Curiosities / FAQ ──────────────────────────────────────────────────────

const EN_CURIOSITIES: { q: string; a: string }[] = [
    {
        q: "Why do asteroids have names like 2026 KX1?",
        a: "Every newly spotted asteroid gets a provisional designation following a strict code. The four digits are the year of discovery. The first letter after the year is the half-month when it was found (A = first half of January, B = second half of January … Y = second half of December, skipping I). The second letter is the order within that period, and the number is how many times that letter has been cycled through. So ‘2026 KX1’ means: discovered in 2026, in the second half of May (K), 24th object in the sequence (X), second cycle (1). Once an asteroid’s orbit is well confirmed and it meets certain fame criteria — like being a notable near-Earth object or having a mission dedicated to it — it can receive a permanent number and, eventually, an honorary name.",
    },
    {
        q: "Why do some asteroids have proper names, like Bennu or Apophis?",
        a: "When an asteroid is given a permanent catalogue number (which happens once its orbit is well determined), the discoverers earn the right to propose a name to the International Astronomical Union. Names are usually drawn from mythology, literature, science, or are tributes to people and places. Bennu is named after an ancient Egyptian bird deity. Apophis comes from the Egyptian god of chaos. Not all numbered asteroids get a name — there are over a million catalogued objects and naming them all would be impossible, so only the more prominent ones end up with a proper name.",
    },
    {
        q: "What is the difference between an asteroid and a comet?",
        a: "Both are small bodies left over from the formation of the solar system, but their composition and behaviour differ. Asteroids are mostly rocky or metallic and live mainly in the asteroid belt between Mars and Jupiter. Comets are icy bodies — a mix of frozen gases, dust, and rock — that come from the outer solar system. When a comet gets close to the Sun, the ice vaporises and creates the bright tail we see from Earth. An asteroid approaching the Sun does not produce a tail. In practice the boundary can blur: some objects classified as asteroids have been caught showing faint comet-like activity when heated.",
    },
    {
        q: "What makes an asteroid more dangerous according to NASA?",
        a: "Several factors stack up: size (larger objects release far more energy), orbit (does its path cross Earth’s?), and how close those crossings get over the next few centuries. NASA uses a metric called the Palermo Technical Scale and the simpler Torino Scale to quantify impact risk. A body needs to be at least ~140 m across to cause regional devastation, so that size is the official threshold for a Potentially Hazardous Asteroid (PHA). Objects tagged with the ⚠️ warning on this radar are tracked by NASA’s Center for Near Earth Object Studies (CNEOS) because at some point in their computed future they accumulate a non-zero — though usually very tiny — impact probability.",
    },
    {
        q: "Could Earth be hit by one of the asteroids on this radar?",
        a: "Technically these are all near-Earth objects, but being nearby does not mean being on a collision course. Most will miss by thousands or even millions of kilometres. The distances shown on this radar are real — they just look close because the visualization is compressed to fit the screen. The asteroids marked ⚠️ are the ones worth watching: scientists track them over years, refining their orbits with each new observation. In most cases, more data rules out the impact. If a genuine threat were ever confirmed, space agencies already have deflection concepts tested — NASA’s DART mission in 2022 proved we can deliberately change an asteroid’s speed.",
    },
    {
        q: "How fast are these asteroids moving?",
        a: "Near-Earth asteroids typically travel at 10 to 30 km/s relative to Earth — that is 36,000 to 108,000 km/h. For comparison, the International Space Station orbits at about 7.7 km/s. The motion cones you see on the radar point in the direction each object is heading at this very moment, using the velocity vector provided by JPL Horizons.",
    },
    {
        q: "Could one of these rocks crash into the Moon?",
        a: "Yes, but the Moon is a very small target. Most of the craters you see on its surface are the result of impacts over the past four billion years. Today the bombardment rate is much lower than in the early solar system. The Moon has no atmosphere, so it cannot slow objects down — anything that hits lands with full force, which is why its surface is so heavily cratered compared to Earth, where most incoming rocks burn up before landing.",
    },
];

const PT_CURIOSITIES: { q: string; a: string }[] = [
    {
        q: "Por que os asteroides têm nomes como 2026 KX1?",
        a: "Todo asteroide recém-descoberto recebe uma designação provisória seguindo um código rígido. Os quatro dígitos são o ano da descoberta. A primeira letra depois do ano indica a quinzena em que ele foi encontrado (A = primeira metade de janeiro, B = segunda metade de janeiro… Y = segunda metade de dezembro, pulando o I). A segunda letra indica a ordem dentro daquela quinzena, e o número indica quantas vezes aquela letra foi reciclada. Então ‘2026 KX1’ significa: descoberto em 2026, na segunda metade de maio (K), 24º objeto na sequência (X), segundo ciclo (1). Quando a órbita é bem confirmada e o objeto atende a certos critérios de relevância — como ser um NEO notável ou ter uma missão dedicada a ele —, ele pode receber um número permanente e, eventualmente, um nome.",
    },
    {
        q: "Por que alguns asteroides têm nomes próprios, como Bennu ou Apophis?",
        a: "Quando um asteroide recebe um número permanente de catálogo (o que ocorre depois que sua órbita é bem determinada), os descobridores ganham o direito de propor um nome à União Astronômica Internacional. Os nomes geralmente vêm da mitologia, da literatura, da ciência ou são homenagens a pessoas e lugares. Bennu é o nome de uma divindade-pássaro do Egito antigo. Apophis vem do deus egípcio do caos. Nem todo asteroide numerado ganha um nome — há mais de um milhão de objetos catalogados, então só os mais proeminentes acabam recebendo um nome próprio.",
    },
    {
        q: "Qual a diferença entre um asteroide e um cometa?",
        a: "Ambos são pequenos corpos remanescentes da formação do sistema solar, mas composição e comportamento diferem. Asteroides são majoritariamente rochosos ou metálicos e vivem principalmente no cinturão de asteroides entre Marte e Júpiter. Cometas são corpos gelados — uma mistura de gases congelados, poeira e rocha — que vêm do sistema solar externo. Quando um cometa se aproxima do Sol, o gelo vaporiza e cria a cauda brilhante que vemos da Terra. Um asteroide se aproximando do Sol não produz cauda. Na prática o limite pode ser tênue: alguns objetos classificados como asteroides já foram flagrados com atividade cometária fraca quando aquecidos.",
    },
    {
        q: "O que faz um asteroide ser considerado mais perigoso pela NASA?",
        a: "Vários fatores se somam: tamanho (objetos maiores liberam muito mais energia), órbita (o caminho dele cruza a da Terra?) e o quão próximas essas interseções ficam ao longo dos próximos séculos. A NASA usa uma métrica chamada Escala Palermo e a mais simples Escala de Torino para quantificar o risco de impacto. Um objeto precisa ter pelo menos ~140 m de diâmetro para causar devastação regional, então esse é o limite oficial para um Asteroide Potencialmente Perigoso (PHA). Os objetos marcados com ⚠️ neste radar são monitorados pelo CNEOS da NASA porque, em algum ponto de seu futuro calculado, acumulam uma probabilidade de impacto não nula — embora em geral muito pequena.",
    },
    {
        q: "A Terra pode ser atingida por um dos asteroides deste radar?",
        a: "Tecnicamente todos são objetos próximos da Terra, mas estar perto não significa estar em rota de colisão. A maioria passará a milhares ou mesmo milhões de quilômetros de distância. As distâncias mostradas no radar são reais — só parecem pequenas porque a visualização é comprimida para caber na tela. Os asteroides marcados com ⚠️ são os que valem atenção: cientistas os monitoram por anos, refinando a órbita a cada nova observação. Na maioria dos casos, mais dados descartam o impacto. Se uma ameaça genuína fosse confirmada, agências espaciais já têm conceitos de deflexão testados — a missão DART da NASA em 2022 provou que é possível mudar deliberadamente a velocidade de um asteroide.",
    },
    {
        q: "Com que velocidade esses asteroides se movem?",
        a: "Asteroides próximos à Terra tipicamente viajam a 10–30 km/s em relação à Terra — ou seja, de 36.000 a 108.000 km/h. Para comparação, a Estação Espacial Internacional orbita a cerca de 7,7 km/s. Os cones de movimento que você vê no radar apontam para a direção em que cada objeto está indo neste exato momento, usando o vetor de velocidade fornecido pelo JPL Horizons.",
    },
    {
        q: "Uma dessas rochas poderia colidir com a Lua?",
        a: "Sim, mas a Lua é um alvo bem pequeno. A maioria das crateras que você vê na sua superfície é resultado de impactos ao longo dos últimos quatro bilhões de anos. Hoje a taxa de bombardeio é muito menor do que no início do sistema solar. A Lua não tem atmosfera, então não consegue desacelerar os objetos — tudo que chega pousa com força total, o que explica por que a sua superfície é tão craterada em comparação com a Terra, onde a maioria das rochas se queima antes de pousar.",
    },
];

const EN_ORBIT_CURIOSITIES: { q: string; a: string }[] = [
    {
        q: "Why do planets and asteroids orbit in ellipses and not circles?",
        a: "Johannes Kepler discovered in the early 1600s that orbits are ellipses — and Isaac Newton later explained why: gravity from the Sun pulls the body continuously, but the body also has sideways momentum. The balance between those two forces traces a perfect ellipse. A circle is just a special case of an ellipse where both focal points coincide at the centre. Most asteroids have slightly stretched ellipses; comets can have extremely elongated ones that send them far out into the solar system.",
    },
    {
        q: "What are the two focal points of an ellipse, and why does the Sun sit in one of them?",
        a: "An ellipse has two special points called foci (singular: focus) — the 'off-centre' points that define its shape. Kepler's first law states that the Sun sits at one focus of every planet's or asteroid's orbit. The other focus is empty. This means the body is closer to the Sun at one end of its orbit (perihelion) and farther at the other (aphelion). That varying distance is why objects speed up when near the Sun and slow down when far away.",
    },
    {
        q: "Why does an asteroid move faster when it is close to the Sun?",
        a: "This is Kepler's second law, also called the 'equal areas' law. As an asteroid gets closer to the Sun, the Sun's gravity pulls it harder, accelerating it. To conserve angular momentum — a fundamental law of physics — the asteroid sweeps out equal areas of its orbit in equal times. Near perihelion, where the orbit is narrow, it must travel fast to sweep the same area as it does slowly near aphelion, where the orbit is wide. The effect is dramatic for elongated orbits: some comets near the Sun move tens of times faster than when they are far away.",
    },
    {
        q: "What does 'eccentricity' mean, and what does it tell us about an orbit?",
        a: "Eccentricity (e) measures how stretched an ellipse is, on a scale from 0 to 1 (for bound orbits). e = 0 is a perfect circle. e close to 1 is a very elongated, thin ellipse. Earth's orbit has e ≈ 0.017 — almost circular. Many near-Earth asteroids have e between 0.1 and 0.6. Halley's comet has e ≈ 0.97 — an extreme ellipse that takes it from inside Venus's orbit out beyond Neptune. A value above 1 means the object is not bound to the Sun at all and will fly away forever.",
    },
    {
        q: "What is orbital inclination, and why do some orbits look tilted?",
        a: "Inclination (i) is the angle between the orbit's plane and the ecliptic — the flat plane where Earth orbits. i = 0° means the orbit lies exactly in Earth's plane; i = 90° means it orbits perpendicular to it. Most planets have low inclinations (under 7°). Asteroids can be wildly tilted: some have i > 60°, meaning they cross Earth's orbital plane at a steep angle. This is crucial for impact risk: even if an orbit crosses Earth's path, a highly inclined orbit only intersects the ecliptic at two specific points — the asteroid and Earth must be at the same point at the same time.",
    },
    {
        q: "What is perihelion and why does it matter for Earth?",
        a: "Perihelion is the point in an orbit where the body is closest to the Sun. For an asteroid to come close to Earth, its perihelion (or part of its orbit near perihelion) must be in the region where Earth orbits — roughly 0.9 to 1.1 AU from the Sun. Astronomers call these 'Earth-crossers.' An asteroid with perihelion at 0.5 AU and aphelion at 3 AU will spend most of its time far from Earth — but twice per orbit it swings through the inner solar system and could potentially intersect Earth's path.",
    },
    {
        q: "How do astronomers predict an orbit from just a few observations?",
        a: "When an asteroid is first spotted, astronomers measure its position (right ascension and declination) on several nights. With at least three well-separated observations, they can fit an orbit using Gauss's method or similar algorithms. Early fits have large uncertainties — the possible orbit is a wide cone in space. Each new observation constrains the fit further, shrinking the uncertainty region. After months or years of tracking, the orbit is usually known precisely enough to rule out any Earth impact for decades ahead. JPL's Horizons system, used by this radar, maintains these refined solutions.",
    },
];

const PT_ORBIT_CURIOSITIES: { q: string; a: string }[] = [
    {
        q: "Por que planetas e asteroides orbitam em elipses e não em círculos?",
        a: "Johannes Kepler descobriu no início do século XVII que as órbitas são elipses — e Isaac Newton explicou o porquê: a gravidade do Sol puxa o corpo continuamente, mas o corpo também tem momento angular lateral. O equilíbrio entre essas duas forças traça uma elipse perfeita. Um círculo é apenas um caso especial de elipse onde os dois focos coincidem no centro. A maioria dos asteroides tem elipses levemente esticadas; cometas podem ter elipses extremamente alongadas que os mandam para longe do sistema solar.",
    },
    {
        q: "O que são os dois focos de uma elipse, e por que o Sol fica em um deles?",
        a: "Uma elipse tem dois pontos especiais chamados focos — os pontos 'fora do centro' que definem sua forma. A primeira lei de Kepler diz que o Sol fica em um dos focos de cada órbita planetária ou de asteroide. O outro foco está vazio. Isso significa que o corpo fica mais perto do Sol em um extremo da órbita (periélio) e mais longe no outro (afélio). Essa distância variável explica por que os objetos aceleram quando estão perto do Sol e desaceleram quando estão longe.",
    },
    {
        q: "Por que um asteroide se move mais rápido quando está perto do Sol?",
        a: "Essa é a segunda lei de Kepler, também chamada de lei das 'áreas iguais'. Quando um asteroide se aproxima do Sol, a gravidade solar puxa-o com mais força, acelerando-o. Para conservar o momento angular — uma lei fundamental da física —, o asteroide varre áreas iguais da órbita em tempos iguais. Perto do periélio, onde a órbita é estreita, ele precisa ir rápido para varrer a mesma área que varre lentamente no afélio, onde a órbita é larga. O efeito é dramático em órbitas alongadas: alguns cometas perto do Sol se movem dezenas de vezes mais rápido do que quando estão longe.",
    },
    {
        q: "O que significa 'excentricidade' e o que ela revela sobre uma órbita?",
        a: "A excentricidade (e) mede o quanto uma elipse está esticada, numa escala de 0 a 1 (para órbitas ligadas). e = 0 é um círculo perfeito. e próximo de 1 é uma elipse muito alongada e fina. A órbita da Terra tem e ≈ 0,017 — quase circular. Muitos asteroides próximos à Terra têm e entre 0,1 e 0,6. O cometa Halley tem e ≈ 0,97 — uma elipse extrema que o leva de dentro da órbita de Vênus até além de Netuno. Um valor acima de 1 significa que o objeto não está gravitacionalmente ligado ao Sol e vai embora para sempre.",
    },
    {
        q: "O que é inclinação orbital e por que algumas órbitas parecem inclinadas?",
        a: "A inclinação (i) é o ângulo entre o plano da órbita e o eclíptico — o plano plano onde a Terra orbita. i = 0° significa que a órbita fica exatamente no plano da Terra; i = 90° significa que ela orbita perpendicularmente a ele. A maioria dos planetas tem inclinações baixas (abaixo de 7°). Asteroides podem ser bem inclinados: alguns têm i > 60°, cruzando o plano orbital da Terra num ângulo acentuado. Isso é crucial para o risco de impacto: mesmo que uma órbita cruze o caminho da Terra, uma órbita muito inclinada só intercepta o eclíptico em dois pontos específicos — o asteroide e a Terra precisam estar no mesmo ponto ao mesmo tempo.",
    },
    {
        q: "O que é periélio e por que ele importa para a Terra?",
        a: "O periélio é o ponto da órbita onde o corpo está mais próximo do Sol. Para que um asteroide se aproxime da Terra, seu periélio (ou parte de sua órbita perto do periélio) precisa estar na região onde a Terra orbita — aproximadamente entre 0,9 e 1,1 UA do Sol. Os astrônomos chamam esses de 'cruzadores da Terra'. Um asteroide com periélio em 0,5 UA e afélio em 3 UA passa a maior parte do tempo longe da Terra — mas duas vezes por órbita ele passa pelo sistema solar interno e pode potencialmente cruzar o caminho da Terra.",
    },
    {
        q: "Como os astrônomos preveem uma órbita a partir de poucas observações?",
        a: "Quando um asteroide é avistado pela primeira vez, os astrônomos medem sua posição (ascensão reta e declinação) em várias noites. Com pelo menos três observações bem espaçadas, eles conseguem ajustar uma órbita usando o método de Gauss ou algoritmos similares. Os ajustes iniciais têm grandes incertezas — a órbita possível é um cone largo no espaço. Cada nova observação restringe mais o ajuste, reduzindo a região de incerteza. Após meses ou anos de rastreamento, a órbita geralmente é conhecida com precisão suficiente para descartar qualquer impacto com a Terra por décadas. O sistema Horizons do JPL, usado por este radar, mantém essas soluções refinadas.",
    },
];

function CuriositiesSection({ en, mode }: { en: boolean; mode: SceneMode }) {
    const items = mode === 'orbit'
        ? (en ? EN_ORBIT_CURIOSITIES : PT_ORBIT_CURIOSITIES)
        : (en ? EN_CURIOSITIES : PT_CURIOSITIES);
    const title = mode === 'orbit'
        ? (en ? 'Orbit curiosities' : 'Curiosidades sobre órbitas')
        : (en ? 'Curiosities — your questions answered' : 'Curiosidades — suas perguntas respondidas');
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
            <div className="space-y-3">
                {items.map((item) => (
                    <CuriosityItem key={item.q} question={item.q} answer={item.a} />
                ))}
            </div>
        </section>
    );
}

function CuriosityItem({ question, answer }: { question: string; answer: string }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="rounded-md border border-white/8 bg-black/15 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-signal-cyan"
            >
                <span className="text-[13px] font-medium text-white/85 leading-relaxed">{question}</span>
                <span className={['mt-0.5 shrink-0 text-white/40 transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}>
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6l5 5 5-5" />
                    </svg>
                </span>
            </button>
            {open && (
                <div className="border-t border-white/8 px-3 pb-3 pt-2.5">
                    <p className="text-[13px] leading-relaxed text-white/65">{answer}</p>
                </div>
            )}
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
                    ? 'This section explains the data pipeline, the math, and the visual approximations behind what you see. Switch to the reading guide if you just need to interpret the scene.'
                    : 'Esta seção explica o pipeline de dados, a matemática e as aproximações visuais por trás do que você vê. Mude para o guia de leitura se você só precisa interpretar a cena.'}
            </p>

            {/* ── 1. Data sources ── */}
            <TechSection title={en ? '1. Data sources' : '1. Fontes de dados'}>
                <div className="space-y-4">
                    <div className="space-y-3">
                        {(en ? [
                            {
                                name: 'NASA NeoWs',
                                sub: 'Near Earth Object Web Service',
                                text: 'Provides the initial list of asteroids approaching Earth within the selected date range: name, estimated diameter, hazard flag, approach date, miss distance and relative velocity. Only covers asteroids (no comets). Queried in parallel windows of up to 8 days due to API limits; cached for up to 6 hours.',
                            },
                            {
                                name: 'JPL CAD',
                                sub: 'SBDB Close Approach Data API',
                                text: 'The second source for the approach list, covering both asteroids and comets. Provides miss distance, velocity, and orbital data for close approaches matching the selected filters. Merged and deduplicated with NeoWs results — the two sources complement each other in coverage.',
                            },
                            {
                                name: 'JPL SBDB',
                                sub: 'Small-Body Database',
                                text: 'Queried for individual object details: physical parameters, full orbital elements, discovery data, and the SPK-ID used to query Horizons. Acts as the identity resolver when an object\'s Horizons ephemeris needs to be fetched.',
                            },
                            {
                                name: 'JPL Horizons',
                                sub: 'Ephemeris System',
                                text: 'The world reference for solar system body ephemerides. Called per-object to retrieve geocentric state vectors — position (x, y, z) and velocity (vx, vy, vz) in the J2000 equatorial frame — for the 3D scene placement, the motion cone, and the trajectory trail. Results cached up to 15–30 minutes.',
                            },
                            {
                                name: 'astronomy-engine',
                                sub: 'local analytical library · no network call',
                                text: 'Computes Sun position (light direction), Moon position and phase, Earth\'s heliocentric position (orbit view), and the subsolar point that drives the day/night terminator shader. Based on USNO/NOVAS algorithms — high-precision results for the inner solar system with no external API round-trip.',
                            },
                        ] : [
                            {
                                name: 'NASA NeoWs',
                                sub: 'Near Earth Object Web Service',
                                text: 'Fornece a lista inicial de asteroides que se aproximam da Terra no período selecionado: nome, diâmetro estimado, flag de perigo, data de aproximação, distância de miss e velocidade relativa. Cobre apenas asteroides (sem cometas). Consultado em janelas paralelas de até 8 dias devido a limites da API; cache de até 6 horas.',
                            },
                            {
                                name: 'JPL CAD',
                                sub: 'SBDB Close Approach Data API',
                                text: 'Segunda fonte da lista de aproximações, cobrindo asteroides e cometas. Fornece distância de miss, velocidade e dados orbitais para aproximações que satisfazem os filtros selecionados. Mesclado e deduplicado com os resultados do NeoWs — as duas fontes se complementam em cobertura.',
                            },
                            {
                                name: 'JPL SBDB',
                                sub: 'Small-Body Database',
                                text: 'Consultado para detalhes individuais de objetos: parâmetros físicos, elementos orbitais completos, dados de descoberta e o SPK-ID usado para consultar o Horizons. Funciona como o resolvedor de identidade quando a efeméride Horizons de um objeto precisa ser buscada.',
                            },
                            {
                                name: 'JPL Horizons',
                                sub: 'Sistema de Efemérides',
                                text: 'A referência mundial para efemérides de corpos do sistema solar. Chamado por objeto para entregar vetores de estado geocêntricos — posição (x, y, z) e velocidade (vx, vy, vz) no referencial equatorial J2000 — para posicionamento na cena 3D, o cone de movimento e a trilha de trajetória. Cache de 15–30 minutos.',
                            },
                            {
                                name: 'astronomy-engine',
                                sub: 'biblioteca analítica local · sem chamada de rede',
                                text: 'Calcula a posição do Sol (direção da luz), posição e fase da Lua, posição heliocêntrica da Terra (vista de órbita) e o ponto subsolar que alimenta o shader do terminador dia/noite. Baseada em algoritmos USNO/NOVAS — resultados de alta precisão para o sistema solar interno sem API externa.',
                            },
                        ]).map((src) => (
                            <div key={src.name} className="rounded-md border border-white/8 bg-black/15 px-3 py-2.5">
                                <p className="text-[13px] font-semibold text-white/85">
                                    {src.name}{' '}
                                    <span className="font-normal text-white/40">{src.sub}</span>
                                </p>
                                <p className="mt-1 text-[12px] leading-relaxed text-white/60">{src.text}</p>
                            </div>
                        ))}
                    </div>
                    <TechLegend en={en} items={en
                        ? [
                            { kind: 'observed', label: 'From NeoWs + CAD: approach list, distances, velocities, hazard flag' },
                            { kind: 'observed', label: 'From SBDB: physical parameters, orbital elements, SPK-ID' },
                            { kind: 'observed', label: 'From Horizons: asteroid position r, velocity v (per-object, for the 3D scene)' },
                            { kind: 'calculated', label: 'Locally: Sun/Moon/Earth positions, subsolar point, distance units, log compression, cone direction, trail' },
                            { kind: 'visual', label: 'Visual choice: body radii amplified ~10,000–100,000×; trail window −24 h / +72 h' },
                        ]
                        : [
                            { kind: 'observed', label: 'NeoWs + CAD: lista de aproximações, distâncias, velocidades, flag de perigo' },
                            { kind: 'observed', label: 'SBDB: parâmetros físicos, elementos orbitais, SPK-ID' },
                            { kind: 'observed', label: 'Horizons: posição r e velocidade v do asteroide (por objeto, para a cena 3D)' },
                            { kind: 'calculated', label: 'Localmente: posições do Sol/Lua/Terra, ponto subsolar, unidades de distância, compressão log, direção do cone, trilha' },
                            { kind: 'visual', label: 'Escolha visual: raios dos corpos amplificados ~10.000–100.000×; janela da trilha −24 h / +72 h' },
                        ]
                    } />
                </div>
            </TechSection>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-5">
                    <RadarGuideDiagram locale={locale} technical />

                    {/* ── 2. Coordinate frame ── */}
                    <TechSection title={en ? '2. Coordinate frame and axis mapping' : '2. Referencial de coordenadas e mapeamento de eixos'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'JPL Horizons delivers vectors in the geocentric J2000 equatorial frame. "J2000" is the standard epoch: Earth\'s mean equatorial plane at noon TDB on 1 Jan 2000. "Geocentric" means Earth is at the origin — all coordinates measure each object\'s position relative to Earth\'s centre.'
                                : 'O JPL Horizons entrega vetores no referencial equatorial geocêntrico J2000. "J2000" é o epoch padrão: o plano equatorial médio da Terra ao meio-dia TDB em 1 jan 2000. "Geocêntrico" significa que a Terra está na origem — todas as coordenadas medem a posição de cada objeto em relação ao centro da Terra.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? "Sun and Moon vectors from astronomy-engine are also in J2000 equatorial, then rotated to the J2000 ecliptic frame (where Z points to the ecliptic north pole). All geocentric vectors — asteroids, Moon, Sun — then go through the same axis remap before placement in the Three.js scene:"
                                : 'Os vetores do Sol e da Lua calculados pelo astronomy-engine também estão em J2000 equatorial, depois rotacionados para o referencial eclíptico J2000 (onde Z aponta para o polo norte eclíptico). Todos os vetores geocêntricos — asteroides, Lua, Sol — passam pelo mesmo remapeamento de eixos antes de serem posicionados na cena Three.js:'}
                        </p>
                        <div className="mt-2 rounded-md border border-signal-cyan/15 bg-signal-cyan/[0.055] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-cyan-100/88">
                            <div>{en ? 'scene(x, y, z) = (ecl.x, ecl.z, −ecl.y)   ← asteroid / Moon / Sun' : 'cena(x, y, z) = (ecl.x, ecl.z, −ecl.y)   ← asteroide / Lua / Sol'}</div>
                        </div>
                        <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                            {en
                                ? "The ecliptic frame has Z pointing up (north pole). Three.js uses Y-up. Swapping ecliptic Z→scene Y and negating ecliptic Y→scene Z preserves handedness and maps the ecliptic plane onto the horizontal plane of the scene — so the Earth's orbital plane lies flat on screen when viewed from above."
                                : 'O referencial eclíptico tem Z apontando para cima (polo norte). O Three.js usa Y-up. Trocar eclíptico Z→cena Y e negar eclíptico Y→cena Z preserva a orientação (handedness) e mapeia o plano eclíptico para o plano horizontal da cena — assim o plano orbital da Terra fica horizontal na tela quando visto de cima.'}
                        </p>
                    </TechSection>

                    {/* ── 5. Earth illumination ── */}
                    <TechSection title={en ? '5. Earth illumination and terminator' : '5. Iluminação da Terra e terminador'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? "The day/night boundary (terminator) is computed from the subsolar point — the geographic coordinate where the Sun is directly overhead. astronomy-engine provides the Sun's geocentric equatorial coordinates; combining those with Greenwich Apparent Sidereal Time (GAST) gives the real-time sub-solar latitude and longitude."
                                : 'A fronteira dia/noite (terminador) é calculada a partir do ponto subsolar — a coordenada geográfica onde o Sol está a pino. O astronomy-engine fornece as coordenadas equatoriais geocêntricas do Sol; combinadas com o Tempo Sideral Aparente de Greenwich (GAST), resultam na latitude e longitude subsolares em tempo real.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? "Earth's axial tilt (obliquity ≈ 23.4°) is already embedded in the Sun's declination — so the terminator leans differently in summer versus winter with no extra correction needed. The terminator is a visual approximation on a sphere; atmospheric refraction and polar flattening are not modelled."
                                : 'A inclinação axial da Terra (obliquidade ≈ 23,4°) já está embutida na declinação solar — então o terminador inclina diferente no verão versus inverno sem precisar de correção extra. O terminador é uma aproximação visual sobre uma esfera; refração atmosférica e achatamento polar não são modelados.'}
                        </p>
                    </TechSection>
                </div>

                <div className="space-y-4">
                    {/* ── Formula 1 ── */}
                    <FormulaPanel
                        title={en ? '3. Geocentric state vectors → distance units' : '3. Vetores de estado geocêntricos → unidades de distância'}
                        formulas={[
                            'r = (x, y, z)    [km, J2000 geocentric]  ← JPL Horizons',
                            'v = (vx, vy, vz) [km/s]                  ← JPL Horizons',
                            'd_km = ‖r‖',
                            `d_DL = d_km / ${ldKm}   (today's Moon distance)`,
                            `d_AU = d_km / ${auKm}`,
                        ]}
                        note={en
                            ? "All three distance units (km, LD, AU) derive from the same Euclidean norm of r — they are consistent by construction. The Lunar Distance denominator is recalculated each session from astronomy-engine's real Moon position, so '1 LD' reflects today's actual Earth–Moon distance (perigee ≈ 356 500 km, apogee ≈ 406 700 km)."
                            : 'As três unidades de distância (km, DL, UA) derivam da mesma norma euclidiana de r — são consistentes por construção. O denominador da Distância Lunar é recalculado a cada sessão pela posição real da Lua via astronomy-engine, então "1 DL" reflete a distância Terra-Lua real do dia (perigeu ≈ 356.500 km, apogeu ≈ 406.700 km).'}
                    />

                    {/* ── Formula 2 ── */}
                    <FormulaPanel
                        title={en ? '4. Radial log compression — asteroids and Moon' : '4. Compressão radial logarítmica — asteroides e Lua'}
                        formulas={[
                            `R₀ = 8 DL  (= ${nf.format(8 * lunarDistanceKm)} km)`,
                            'K  = 1 / ln(1 + 1/R₀)',
                            'f(r) = K · ln(1 + r/R₀)',
                            'r_scene = f(d_DL) · r̂     r̂ = r/‖r‖',
                        ]}
                        note={en
                            ? 'R₀ = 8 DL is the compression pivot: it sets where the logarithmic curve transitions from nearly linear (objects much closer than R₀) to strongly compressed (objects much farther). At 8 DL the Moon sits well inside the linear region, preserving its visual position, while objects at 50–200 DL — which would be off-screen on a linear scale — are pulled into view. K is derived from R₀ by the constraint f(1) = 1, forcing the Moon to always land at exactly 1 scene unit regardless of its actual distance on a given day. r̂ is computed before compression and reapplied after, so direction and trajectory shape are never distorted. Numbers in the UI are always the original, uncompressed values.'
                            : 'R₀ = 8 DL é o pivô de compressão: define onde a curva logarítmica transita de quase linear (objetos muito mais próximos que R₀) para fortemente comprimida (objetos muito mais distantes). Em 8 DL a Lua fica bem dentro da região linear, preservando sua posição visual, enquanto objetos a 50–200 DL — que estariam fora da tela numa escala linear — são trazidos para dentro da cena. K é derivado de R₀ pela restrição f(1) = 1, forçando a Lua a sempre cair em exatamente 1 unidade de cena independentemente da sua distância real no dia. r̂ é calculado antes e reaplicado depois, então direção e forma das trajetórias nunca são distorcidos. Os números na interface são sempre os valores originais, sem compressão.'}
                    />

                    {/* ── Formula 2b ── */}
                    <FormulaPanel
                        title={en ? '4b. Linear AU scale — planets and their orbits' : '4b. Escala linear em UA — planetas e suas órbitas'}
                        formulas={[
                            'ORBIT_AU_SCALE = f(1 AU in DL)   (same K·ln constant)',
                            en ? 'planet_scene = (ecl.x, 0, −ecl.y) · ORBIT_AU_SCALE' : 'planeta_cena = (ecl.x, 0, −ecl.y) · ORBIT_AU_SCALE',
                            en ? 'planet position ← astronomy-engine HelioState()' : 'posição do planeta ← astronomy-engine HelioState()',
                            en ? 'orbit ellipse ← same scale, lonPerihelion from ephemeris' : 'elipse orbital ← mesma escala, lonPeriélio da efeméride',
                        ]}
                        note={en
                            ? 'Planets (Mercury through Neptune) live in a separate heliocentric layer with a strictly linear scale — 1 AU maps to the same fixed number of scene units everywhere. The ecliptic z component is dropped (y = 0 in scene), so all planetary orbits are projected onto the ecliptic plane. Planet positions come from astronomy-engine\'s HelioState(), which returns real heliocentric position and velocity. The perihelion longitude orienting each orbit ellipse is derived from those live vectors — not from a fixed table — so the ellipse always passes exactly through the planet\'s projected position.'
                            : 'Os planetas (de Mercúrio a Netuno) vivem numa camada heliocêntrica separada com escala estritamente linear — 1 UA mapeia para o mesmo número fixo de unidades de cena em todo lugar. A componente z eclíptica é descartada (y = 0 na cena), então todas as órbitas planetárias são projetadas no plano eclíptico. As posições dos planetas vêm do HelioState() do astronomy-engine, que retorna posição e velocidade heliocêntricas reais. A longitude do periélio que orienta cada elipse orbital é derivada desses vetores ao vivo — não de uma tabela fixa — então a elipse sempre passa exatamente pela posição projetada do planeta.'}
                    />

                    {/* ── Formula 3 ── */}
                    <FormulaPanel
                        title={en ? '6. Motion cone and trajectory trail' : '6. Cone de movimento e trilha de trajetória'}
                        formulas={[
                            'û = v / ‖v‖              (unit velocity vector)',
                            en ? 'cone direction ← û  (physically real)' : 'direção do cone ← û  (fisicamente real)',
                            en ? 'trail ← Horizons ephemeris, −24 h to +72 h, 1 h steps' : 'trilha ← efeméride Horizons, −24 h a +72 h, passo 1 h',
                            en ? 'trail_scene = same f() compression per point' : 'trilha_cena = mesma compressão f() por ponto',
                        ]}
                        note={en
                            ? "The cone points in the true geocentric velocity direction — if it aims toward Earth the object is approaching. The trail is sampled from the Horizons ephemeris over a window of −24 h to +72 h around the current moment (1-hour steps), with the same log compression applied to each point. It shows the qualitative path shape, not a quantitative prediction: the dashed segment ahead of the object represents the next 72 hours, not a long-range forecast."
                            : 'O cone aponta na direção real da velocidade geocêntrica — se aponta para a Terra o objeto está se aproximando. A trilha é amostrada da efeméride Horizons numa janela de −24 h a +72 h em torno do momento atual (passos de 1 hora), com a mesma compressão logarítmica aplicada a cada ponto. Mostra a forma qualitativa do caminho, não uma previsão quantitativa: o segmento tracejado adiante do objeto representa as próximas 72 horas, não uma projeção de longo prazo.'}
                    />

                    {/* ── Body models ── */}
                    <TechSection title={en ? '7. 3D body models and data freshness' : '7. Modelos 3D de corpos e atualização dos dados'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'When NASA has a published shape model (Bennu, Ceres, Eros, Itokawa, Vesta), that asset is loaded. All other bodies are rendered as representative rock meshes. Visual radii are amplified by roughly 10,000–100,000× relative to true diameter — a 200 m asteroid would be sub-pixel at scene scale. Only the visual mesh is affected; distances in the data panel are always the original values.'
                                : 'Quando a NASA tem um modelo de forma publicado (Bennu, Ceres, Eros, Itokawa, Vesta), esse asset é carregado. Todos os outros corpos são renderizados como malhas de rocha representativas. Os raios visuais são amplificados cerca de 10.000–100.000× em relação ao diâmetro real — um asteroide de 200 m seria sub-pixel na escala da cena. Apenas a malha visual é afetada; as distâncias no painel de dados são sempre os valores originais.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'Asteroid data is cached for up to 15 minutes for current positions and up to 30 minutes for trajectory windows. If Horizons does not return data for an object (timeout, insufficient observational arc, or no computed ephemeris), that object does not appear — no locally generated fallback is used. Newly discovered objects with only a few days of observations will have less accurate orbital solutions.'
                                : 'Os dados dos asteroides são cacheados por até 15 minutos para posições atuais e até 30 minutos para janelas de trajetória. Se o Horizons não retornar dados para um objeto (timeout, arco observacional insuficiente ou efeméride não calculada), o objeto não aparece — nenhum fallback gerado localmente é usado. Objetos recém-descobertos com apenas alguns dias de observações terão soluções orbitais menos precisas.'}
                        </p>
                    </TechSection>
                </div>
            </div>

            {/* ── Interpretation guide ── */}
            <TechSection title={en ? '8. How to interpret the radar technically' : '8. Como interpretar o radar com olhos técnicos'}>
                <div className="grid gap-3 sm:grid-cols-2">
                    <TechInterpretItem
                        label={en ? 'Cone direction' : 'Direção do cone'}
                        text={en
                            ? 'Geocentric velocity unit vector û. Pointing toward Earth = approaching. Pointing away = receding. A cone aimed sideways means the closest approach happens off the approach axis.'
                            : 'Vetor unitário de velocidade geocêntrica û. Apontando para a Terra = aproximando. Apontando para fora = afastando. Um cone lateral indica que a maior aproximação ocorre fora do eixo de aproximação.'}
                    />
                    <TechInterpretItem
                        label={en ? 'Trail curvature' : 'Curvatura da trilha'}
                        text={en
                            ? 'A sharply curved trail indicates strong geocentric acceleration — a close flyby in progress. A nearly straight trail means the object is far enough that Earth\'s gravity barely bends its path.'
                            : 'Uma trilha com curvatura acentuada indica aceleração geocêntrica intensa — uma passagem próxima em curso. Uma trilha quase reta significa que o objeto está longe o suficiente para a gravidade terrestre mal dobrar seu caminho.'}
                    />
                    <TechInterpretItem
                        label={en ? 'Top view vs. side view' : 'Vista superior vs. lateral'}
                        text={en
                            ? 'The top view projects positions onto the ecliptic plane. Two objects close together in this view may be far apart in depth (orbital inclination). Always rotate to the side view before judging physical proximity.'
                            : 'A vista superior projeta posições no plano eclíptico. Dois objetos próximos nessa vista podem estar separados em profundidade (inclinação orbital). Sempre gire para a vista lateral antes de julgar proximidade física.'}
                    />
                    <TechInterpretItem
                        label={en ? 'Visual distance vs. real distance' : 'Distância visual vs. distância real'}
                        text={en
                            ? 'Log compression means "twice as far visually" can mean 10–20× farther physically. Perspective projection adds another layer: objects nearer to the camera appear larger. Always read the numbers in the data panel for true distance.'
                            : 'A compressão logarítmica faz com que "o dobro da distância visual" possa significar 10–20× mais longe fisicamente. A projeção em perspectiva adiciona outra camada: objetos mais próximos da câmera parecem maiores. Sempre leia os números no painel de dados para a distância real.'}
                    />
                </div>
            </TechSection>

            {/* ── Limitations ── */}
            <TechSection title={en ? '9. Limitations and technical honesty' : '9. Limitações e honestidade técnica'}>
                <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="pb-2 pr-4 text-left font-semibold text-white/60">{en ? 'Aspect' : 'Aspecto'}</th>
                                <th className="pb-2 text-left font-semibold text-white/60">{en ? 'Situation' : 'Situação'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                            {(en ? [
                                ['Positional accuracy', 'High for objects with long observational arcs (months–years). Lower for recent discoveries (days of data) — the solution can change significantly with more observations.'],
                                ['Orbital model', 'Two-body Keplerian. Planetary perturbations are embedded in the Horizons state vectors at the query epoch, but are not re-integrated locally.'],
                                ['Visual scale', 'Radially compressed (logarithmic). Direction and inclination are exact.'],
                                ['Body size', 'Visual only — amplified 10,000–100,000× for legibility.'],
                                ['Earth illumination', 'Spherical model. Atmospheric refraction and polar flattening not modelled.'],
                                ['Trail ahead', '72-hour ephemeris window, not a long-range forecast.'],
                                ['Data freshness', 'Positions cached up to 15 min; trajectories up to 30 min.'],
                                ['Missing object', 'If Horizons returns no data, the object is absent — no local fallback.'],
                            ] : [
                                ['Precisão posicional', 'Alta para objetos com arco observacional longo (meses–anos). Menor para descobertas recentes (dias de dados) — a solução pode mudar com mais observações.'],
                                ['Modelo orbital', 'Kepleriano de dois corpos. Perturbações planetárias estão embutidas nos vetores de estado do Horizons na época da consulta, mas não são reintegradas localmente.'],
                                ['Escala visual', 'Comprimida radialmente (logarítmica). Direção e inclinação são exatas.'],
                                ['Tamanho dos corpos', 'Visual apenas — amplificado 10.000–100.000× para legibilidade.'],
                                ['Iluminação da Terra', 'Modelo esférico. Refração atmosférica e achatamento polar não modelados.'],
                                ['Trilha futura', 'Janela de 72 horas de efeméride, não uma projeção de longo prazo.'],
                                ['Atualização dos dados', 'Posições cacheadas até 15 min; trajetórias até 30 min.'],
                                ['Objeto ausente', 'Se o Horizons não retornar dados, o objeto não aparece — nenhum fallback local.'],
                            ]).map(([aspect, situation]) => (
                                <tr key={aspect}>
                                    <td className="py-2 pr-4 font-medium text-white/75 align-top">{aspect}</td>
                                    <td className="py-2 text-white/55 leading-relaxed">{situation}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-4 text-[12px] leading-relaxed text-white/40">
                    {en
                        ? 'This is an educational visualisation, not a professional orbital mechanics tool. For impact risk assessment, mission planning, or precision orbital analysis, use JPL CNEOS, Scout, or certified professional software directly.'
                        : 'Esta é uma visualização educativa, não uma ferramenta profissional de mecânica orbital. Para avaliação de risco de impacto, planejamento de missão ou análise orbital de precisão, use diretamente o JPL CNEOS, Scout ou software profissional certificado.'}
                </p>
            </TechSection>
        </div>
    );
}

function OrbitTechnical({ en, locale }: { en: boolean; locale: 'pt-BR' | 'en' }) {
    return (
        <div className="space-y-6">
            <p className="text-sm leading-relaxed text-white/65">
                {en
                    ? 'This section explains how the orbital ellipse is computed and drawn, and what physical theory it rests on. Switch to the reading guide to understand what you are looking at visually.'
                    : 'Esta seção explica como a elipse orbital é calculada e desenhada, e em que teoria física ela se baseia. Mude para o guia de leitura para entender o que você está vendo visualmente.'}
            </p>

            {/* ── Why separate view ── */}
            <TechSection title={en ? '1. Why a separate heliocentric view?' : '1. Por que uma vista heliocêntrica separada?'}>
                <p className="text-sm leading-relaxed text-white/70">
                    {en
                        ? 'The radar uses logarithmic compression calibrated for the Earth neighbourhood (LD scale). The orbit view uses a linear AU scale calibrated for the solar system. Mixing them would mean the same ruler represents different physical distances depending on mode — guaranteed misreading.'
                        : 'O radar usa compressão logarítmica calibrada para a vizinhança da Terra (escala DL). A vista de órbita usa escala linear em UA calibrada para o sistema solar. Misturá-las significaria que a mesma régua representa distâncias físicas diferentes dependendo do modo — leitura errada garantida.'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {en
                        ? 'Keeping them strictly separated means each view has one consistent scale. The radar answers "how close is it right now?" The orbit view answers "what path does gravity keep it on — and does that path ever cross Earth\'s?"'
                        : 'Mantê-las estritamente separadas significa que cada vista tem uma escala consistente. O radar responde "quão perto está agora?" A vista de órbita responde "em que caminho a gravidade o mantém — e esse caminho cruza alguma vez o da Terra?"'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {en
                        ? 'The orbit scale is linear and shape-exact: the ellipse eccentricity, perihelion distance, and inclination are all faithful. Earth is placed from its real heliocentric ephemeris (astronomy-engine), so the Sun direction and Earth–asteroid geometry are physically correct.'
                        : 'A escala de órbita é linear e fiel em forma: a excentricidade da elipse, a distância do periélio e a inclinação são todas exatas. A Terra é posicionada pela sua efeméride heliocêntrica real (astronomy-engine), então a direção do Sol e a geometria Terra-asteroide são fisicamente corretas.'}
                </p>
            </TechSection>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-5">
                    <OrbitGuideDiagram locale={locale} technical />

                    {/* ── Osculating elements explanation ── */}
                    <TechSection title={en ? 'What "osculating" means — and data freshness' : 'O que significa "osculador" — e atualização dos dados'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? 'The solar system is not a two-body problem — Jupiter, Saturn, and other planets exert measurable gravitational pulls on every asteroid. The true trajectory is therefore not a perfect ellipse, but a curve that shifts slightly over time.'
                                : 'O sistema solar não é um problema de dois corpos — Júpiter, Saturno e outros planetas exercem forças gravitacionais mensuráveis em cada asteroide. A trajetória real portanto não é uma elipse perfeita, mas uma curva que se desloca ligeiramente com o tempo.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'An osculating orbit is the best-fit Keplerian ellipse to that real trajectory at a specific instant — the ellipse the body would follow if all other planets suddenly disappeared. JPL Horizons provides these elements at the current solution epoch. They are accurate for months to a few years for typical near-Earth asteroids, but degrade over longer timescales, especially for objects that pass close to Jupiter.'
                                : 'Uma órbita osculadora é a elipse kepleriana que melhor se ajusta a essa trajetória real num instante específico — a elipse que o corpo seguiria se todos os outros planetas desaparecessem. O JPL Horizons fornece esses elementos na época da solução atual. São precisos por meses a alguns anos para asteroides próximos à Terra típicos, mas degradam em escalas de tempo maiores, especialmente para objetos que passam perto de Júpiter.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'The orbital elements (q, e, i, Ω, ω, Tₚ) are fetched from JPL Horizons per object and cached for up to 6 hours — distinct from the radar\'s position cache (15 min). This means the drawn ellipse shape is stable across a session and changes only when the backend refreshes the SBDB solution. The asteroid\'s dot position on the ellipse is always computed locally from the current Julian Date, so it moves in real time without a new network call.'
                                : 'Os elementos orbitais (q, e, i, Ω, ω, Tₚ) são buscados no JPL Horizons por objeto e cacheados por até 6 horas — distinto do cache de posição do radar (15 min). Isso significa que a forma da elipse desenhada é estável ao longo de uma sessão e muda apenas quando o backend renova a solução do SBDB. A posição do ponto do asteroide na elipse é sempre calculada localmente a partir da Data Juliana atual, então ele avança em tempo real sem uma nova chamada de rede.'}
                        </p>
                    </TechSection>
                </div>

                <div className="space-y-4">
                    {/* ── Formula 1: elements ── */}
                    <FormulaPanel
                        title={en ? '2. Osculating orbital elements (input from JPL Horizons)' : '2. Elementos orbitais osculadores (entrada do JPL Horizons)'}
                        formulas={[
                            'q  — perihelion distance [AU]          ← JPL Horizons',
                            'e  — eccentricity  (0 = circle, <1 = ellipse)',
                            'i  — inclination vs. ecliptic [deg]',
                            'Ω  — longitude of ascending node [deg]',
                            'ω  — argument of perihelion [deg]',
                            'Tₚ — time of perihelion passage [JD]',
                        ]}
                        note={en
                            ? 'Six numbers uniquely define a conic section in 3D space. q and e set the ellipse shape and size. i, Ω, ω orient the orbital plane in the J2000 ecliptic frame via three sequential Euler rotations. Tₚ anchors the body\'s position in time along the ellipse.'
                            : 'Seis números definem unicamente uma seção cônica no espaço 3D. q e e definem a forma e o tamanho da elipse. i, Ω, ω orientam o plano orbital no referencial eclíptico J2000 via três rotações de Euler sequenciais. Tₚ ancora a posição do corpo no tempo ao longo da elipse.'}
                    />

                    {/* ── Formula 2: Kepler propagation ── */}
                    <FormulaPanel
                        title={en ? '3. Kepler propagation — position on the ellipse' : '3. Propagação Kepleriana — posição na elipse'}
                        formulas={[
                            'a  = q / (1 − e)           (semi-major axis [AU])',
                            'k  = 0.01720209895         (Gaussian grav. const.)',
                            'n  = k / a^(3/2)           (mean motion [rad/day])',
                            'M  = n · (JD_now − Tₚ)    (mean anomaly)',
                            'E − e·sin(E) = M           (Kepler\'s equation → E)',
                        ]}
                        note={en
                            ? "M grows linearly with time — it's a fictitious angle that would mark the position if the body moved at constant speed. E is the eccentric anomaly, the real angular position on the ellipse. The Gaussian constant k is √(GM☉) in AU–day units, a centuries-old convention that avoids SI unit conversion in orbit calculations. Kepler's equation has no closed-form solution; it's solved by Newton's method, converging in 3–5 iterations for typical eccentricities."
                            : 'M cresce linearmente com o tempo — é um ângulo fictício que marcaria a posição se o corpo se movesse em velocidade constante. E é a anomalia excêntrica, a posição angular real na elipse. A constante gaussiana k é √(GM☉) em unidades UA–dia, convenção secular que evita conversão de unidades SI em cálculos orbitais. A equação de Kepler não tem solução analítica; é resolvida pelo método de Newton, convergindo em 3–5 iterações para excentricidades típicas.'}
                    />

                    {/* ── Formula 3: 3D position ── */}
                    <FormulaPanel
                        title={en ? '4. From orbital plane to 3D ecliptic' : '4. Do plano orbital para o eclíptico 3D'}
                        formulas={[
                            'x = a·(cos E − e)',
                            'y = a·√(1 − e²)·sin E',
                            '(x, y) → perifocal frame (Sun at origin, x toward perihelion)',
                            'R = Rz(Ω) · Rx(i) · Rz(ω)    (Euler rotation)',
                            'p_ecl = R · (x, y, 0)          [AU, J2000 ecliptic]',
                        ]}
                        note={en
                            ? '(x, y) are computed in the perifocal frame — a 2D plane with the Sun at the origin and the x-axis pointing toward perihelion. The composite rotation R applies ω first (orients the ellipse within its plane), then i (tilts the plane relative to the ecliptic), then Ω (rotates the plane around the ecliptic north pole). The result is the body\'s heliocentric position in J2000 ecliptic coordinates.'
                            : '(x, y) são calculados no referencial perifocal — um plano 2D com o Sol na origem e o eixo x apontando para o periélio. A rotação composta R aplica ω primeiro (orienta a elipse dentro do seu plano), depois i (inclina o plano em relação ao eclíptico), depois Ω (gira o plano ao redor do polo norte eclíptico). O resultado é a posição heliocêntrica do corpo em coordenadas eclípticas J2000.'}
                    />

                    {/* ── Formula 4: scene mapping ── */}
                    <FormulaPanel
                        title={en ? '5. Mapping to the 3D scene' : '5. Mapeamento para a cena 3D'}
                        formulas={[
                            '1 AU = ORBIT_AU_SCALE scene units   (linear, no log)',
                            en ? 'asteroid scene(x,y,z) = (x_ecl, z_ecl, y_ecl) · scale' : 'asteroide cena(x,y,z) = (x_ecl, z_ecl, y_ecl) · scale',
                            en ? 'planet  scene(x,y,z) = (x_ecl,    0, −y_ecl) · scale' : 'planeta  cena(x,y,z) = (x_ecl,    0, −y_ecl) · scale',
                            en ? 'Earth, Sun, planets ← astronomy-engine (heliocentric)' : 'Terra, Sol, planetas ← astronomy-engine (heliocêntrico)',
                        ]}
                        note={en
                            ? "Two axis conventions coexist in the same scene. The asteroid orbit uses a full 3D ecliptic mapping (y↔z swap) so inclination is preserved — steeply tilted orbits rise above/below the screen plane. The planet layer projects onto the ecliptic plane (y = 0 always), which is accurate because planetary inclinations are small (< 7°) and the visual difference is sub-pixel. The scale is strictly linear for both: the drawn ellipse has the exact eccentricity and perihelion of the real orbit."
                            : 'Duas convenções de eixos coexistem na mesma cena. A órbita do asteroide usa mapeamento eclíptico 3D completo (troca y↔z) para que a inclinação seja preservada — órbitas muito inclinadas sobem acima ou abaixo do plano da tela. A camada dos planetas é projetada no plano eclíptico (y = 0 sempre), o que é preciso porque as inclinações planetárias são pequenas (< 7°) e a diferença visual é sub-pixel. A escala é estritamente linear para ambos: a elipse desenhada tem a excentricidade e o periélio exatos da órbita real.'}
                    />
                </div>
            </div>

            {/* ── How to interpret ── */}
            <TechSection title={en ? '6. How to interpret the orbit view technically' : '6. Como interpretar a vista de órbita com olhos técnicos'}>
                <div className="grid gap-3 sm:grid-cols-2">
                    <TechInterpretItem
                        label={en ? 'Ellipse shape = eccentricity' : 'Forma da elipse = excentricidade'}
                        text={en
                            ? 'A nearly circular ellipse means e ≈ 0 — the object keeps a nearly constant distance from the Sun. A stretched ellipse (high e) means a large speed difference between perihelion and aphelion, and more time spent in the outer part of the orbit.'
                            : 'Uma elipse quase circular significa e ≈ 0 — o objeto mantém distância quase constante do Sol. Uma elipse esticada (e alto) significa grande diferença de velocidade entre periélio e afélio, e mais tempo passado na parte externa da órbita.'}
                    />
                    <TechInterpretItem
                        label={en ? 'Sun off-centre = Kepler\'s first law' : 'Sol fora do centro = 1ª lei de Kepler'}
                        text={en
                            ? "The Sun sits at one focus of the ellipse, not its geometric centre. This is Kepler's first law. The empty second focus has no physical body — it's a mathematical feature of the ellipse. The asymmetry is why the asteroid moves faster when close to the Sun (Kepler\'s second law)."
                            : 'O Sol fica em um foco da elipse, não no seu centro geométrico. Esta é a 1ª lei de Kepler. O segundo foco vazio não tem corpo físico — é uma característica matemática da elipse. A assimetria explica por que o asteroide se move mais rápido quando está perto do Sol (2ª lei de Kepler).'}
                    />
                    <TechInterpretItem
                        label={en ? 'Tilt = orbital inclination (i)' : 'Inclinação = inclinação orbital (i)'}
                        text={en
                            ? 'Rotating to the side view reveals the orbital inclination. An orbit lying flat on the screen has i ≈ 0° (nearly coplanar with Earth\'s orbit). An orbit that rises sharply above or below the ecliptic plane has high i — it only crosses Earth\'s orbital zone at two specific nodes, making a close approach geometrically less likely.'
                            : 'Girar para a vista lateral revela a inclinação orbital. Uma órbita plana na tela tem i ≈ 0° (quase coplanar com a órbita da Terra). Uma órbita que sobe acentuadamente acima ou abaixo do plano eclíptico tem i alto — ela cruza a zona orbital da Terra em apenas dois nodos específicos, tornando uma aproximação próxima geometricamente menos provável.'}
                    />
                    <TechInterpretItem
                        label={en ? 'Asteroid dot = Kepler propagation · Planet dots = live ephemeris' : 'Ponto do asteroide = Kepler · Pontos dos planetas = efeméride ao vivo'}
                        text={en
                            ? "The asteroid's white dot is placed by solving Kepler's equation for today's Julian Date — a calculated position from JPL Horizons osculating elements. The planet dots (Mercury–Neptune) use a different pipeline: astronomy-engine's HelioState() returns their heliocentric position and velocity directly, with no Kepler solving step. Both pipelines place each body exactly on its drawn ellipse by construction."
                            : 'O ponto branco do asteroide é posicionado resolvendo a equação de Kepler para a Data Juliana de hoje — posição calculada a partir dos elementos osculadores do JPL Horizons. Os pontos dos planetas (Mercúrio–Netuno) usam um pipeline diferente: o HelioState() do astronomy-engine retorna posição e velocidade heliocêntricas diretamente, sem etapa de resolução de Kepler. Ambos os pipelines posicionam cada corpo exatamente sobre sua elipse desenhada por construção.'}
                    />
                </div>
            </TechSection>

            {/* ── Limitations ── */}
            <TechSection title={en ? '7. Limitations' : '7. Limitações'}>
                <div className="space-y-2 text-[13px] leading-relaxed text-white/60">
                    <p>
                        {en
                            ? '⬡ The drawn ellipse is the osculating orbit at the current epoch — it is not a long-term prediction. Planetary perturbations (mainly Jupiter) cause it to drift over years or decades.'
                            : '⬡ A elipse desenhada é a órbita osculadora na época atual — não é uma previsão de longo prazo. Perturbações planetárias (principalmente Júpiter) fazem com que ela se desvie ao longo de anos ou décadas.'}
                    </p>
                    <p>
                        {en
                            ? '⬡ Only bound orbits (e < 1) are drawn. Hyperbolic visitors (e ≥ 1) come from outside the solar system and will not return — their "orbit" is an open curve, not an ellipse.'
                            : '⬡ Apenas órbitas ligadas (e < 1) são desenhadas. Visitantes hiperbólicos (e ≥ 1) vêm de fora do sistema solar e não retornam — sua "órbita" é uma curva aberta, não uma elipse.'}
                    </p>
                    <p>
                        {en
                            ? '⬡ Earth\'s rendered radius is amplified for visibility. Earth\'s orbital position is accurate; its visual size is not.'
                            : '⬡ O raio renderizado da Terra é amplificado para visibilidade. A posição orbital da Terra é precisa; o tamanho visual não é.'}
                    </p>
                    <p>
                        {en
                            ? '⬡ The view shows the full orbit as a closed loop. It does not animate the asteroid moving along the loop — for real-time motion, switch to radar mode.'
                            : '⬡ A vista mostra a órbita completa como um loop fechado. Não anima o asteroide se movendo pelo loop — para movimento em tempo real, mude para o modo radar.'}
                    </p>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-white/40">
                    {en
                        ? 'This is an educational visualisation. For precision orbital mechanics, use JPL Horizons, CNEOS, or certified professional software.'
                        : 'Esta é uma visualização educativa. Para mecânica orbital de precisão, use JPL Horizons, CNEOS ou software profissional certificado.'}
                </p>
            </TechSection>
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

function InteractionHint({ icon, label, desc }: { icon: string; label: string; desc: string }) {
    return (
        <div className="flex items-center gap-2.5 rounded-md border border-white/8 bg-black/15 px-3 py-2">
            <span className="shrink-0 text-base leading-none" aria-hidden>{icon}</span>
            <span className="text-[13px] font-medium text-white/80">{label}</span>
            <span className="text-[12px] text-white/50">{desc}</span>
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

function TechLegend({ items, en }: { items: { kind: 'observed' | 'calculated' | 'visual'; label: string }[]; en: boolean }) {
    const colors: Record<string, string> = {
        observed: 'bg-emerald-400/20 border-emerald-400/30 text-emerald-300',
        calculated: 'bg-sky-400/20 border-sky-400/30 text-sky-300',
        visual: 'bg-amber-400/20 border-amber-400/30 text-amber-300',
    };
    const tags = en
        ? { observed: 'received data', calculated: 'calculated', visual: 'visual choice' }
        : { observed: 'dado recebido', calculated: 'calculado', visual: 'escolha visual' };
    return (
        <div className="mt-3 space-y-1.5">
            {items.map((item) => (
                <div key={item.label} className="flex items-start gap-2">
                    <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${colors[item.kind]}`}>
                        {tags[item.kind]}
                    </span>
                    <span className="text-[12px] leading-relaxed text-white/55">{item.label}</span>
                </div>
            ))}
        </div>
    );
}

function TechInterpretItem({ label, text }: { label: string; text: string }) {
    return (
        <div className="rounded-md border border-white/8 bg-black/15 px-3 py-2.5">
            <p className="text-[13px] font-semibold text-white/85">{label}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/60">{text}</p>
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

                {/* Moon — silver-grey to match the 3D scene */}
                <circle cx="270" cy="141" r="9" fill="url(#rg-moon)" />
                <text x="285" y="146" fill="#cbd5e1" fontSize="13" fontWeight="600">{en ? 'Moon · 1 LD' : 'Lua · 1 DL'}</text>

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
                <text x="270" y="241" textAnchor="middle" fill="#e0f2fe" fontSize="16" fontWeight="700">{en ? 'Earth' : 'Terra'}</text>

                {/* Technical overlays */}
                {technical && (
                    <>
                        {/* vector line Earth → asteroid */}
                        <line x1="270" y1="195" x2="396" y2="112" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.85" strokeDasharray="3 4" />
                        {/* vector label — positioned above and to the right of the midpoint, away from the trail */}
                        <text x="358" y="98" fill="#fef3c7" fontSize="13" fontStyle="italic" textAnchor="middle">r = (x, y, z)</text>
                        {/* formula box — bottom-left corner, clear of all objects */}
                        <rect x="12" y="310" width="240" height="48" rx="5" fill="#0a1628" fillOpacity="0.92" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1" />
                        <text x="22" y="330" fill="#bae6fd" fontSize="13" fontFamily="monospace">r_scene = f(d_DL) · r̂</text>
                        <text x="22" y="349" fill="#bae6fd" fontSize="12" fontFamily="monospace" opacity="0.75">f(r) = K · ln(1 + r/R₀)</text>
                    </>
                )}

                {/* Labels — title + ring labels */}
                <text x="20" y="30" fill="#cbd5e1" fontSize="15" fontWeight="700">{en ? 'Read outward from Earth' : 'Leia saindo da Terra'}</text>
                <text x="20" y="50" fill="#64748b" fontSize="13">{en ? '— numbers in the focus panel are uncompressed' : '— números no painel de foco são descomprimidos'}</text>

                {/* Ring labels */}
                <text x="327" y="192" fill="#475569" fontSize="12">1 DL</text>
                <text x="381" y="192" fill="#334155" fontSize="12">2 DL</text>

                {/* Object labels */}
                <text x="412" y="105" fill="#e2e8f0" fontSize="14">{en ? 'object' : 'objeto'}</text>
                <text x="448" y="72" fill="#67e8f9" fontSize="14" fontWeight="600">{en ? 'moving' : 'movimento'}</text>
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
    // Layout geometry (all x values, cy=205):
    //   Ellipse: a=185, b=90 → c=sqrt(185²-90²)=sqrt(26425)≈162.6
    //   Ellipse centre: cx=270, cy=205  (centred in 540-wide canvas)
    //   Sun (left focus):  270-163=107, 205
    //   Perihelion (leftmost point): 270-185=85, 205
    //   Aphelion (rightmost point):  270+185=455, 205  — safely inside 540
    //   Asteroid position: parametric E≈50° → x=270+185*cos50°≈389, y=205-90*sin50°≈136
    const CX = 270, CY = 205;   // ellipse centre
    const A = 185, B = 90;
    const C = 163;               // focal distance (≈sqrt(185²-90²))
    const SUN_X = CX - C;       // 107
    const PERI_X = CX - A;      // 85  — perihelion
    const AST_X = 389, AST_Y = 136;  // asteroid position (upper right of ellipse)
    return (
        <figure className="overflow-hidden rounded-lg border border-white/10 bg-[#050b15]">
            <svg viewBox="0 0 540 400" className="h-auto w-full" role="img" aria-label={en ? 'Sun-centred orbit diagram' : 'Diagrama orbital centrado no Sol'}>
                <defs>
                    <radialGradient id="og-sun" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#fef9c3" />
                        <stop offset="45%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#7c2d12" />
                    </radialGradient>
                    <marker id="og-arrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L8,3 z" fill="#67e8f9" />
                    </marker>
                    <filter id="og-glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="og-sun-glow">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                <rect width="540" height="400" fill="#050b15" />

                {/* Asteroid orbit ellipse — centred at (270,205), Sun at left focus (107,205) */}
                <ellipse
                    cx={CX} cy={CY} rx={A} ry={B}
                    fill="none" stroke="#a78bfa" strokeOpacity="0.90" strokeWidth="2.5"
                />

                {/* Sun at left focus */}
                <circle cx={SUN_X} cy={CY} r="22" fill="url(#og-sun)" filter="url(#og-sun-glow)" />
                <text x={SUN_X} y={CY + 42} textAnchor="middle" fill="#fed7aa" fontSize="15" fontWeight="700">{en ? 'Sun' : 'Sol'}</text>

                {/* Perihelion — leftmost point of ellipse, closest to Sun */}
                <circle cx={PERI_X} cy={CY} r="4" fill="#fbbf24" opacity="0.85" />
                <text x={PERI_X + 8} y={CY - 10} fill="#fbbf24" fontSize="12" opacity="0.85">{en ? 'perihelion' : 'periélio'}</text>
                <text x={PERI_X + 8} y={CY + 6} fill="#fbbf24" fontSize="11" opacity="0.60">{en ? '(closest to Sun)' : '(mais perto do Sol)'}</text>

                {/* Asteroid on its ellipse (upper right quadrant) */}
                <circle cx={AST_X} cy={AST_Y} r="11" fill="#f8fafc" filter="url(#og-glow)" />
                {/* Velocity arrow — tangent direction at this point, pointing upper-right */}
                <path d={`M${AST_X - 8} ${AST_Y + 7} L${AST_X + 22} ${AST_Y - 22}`} stroke="#67e8f9" strokeWidth="2.5" markerEnd="url(#og-arrow)" />
                <text x={AST_X + 14} y={AST_Y - 6} fill="#e2e8f0" fontSize="13">{en ? 'asteroid' : 'asteroide'}</text>
                <text x={AST_X + 14} y={AST_Y - 21} fill="#67e8f9" fontSize="12" fontWeight="600">{en ? 'moving' : 'movimento'}</text>

                {/* Technical overlays */}
                {technical && (
                    <>
                        {/* Sun → asteroid vector line */}
                        <line x1={SUN_X} y1={CY} x2={AST_X} y2={AST_Y} stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="3 4" />
                        {/* vector label — above the midpoint, clear of the ellipse arc */}
                        <text x={(SUN_X + AST_X) / 2} y={(CY + AST_Y) / 2 - 16} fill="#fef3c7" fontSize="13" fontStyle="italic" textAnchor="middle">p_ecl [AU]</text>
                        {/* formula box — bottom-right, below the ellipse aphelion */}
                        <rect x="286" y="312" width="244" height="66" rx="5" fill="#0a1628" fillOpacity="0.92" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1" />
                        <text x="300" y="331" fill="#bae6fd" fontSize="13" fontFamily="monospace">E − e·sin(E) = M</text>
                        <text x="300" y="350" fill="#bae6fd" fontSize="12" fontFamily="monospace" opacity="0.80">a = q / (1 − e)</text>
                        <text x="300" y="368" fill="#bae6fd" fontSize="12" fontFamily="monospace" opacity="0.65">n = k / a^(3/2)</text>
                    </>
                )}

                {/* Title */}
                <text x="20" y="30" fill="#cbd5e1" fontSize="15" fontWeight="700">{en ? 'The full orbit — true to scale' : 'A órbita completa — em escala real'}</text>
                <text x="20" y="50" fill="#64748b" fontSize="13">{en ? '— Sun sits at one focus of the ellipse, not the centre' : '— o Sol fica em um foco da elipse, não no centro'}</text>
            </svg>
            <figcaption className="border-t border-white/10 px-4 py-3 text-[12px] leading-relaxed text-white/55">
                {en
                    ? 'Sun (orange) at the left focus — not at the centre of the ellipse. Purple oval = full orbit. White dot = asteroid today. Yellow dot = perihelion, the closest point to the Sun.'
                    : 'Sol (laranja) no foco esquerdo — não no centro da elipse. Oval roxo = órbita completa. Ponto branco = asteroide hoje. Ponto amarelo = periélio, o ponto mais próximo do Sol.'}
            </figcaption>
        </figure>
    );
}
