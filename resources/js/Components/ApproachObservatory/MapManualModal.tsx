import { useEffect, useRef, useState } from 'react';
import { BookOpen, Calculator, Compass, Eye, GripHorizontal, Maximize2, MousePointer2, Orbit, Radar, X } from 'lucide-react';
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
    const title = mode === 'radar'
        ? (en ? 'Radar mode · Earth-centred' : 'Modo radar · centrado na Terra')
        : (en ? 'Orbit mode · Sun-centred' : 'Modo órbita · centrado no Sol');

    // Position + size are tracked in viewport pixels so the user can drag the panel anywhere and
    // resize it from the bottom-right corner.
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
        return () => {
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose]);

    // Re-clamp the panel if the viewport shrinks (eg. window resize / DevTools opens), so it never
    // ends up parked off-screen and unreachable.
    useEffect(() => {
        const onResize = () => {
            setBox((b) => clampManualBox(b.x, b.y, b.width, b.height));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (!dragging && !resizing) return;
        const onMove = (event: PointerEvent) => {
            if (dragging && dragRef.current) {
                const nextX = event.clientX - dragRef.current.offsetX;
                const nextY = event.clientY - dragRef.current.offsetY;
                setBox((b) => clampManualBox(nextX, nextY, b.width, b.height));
            } else if (resizing && resizeRef.current) {
                const dx = event.clientX - resizeRef.current.startX;
                const dy = event.clientY - resizeRef.current.startY;
                const nextW = resizeRef.current.startWidth + dx;
                const nextH = resizeRef.current.startHeight + dy;
                setBox((b) => clampManualBox(b.x, b.y, nextW, nextH));
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
        const target = event.target as HTMLElement;
        if (target.closest('button')) return;
        dragRef.current = { offsetX: event.clientX - box.x, offsetY: event.clientY - box.y };
        setDragging(true);
    };

    const startResize = (event: React.PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        resizeRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            startWidth: box.width,
            startHeight: box.height,
        };
        setResizing(true);
    };

    const resetBox = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const width = Math.min(1024, vw - MANUAL_MARGIN * 2);
        const height = Math.min(Math.round(vh * 0.92), vh - MANUAL_MARGIN * 2);
        setBox(clampManualBox((vw - width) / 2, (vh - height) / 2, width, height));
    };

    return (
        // The outer wrapper is non-blocking: clicks outside the panel pass straight through to the
        // 3D scene below, so the manual can stay open while exploring.
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
                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-full border border-signal-cyan/25 bg-signal-cyan/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-signal-cyan">
                                {mode === 'radar' ? <Radar className="size-3.5" aria-hidden /> : <Orbit className="size-3.5" aria-hidden />}
                                {en ? 'Map manual' : 'Manual do mapa'}
                            </div>
                            <span
                                className="inline-flex items-center gap-1 text-[11px] text-white/40"
                                title={en ? 'Drag to move' : 'Arraste para mover'}
                            >
                                <GripHorizontal className="size-3.5" aria-hidden />
                                {en ? 'drag' : 'arraste'}
                            </span>
                        </div>
                        <h2 id="map-manual-title" className="mt-2 text-xl font-semibold text-white sm:text-2xl">{title}</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/62">
                            {tab === 'guide'
                                ? (en
                                    ? 'A friendly guide for reading the scene without needing astronomy vocabulary first.'
                                    : 'Um guia amigável para ler a cena antes de entrar em palavras de astronomia.')
                                : (en
                                    ? 'The data pipeline, scale choices, and math used to draw this view.'
                                    : 'A lógica dos dados, das escalas e da matemática usada para desenhar esta vista.')}
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                        <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={resetBox}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-3 text-[12px] font-medium text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            title={en ? 'Reset position and size' : 'Restaurar posição e tamanho'}
                        >
                            <Maximize2 className="size-3.5" aria-hidden />
                            {en ? 'Reset' : 'Restaurar'}
                        </button>
                        <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={onClose}
                            className="inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-signal-cyan"
                            aria-label={en ? 'Close manual' : 'Fechar manual'}
                        >
                            <X className="size-4" aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="flex shrink-0 border-b border-white/10 bg-black/16 px-3 py-2 sm:px-5">
                    <ManualTabButton active={tab === 'guide'} onClick={() => setTab('guide')} icon="guide">
                        {en ? 'Basic guide' : 'Guia básico'}
                    </ManualTabButton>
                    <ManualTabButton active={tab === 'technical'} onClick={() => setTab('technical')} icon="technical">
                        {en ? 'Technical guide' : 'Guia técnico'}
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

function ManualTabButton({
    active,
    onClick,
    icon,
    children,
}: {
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

function FriendlyManual({ mode, locale, lunarDistanceKm }: { mode: SceneMode; locale: 'pt-BR' | 'en'; lunarDistanceKm: number }) {
    const en = locale === 'en';
    const nf = new Intl.NumberFormat(locale);
    const auKm = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(KM_PER_AU));

    if (mode === 'radar') {
        return (
            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-4">
                    <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                        <div className="flex items-start gap-3">
                            <Compass className="mt-0.5 size-5 shrink-0 text-signal-cyan" aria-hidden />
                            <div>
                                <h3 className="text-base font-semibold text-white">{en ? 'A map of the local space neighbourhood' : 'Um mapa da vizinhança espacial'}</h3>
                                <p className="mt-1 text-sm leading-relaxed text-white/68">
                                    {en
                                        ? 'Earth is the protagonist. Each marker is an object passing nearby right now. The map answers three questions: where is it, how far is it, and which way is it moving.'
                                        : 'A Terra é a protagonista. Cada marcador é um objeto passando por perto agora. O mapa responde a três perguntas: onde está, a que distância está e para que lado está indo.'}
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <ManualStep
                            number="1"
                            title={en ? 'Start at Earth' : 'Comece pela Terra'}
                            text={en ? 'Distances are read from the centre outward. The closer to Earth, the closer to the middle of the scene.' : 'As distâncias são lidas do centro para fora. Quanto mais perto da Terra, mais perto do meio da cena.'}
                        />
                        <ManualStep
                            number="2"
                            title={en ? 'Trust the numbers, not the spacing' : 'Confie nos números, não no espaçamento'}
                            text={en ? 'The visual spacing is compressed so distant objects stay visible. The real distance in km, LD and AU is always shown on the focus card.' : 'O espaçamento visual é comprimido para que objetos distantes fiquem visíveis. A distância real em km, DL e UA está sempre no painel de foco.'}
                        />
                        <ManualStep
                            number="3"
                            title={en ? 'The cone shows direction' : 'O cone mostra a direção'}
                            text={en ? 'Each object carries a small cone pointing where it is heading next. The grey dashes are the short path nearby.' : 'Cada objeto carrega um cone pequeno apontando para onde está indo. Os traços cinza são o caminho próximo.'}
                        />
                        <ManualStep
                            number="4"
                            title={en ? 'Rotate the view to read depth' : 'Gire a vista para ler a profundidade'}
                            text={en ? 'The 2D radar flattened the vertical axis. Use Top and Side to check if an object sits above or below the Moon’s plane.' : 'O radar 2D achatava o eixo vertical. Use Superior e Lateral para conferir se um objeto está acima ou abaixo do plano da Lua.'}
                        />
                    </div>

                    <section className="rounded-lg border border-amber-200/14 bg-amber-200/[0.045] p-4 text-sm leading-relaxed text-white/70">
                        {en
                            ? `LD is the lunar distance — the Earth-Moon gap, currently ${nf.format(lunarDistanceKm)} km. AU is the Earth-Sun distance, about ${auKm} km. Both are standard rulers in astronomy.`
                            : `DL é a distância lunar — a separação Terra-Lua, hoje em ${nf.format(lunarDistanceKm)} km. UA é a distância Terra-Sol, cerca de ${auKm} km. Ambas são réguas padrão na astronomia.`}
                    </section>
                </div>

                <div className="space-y-4">
                    <RadarGuideDiagram locale={locale} />
                    <section className="rounded-lg border border-white/10 bg-black/18 p-4">
                        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                            <MousePointer2 className="size-4 text-signal-cyan" aria-hidden />
                            {en ? 'Suggested reading order' : 'Ordem sugerida de leitura'}
                        </h3>
                        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-white/66">
                            <li>{en ? '1. Pick an object from the list on the left.' : '1. Escolha um objeto na lista à esquerda.'}</li>
                            <li>{en ? '2. Read the real distance in the focus card — that is the trustworthy number.' : '2. Leia a distância real no painel de foco — esse é o número confiável.'}</li>
                            <li>{en ? '3. Look at the cone and the grey trail to understand the motion.' : '3. Olhe para o cone e a trilha cinza para entender o movimento.'}</li>
                            <li>{en ? '4. Switch to orbit mode only when the question is about the full path around the Sun.' : '4. Mude para o modo órbita só quando a pergunta for sobre o caminho completo ao redor do Sol.'}</li>
                        </ol>
                    </section>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
                <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-start gap-3">
                        <Orbit className="mt-0.5 size-5 shrink-0 text-signal-cyan" aria-hidden />
                        <div>
                            <h3 className="text-base font-semibold text-white">{en ? 'The full journey around the Sun' : 'A jornada completa ao redor do Sol'}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-white/68">
                                {en
                                    ? 'The Sun anchors the scene. The bright ellipse is the road the asteroid travels around the Sun, and the marker shows where it sits on that road today.'
                                    : 'O Sol ancora a cena. A elipse brilhante é a estrada que o asteroide percorre ao redor do Sol, e o marcador mostra onde ele está nessa estrada hoje.'}
                            </p>
                        </div>
                    </div>
                </section>

                <div className="grid gap-3 sm:grid-cols-2">
                    <ManualStep
                        number="1"
                        title={en ? 'The Sun is the reference' : 'O Sol é a referência'}
                        text={en ? 'This view is not about the close approach. It shows the long-term path that gravity from the Sun keeps the asteroid on.' : 'Esta vista não é sobre a aproximação. Ela mostra o caminho de longo prazo que a gravidade do Sol mantém o asteroide seguindo.'}
                    />
                    <ManualStep
                        number="2"
                        title={en ? 'Shape tells the story' : 'A forma conta a história'}
                        text={en ? 'A round ellipse means the distance to the Sun stays steady. A stretched ellipse means the asteroid varies a lot between near and far.' : 'Uma elipse redonda indica distância estável até o Sol. Uma elipse alongada indica grande variação entre perto e longe.'}
                    />
                    <ManualStep
                        number="3"
                        title={en ? 'Compare with Earth’s 1 AU ring' : 'Compare com o anel de 1 UA da Terra'}
                        text={en ? 'The blue ring is Earth’s orbit. If the ellipse crosses it, the asteroid passes through the neighbourhood Earth lives in.' : 'O anel azul é a órbita da Terra. Se a elipse cruza esse anel, o asteroide passa pela vizinhança da Terra.'}
                    />
                    <ManualStep
                        number="4"
                        title={en ? 'Check the tilt' : 'Confira a inclinação'}
                        text={en ? 'An orbit tilted relative to Earth’s plane may look close from above but pass well over or under it in reality.' : 'Uma órbita inclinada em relação ao plano da Terra pode parecer próxima vista de cima, mas passar bem acima ou abaixo na realidade.'}
                    />
                </div>

                <section className="rounded-lg border border-amber-200/14 bg-amber-200/[0.045] p-4 text-sm leading-relaxed text-white/70">
                    {en
                        ? 'Orbit mode is the wide-angle view. Switch back to radar mode for the question "how close to Earth is it right now?".'
                        : 'O modo órbita é a visão ampla. Volte para o modo radar para a pergunta "a que distância da Terra está agora?".'}
                </section>
            </div>

            <div className="space-y-4">
                <OrbitGuideDiagram locale={locale} />
                <section className="rounded-lg border border-white/10 bg-black/18 p-4">
                    <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                        <Eye className="size-4 text-signal-cyan" aria-hidden />
                        {en ? 'What to look for' : 'O que observar'}
                    </h3>
                    <ol className="mt-3 space-y-2 text-sm leading-relaxed text-white/66">
                        <li>{en ? '1. Does the ellipse cross or skim Earth’s ring?' : '1. A elipse cruza ou tangencia o anel da Terra?'}</li>
                        <li>{en ? '2. Is the marker close to that crossing or far from it on this date?' : '2. O marcador está perto desse cruzamento ou longe dele nesta data?'}</li>
                        <li>{en ? '3. How stretched is the ellipse? Stretched orbits mean big swings in speed and distance.' : '3. Quão alongada é a elipse? Órbitas alongadas significam grandes variações de velocidade e distância.'}</li>
                        <li>{en ? '4. Is the orbit tilted? A tilted orbit may not actually meet Earth’s, even if it looks close in the top view.' : '4. A órbita é inclinada? Uma órbita inclinada pode não encontrar a da Terra de verdade, mesmo parecendo próxima de cima.'}</li>
                    </ol>
                </section>
            </div>
        </div>
    );
}

function ManualStep({ number, title, text }: { number: string; title: string; text: string }) {
    return (
        <section className="rounded-lg border border-white/10 bg-black/18 p-3">
            <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-signal-cyan text-[12px] font-bold text-space-950">{number}</span>
                <div>
                    <h4 className="text-sm font-semibold text-white">{title}</h4>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/62">{text}</p>
                </div>
            </div>
        </section>
    );
}

function TechnicalManual({ mode, locale, lunarDistanceKm }: { mode: SceneMode; locale: 'pt-BR' | 'en'; lunarDistanceKm: number }) {
    const en = locale === 'en';
    const nf = new Intl.NumberFormat(locale);
    const auKm = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(KM_PER_AU);

    if (mode === 'radar') {
        return (
            <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="space-y-4">
                    <RadarGuideDiagram locale={locale} technical />
                    <TechnicalBlock
                        title={en ? 'Design rationale' : 'Justificativa do design'}
                        lines={en
                            ? [
                                'The radar answers a local question: the geocentric position of each object at the current instant.',
                                'A linear ruler centred on Earth would place the Moon at 1 LD and the Sun near 389 LD, collapsing the near-Earth band into a few pixels.',
                                'The scene applies a logarithmic radial compression so the Earth-Moon-asteroid band stays readable, while the numeric distances reported to the UI remain the original measurements.',
                                'Direction and inclination are preserved exactly — only the radial spacing is rescaled.',
                            ]
                            : [
                                'O radar responde a uma pergunta local: a posição geocêntrica de cada objeto no instante atual.',
                                'Uma régua linear centrada na Terra colocaria a Lua a 1 DL e o Sol perto de 389 DL, comprimindo a faixa próxima à Terra em poucos pixels.',
                                'A cena aplica uma compressão radial logarítmica para manter a faixa Terra-Lua-asteroide legível, enquanto as distâncias numéricas exibidas na interface continuam sendo as medidas originais.',
                                'Direção e inclinação são preservadas exatamente — apenas o espaçamento radial é reescalonado.',
                            ]}
                    />
                </div>
                <div className="space-y-4">
                    <FormulaPanel
                        title={en ? 'Geocentric state and distance' : 'Estado geocêntrico e distância'}
                        formulas={[
                            'r = (x, y, z),   v = (vx, vy, vz)',
                            'd_km = ||r||',
                            `d_DL = d_km / ${nf.format(lunarDistanceKm)}`,
                            `${en ? 'd_AU' : 'd_UA'} = d_km / ${auKm}`,
                        ]}
                        note={en
                            ? 'Position and velocity vectors come from JPL Horizons in the geocentric J2000 frame. The three distance units (km, LD, AU) shown in the UI are derived from the same Euclidean norm.'
                            : 'Vetores de posição e velocidade vêm do JPL Horizons no referencial geocêntrico J2000. As três unidades de distância (km, DL, UA) exibidas na interface derivam da mesma norma euclidiana.'}
                    />
                    <FormulaPanel
                        title={en ? 'Radial log compression' : 'Compressão radial logarítmica'}
                        formulas={[
                            'R0 = 8 DL',
                            'K = 1 / ln(1 + 1/R0)',
                            'f(r) = K · ln(1 + r/R0)',
                            'r_scene = f(d_DL) · r / ||r||',
                        ]}
                        note={en
                            ? 'R0 is the transition distance below which the mapping is approximately linear. K is fixed so the Moon (1 LD) lands at exactly 1 scene unit. The function is monotonic, so relative ordering of distances is preserved.'
                            : 'R0 é a distância de transição abaixo da qual o mapeamento é aproximadamente linear. K é fixado de modo que a Lua (1 DL) caia exatamente em 1 unidade de cena. A função é monotônica, portanto a ordem relativa das distâncias é preservada.'}
                    />
                    <FormulaPanel
                        title={en ? 'Motion vector and trail' : 'Vetor de movimento e trilha'}
                        formulas={[
                            'u = v / ||v||',
                            en ? 'cone direction = u' : 'direção do cone = u',
                            en ? 'trail = nearby trajectory samples' : 'trilha = amostras próximas da trajetória',
                        ]}
                        note={en
                            ? 'The cone follows the unit velocity vector, so its orientation is physically meaningful. The grey dashed trail samples the geocentric trajectory near the current epoch — it is the same compression applied to nearby positions.'
                            : 'O cone segue o vetor velocidade unitário, portanto sua orientação tem significado físico. A trilha tracejada cinza amostra a trajetória geocêntrica próxima à época atual — é a mesma compressão aplicada a posições próximas.'}
                    />
                    <TechnicalBlock
                        title={en ? '3D models and visual scale' : 'Modelos 3D e escala visual'}
                        lines={en
                            ? [
                                'When a NASA shape model exists for a body (Bennu, Ceres, Eros, Itokawa, Vesta), the matching asset is loaded.',
                                'Bodies without a dedicated model are rendered as representative rocks chosen by estimated diameter.',
                                'Body radii are amplified for legibility because true sizes would be sub-pixel at scene scale. Distances remain the trustworthy measurement layer.',
                            ]
                            : [
                                'Quando existe um modelo de forma da NASA para um corpo (Bennu, Ceres, Eros, Itokawa, Vesta), o asset correspondente é carregado.',
                                'Corpos sem modelo dedicado são renderizados como rochas representativas escolhidas pelo diâmetro estimado.',
                                'Os raios visuais são amplificados para leitura porque os tamanhos reais seriam sub-pixel na escala da cena. As distâncias permanecem a camada confiável de medição.',
                            ]}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
                <OrbitGuideDiagram locale={locale} technical />
                <TechnicalBlock
                    title={en ? 'Design rationale' : 'Justificativa do design'}
                    lines={en
                        ? [
                            'The long-term motion of an asteroid is dominated by solar gravity, so the orbit view uses the Sun as the dynamical centre.',
                            'Keeping the radar (geocentric) and orbit (heliocentric) modes strictly separated prevents the two scales from being read off the same ruler.',
                            'Distances in this mode are drawn linearly in AU so the ellipse shape is faithful — no log compression is applied.',
                            'The asteroid position is obtained by propagating Kepler’s equation from the perihelion epoch, so the marker lies on the drawn ellipse by construction.',
                        ]
                        : [
                            'O movimento de longo prazo de um asteroide é dominado pela gravidade solar, portanto a vista orbital usa o Sol como centro dinâmico.',
                            'Manter os modos radar (geocêntrico) e órbita (heliocêntrico) estritamente separados evita que as duas escalas sejam lidas pela mesma régua.',
                            'As distâncias neste modo são desenhadas linearmente em UA, preservando fielmente a forma da elipse — nenhuma compressão logarítmica é aplicada.',
                            'A posição do asteroide é obtida propagando a equação de Kepler a partir da época do periélio, de modo que o marcador cai exatamente sobre a elipse desenhada.',
                        ]}
                />
            </div>
            <div className="space-y-4">
                <FormulaPanel
                    title={en ? 'Osculating elements (input)' : 'Elementos osculadores (entrada)'}
                    formulas={[
                        'q = perihelion distance',
                        'e = eccentricity',
                        'i = inclination',
                        'Ω = longitude of ascending node',
                        'ω = argument of perihelion',
                        'Tp = time of perihelion passage',
                    ]}
                    note={en
                        ? 'These six classical elements come from JPL Horizons and describe the osculating Keplerian orbit at the current solution epoch.'
                        : 'Esses seis elementos clássicos vêm do JPL Horizons e descrevem a órbita Kepleriana osculadora na época da solução atual.'}
                />
                <FormulaPanel
                    title={en ? 'Kepler propagation' : 'Propagação Kepleriana'}
                    formulas={[
                        'a = q / (1 - e)',
                        'k = 0.01720209895',
                        'GM_sol = k²',
                        'n = sqrt(GM_sol / a³)',
                        'M = n · (JD_now - Tp)',
                        'E - e · sin(E) = M',
                    ]}
                    note={en
                        ? 'k is the Gaussian gravitational constant; the resulting GM_sol expresses the standard heliocentric two-body problem. Kepler’s equation is solved for the eccentric anomaly E by Newton iteration.'
                        : 'k é a constante gravitacional Gaussiana; o GM_sol resultante expressa o problema padrão dos dois corpos heliocêntrico. A equação de Kepler é resolvida para a anomalia excêntrica E por iteração de Newton.'}
                />
                <FormulaPanel
                    title={en ? 'Position in the orbital plane' : 'Posição no plano orbital'}
                    formulas={[
                        'x = a · (cos E - e)',
                        'y = a · sqrt(1 - e²) · sin E',
                        'R = Rz(Ω) · Rx(i) · Rz(ω)',
                        'p_ecl = R · (x, y, 0)',
                    ]}
                    note={en
                        ? 'The point is first expressed in the orbital plane (Sun at the focus), then rotated into the J2000 ecliptic frame by the composite rotation R.'
                        : 'O ponto é expresso primeiro no plano orbital (Sol no foco), depois rotacionado para o referencial eclíptico J2000 pela rotação composta R.'}
                />
                <FormulaPanel
                    title={en ? 'Scene mapping' : 'Mapeamento para a cena'}
                    formulas={[
                        '1 AU = ORBIT_AU_SCALE units',
                        'scene(x, y, z) = (x, z, y) · ORBIT_AU_SCALE',
                        en ? 'Earth = real heliocentric position' : 'Terra = posição heliocêntrica real',
                    ]}
                    note={en
                        ? 'The axis swap aligns the J2000 ecliptic with the scene convention (ecliptic Z becomes scene Y). Earth is placed from the local ephemeris and lit by the real Sun direction; only its rendered radius is amplified.'
                        : 'A troca de eixos alinha o eclíptico J2000 com a convenção da cena (Z eclíptico vira Y da cena). A Terra é posicionada pela efeméride local e iluminada pela direção real do Sol; apenas seu raio renderizado é amplificado.'}
                />
            </div>
        </div>
    );
}

function TechnicalBlock({ title, lines }: { title: string; lines: string[] }) {
    return (
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-white/64">
                {lines.map((line) => <li key={line}>{line}</li>)}
            </ul>
        </section>
    );
}

function FormulaPanel({ title, formulas, note }: { title: string; formulas: string[]; note: string }) {
    return (
        <section className="rounded-lg border border-white/10 bg-black/20 p-4">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <div className="mt-3 space-y-1 rounded-md border border-signal-cyan/15 bg-signal-cyan/[0.055] px-3 py-2 font-mono text-[12px] leading-relaxed text-cyan-100/88">
                {formulas.map((formula) => <div key={formula}>{formula}</div>)}
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-white/62">{note}</p>
        </section>
    );
}

function RadarGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
    const en = locale === 'en';
    return (
        <figure className="overflow-hidden rounded-lg border border-white/10 bg-[#050b15]">
            <svg viewBox="0 0 520 360" className="h-auto w-full" role="img" aria-label={en ? 'Earth-centred radar diagram' : 'Diagrama do radar centrado na Terra'}>
                <defs>
                    <radialGradient id="earthGlow" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#7dd3fc" />
                        <stop offset="55%" stopColor="#2563eb" />
                        <stop offset="100%" stopColor="#0f172a" />
                    </radialGradient>
                    <marker id="arrowCyan" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L8,3 z" fill="#67e8f9" />
                    </marker>
                </defs>
                <rect width="520" height="360" fill="#050b15" />
                <circle cx="260" cy="180" r="58" fill="none" stroke="#94a3b8" strokeOpacity="0.18" strokeWidth="1" />
                <circle cx="260" cy="180" r="116" fill="none" stroke="#94a3b8" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="6 8" />
                <circle cx="260" cy="180" r="174" fill="none" stroke="#94a3b8" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 10" />
                <path d="M260 180 C300 124 365 108 424 82" fill="none" stroke="#94a3b8" strokeOpacity="0.45" strokeWidth="3" strokeDasharray="7 9" />
                <line x1="382" y1="110" x2="442" y2="78" stroke="#67e8f9" strokeWidth="4" markerEnd="url(#arrowCyan)" />
                <circle cx="260" cy="180" r="30" fill="url(#earthGlow)" />
                <circle cx="330" cy="146" r="8" fill="#d8b4fe" />
                <circle cx="382" cy="110" r="11" fill="#f8fafc" />
                <circle cx="178" cy="228" r="7" fill="#facc15" />
                <text x="260" y="224" textAnchor="middle" fill="#e0f2fe" fontSize="15" fontWeight="700">{en ? 'Earth' : 'Terra'}</text>
                <text x="385" y="139" textAnchor="middle" fill="#e2e8f0" fontSize="13">{en ? 'object now' : 'objeto agora'}</text>
                <text x="427" y="67" fill="#67e8f9" fontSize="13" fontWeight="700">{en ? 'movement' : 'movimento'}</text>
                <text x="82" y="42" fill="#cbd5e1" fontSize="14" fontWeight="700">{en ? 'Read from Earth outward' : 'Leia saindo da Terra'}</text>
                <text x="82" y="64" fill="#94a3b8" fontSize="12">{en ? 'distance numbers stay real' : 'os números de distância são reais'}</text>
                {technical ? (
                    <>
                        <line x1="260" y1="180" x2="382" y2="110" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.8" />
                        <text x="286" y="133" fill="#fef3c7" fontSize="12">r = (x,y,z)</text>
                        <text x="315" y="264" fill="#bae6fd" fontSize="12">r_cena = f(||r||) · r/||r||</text>
                    </>
                ) : null}
            </svg>
            <figcaption className="border-t border-white/10 px-4 py-3 text-[13px] leading-relaxed text-white/62">
                {en
                    ? 'The centre is Earth. Dots are nearby objects, the cone shows motion, and the grey dashes show the short path around us.'
                    : 'O centro é a Terra. Os pontos são objetos próximos, o cone mostra o movimento e os traços cinza mostram o caminho curto ao nosso redor.'}
            </figcaption>
        </figure>
    );
}

function OrbitGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
    const en = locale === 'en';
    return (
        <figure className="overflow-hidden rounded-lg border border-white/10 bg-[#050b15]">
            <svg viewBox="0 0 520 360" className="h-auto w-full" role="img" aria-label={en ? 'Sun-centred orbit diagram' : 'Diagrama orbital centrado no Sol'}>
                <defs>
                    <radialGradient id="sunGlowManual" cx="50%" cy="50%" r="55%">
                        <stop offset="0%" stopColor="#fff7ad" />
                        <stop offset="45%" stopColor="#fb923c" />
                        <stop offset="100%" stopColor="#7c2d12" />
                    </radialGradient>
                    <marker id="arrowCyanOrbit" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L8,3 z" fill="#67e8f9" />
                    </marker>
                </defs>
                <rect width="520" height="360" fill="#050b15" />
                <ellipse cx="260" cy="180" rx="94" ry="94" fill="none" stroke="#60a5fa" strokeOpacity="0.45" strokeWidth="2" />
                <ellipse cx="288" cy="180" rx="178" ry="82" fill="none" stroke="#d8b4fe" strokeOpacity="0.82" strokeWidth="3" transform="rotate(-18 288 180)" />
                <circle cx="260" cy="180" r="24" fill="url(#sunGlowManual)" />
                <circle cx="354" cy="180" r="9" fill="#7dd3fc" />
                <circle cx="420" cy="119" r="11" fill="#f8fafc" />
                <path d="M408 128 L445 96" stroke="#67e8f9" strokeWidth="4" markerEnd="url(#arrowCyanOrbit)" />
                <text x="260" y="220" textAnchor="middle" fill="#fed7aa" fontSize="15" fontWeight="700">{en ? 'Sun' : 'Sol'}</text>
                <text x="354" y="203" textAnchor="middle" fill="#bfdbfe" fontSize="12">{en ? 'Earth (1 AU)' : 'Terra (1 UA)'}</text>
                <text x="420" y="146" textAnchor="middle" fill="#e2e8f0" fontSize="13">{en ? 'object now' : 'objeto agora'}</text>
                <text x="72" y="44" fill="#cbd5e1" fontSize="14" fontWeight="700">{en ? 'Read the whole orbit' : 'Leia a órbita inteira'}</text>
                <text x="72" y="66" fill="#94a3b8" fontSize="12">{en ? 'compare with Earth’s 1 AU path' : 'compare com o caminho da Terra em 1 UA'}</text>
                {technical ? (
                    <>
                        <line x1="260" y1="180" x2="420" y2="119" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.75" />
                        <text x="310" y="140" fill="#fef3c7" fontSize="12">p_ecl</text>
                        <text x="90" y="304" fill="#bae6fd" fontSize="12">E - e·sin(E) = M</text>
                        <text x="90" y="326" fill="#bae6fd" fontSize="12">a = q/(1-e)</text>
                    </>
                ) : null}
            </svg>
            <figcaption className="border-t border-white/10 px-4 py-3 text-[13px] leading-relaxed text-white/62">
                {en
                    ? 'The Sun anchors the view. Earth’s ring gives you a familiar ruler; the asteroid ellipse shows the larger path.'
                    : 'O Sol ancora a vista. O anel da Terra dá uma régua familiar; a elipse do asteroide mostra o caminho maior.'}
            </figcaption>
        </figure>
    );
}
