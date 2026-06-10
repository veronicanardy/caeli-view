/**
 * Manual amigável do radar orbital.
 *
 * Responsabilidade: apresentar explicações acessíveis sobre a cena 3D, escala
 * de distâncias e modo orbital usando diagramas, curiosidades e linguagem não
 * técnica. Conteúdo estático — não depende de dados da cena em tempo real.
 */

import type { SceneMode } from './manualTypes';
import {
    Callout,
    CuriositiesSection,
    HighlightBox,
} from './ManualParts';
import { OrbitGuideDiagram, RadarGuideDiagram } from './ManualDiagrams';

/**
 * Conteúdo introdutório do manual.
 *
 * Escolhe entre a leitura guiada do radar e da órbita sem carregar
 * lógica do shell do modal.
 */
export function FriendlyManual({ mode, locale, lunarDistanceKm }: { mode: SceneMode; locale: 'pt-BR' | 'en'; lunarDistanceKm: number }) {
    const en = locale === 'en';
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });

    if (mode === 'radar') return <RadarFriendly en={en} nf={nf} lunarDistanceKm={lunarDistanceKm} />;
    return <OrbitFriendly en={en} />;
}

function RadarFriendly({ en, nf, lunarDistanceKm }: { en: boolean; nf: Intl.NumberFormat; lunarDistanceKm: number }) {
    const ldKm = nf.format(Math.round(lunarDistanceKm));

    return (
        <div className="space-y-8">

            {/* ── Abertura ────────────────────────────────────────────── */}
            <Callout icon="radar">
                <p className="text-sm leading-relaxed text-white/90">
                    {en
                        ? "You're looking at Earth's neighbourhood right now. The Moon is your ruler; the dots are nearby objects passing through."
                        : 'Você está olhando para a vizinhança da Terra agora. A Lua é sua régua; os pontos mostram objetos próximos em passagem.'}
                </p>
            </Callout>

            {/* ── Diagrama ─────────────────────────────────────────────── */}
            <RadarGuideDiagram locale={en ? 'en' : 'pt-BR'} />

            <div className="grid items-start gap-8 lg:grid-cols-[1fr_0.85fr]">

                {/* ── Coluna esquerda: o que você está vendo ───────────── */}
                <div>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                        {en ? 'What you are looking at' : 'O que você está vendo'}
                    </h3>
                    <div className="divide-y divide-white/[0.08]">
                        <SceneItem
                            slot={<span className="mt-0.5 inline-block size-3 rounded-full bg-violet-400" />}
                            title={en ? 'The asteroid' : 'O asteroide'}
                            desc={en
                                ? 'Each coloured dot is one real object tracked by NASA. Its position is calculated from orbital elements published by JPL — not a live sensor reading, but a mathematical prediction.'
                                : 'Cada ponto colorido é um objeto real monitorado pela NASA. A posição é calculada a partir dos elementos orbitais publicados pelo JPL — não é uma leitura em tempo real, mas uma previsão matemática.'}
                        />
                        <SceneItem
                            slot={
                                <svg width="20" height="12" viewBox="0 0 20 12" className="mt-1" aria-hidden>
                                    <line x1="0" y1="6" x2="14" y2="6" stroke="#67e8f9" strokeWidth="2" />
                                    <polygon points="14,2 20,6 14,10" fill="#67e8f9" />
                                </svg>
                            }
                            title={en ? 'Where it is heading' : 'Para onde está indo'}
                            desc={en
                                ? 'The arrow shows the direction of movement right now. If it points toward Earth, the object is getting closer.'
                                : 'A seta mostra a direção do movimento agora. Se apontar para a Terra, o objeto está se aproximando.'}
                        />
                        <SceneItem
                            slot={<span className="mt-1.5 inline-block h-px w-5 border-t-2 border-slate-400/70" />}
                            title={en ? 'Where it came from' : 'De onde veio'}
                            desc={en
                                ? 'The trail is the path it already covered. The markers show where it was 24h, 48h, and 72h ago.'
                                : 'O rastro é o caminho que já percorreu. As marcações mostram onde estava há 24h, 48h e 72h.'}
                        />
                        <SceneItem
                            slot={<span className="mt-0.5 text-base leading-none">🌙</span>}
                            title={en ? 'The Moon' : 'A Lua'}
                            desc={en
                                ? "Always there as a reference. 1 LD = today's Earth–Moon distance. Position computed from ephemeris (USNO/NOVAS algorithms) — accurate to within a few arc-minutes."
                                : 'Sempre lá como referência. 1 DL = a distância Terra-Lua de hoje. Posição calculada por efeméride (algoritmos USNO/NOVAS) — precisão de alguns minutos de arco.'}
                        />
                        <SceneItem
                            slot={<span className="mt-0.5 text-sm leading-none text-amber-300/80">✦</span>}
                            title={en ? 'The planets' : 'Os planetas'}
                            desc={en
                                ? 'Just context — they help you feel the scale but are not the main characters here.'
                                : 'Só contexto — eles ajudam a sentir a escala, mas não são os protagonistas aqui.'}
                        />
                    </div>
                </div>

                {/* ── Coluna direita: como explorar + unidades ─────────── */}
                <div className="space-y-6">
                    <div>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
                            {en ? 'How to explore' : 'Como explorar'}
                        </h3>
                        <div className="space-y-2">
                            <InteractionHint icon="🖱️" label={en ? 'Drag' : 'Arrastar'} desc={en ? 'Rotate the scene' : 'Girar a cena'} />
                            <InteractionHint icon="🔍" label={en ? 'Scroll' : 'Scroll'} desc={en ? 'Zoom in or out' : 'Aproximar ou afastar'} />
                            <InteractionHint icon="👆" label={en ? 'Click a dot' : 'Clicar num ponto'} desc={en ? 'Open its data' : 'Abrir os dados dele'} />
                            <InteractionHint icon="⌨️" label={en ? 'WASD or arrows' : 'WASD ou setas'} desc={en ? 'Pan the view' : 'Mover o ângulo de visão'} />
                        </div>
                    </div>

                    {/* ── Unidades de distância ─────────────────────────── */}
                    <div>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
                            {en ? 'Distance units' : 'Unidades de distância'}
                        </h3>
                        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08]">
                            <DistanceRow label="km" accent="text-white/70"
                                value={en ? 'Kilometres' : 'Quilômetros'}
                                desc={en ? 'The Moon is about 384,000 km away.' : 'A Lua fica a cerca de 384.000 km.'} />
                            <DistanceRow label={en ? 'LD' : 'DL'} accent="text-cyan-300"
                                value={en ? `Lunar Distance (${ldKm} km today)` : `Distância Lunar (${ldKm} km hoje)`}
                                desc={en ? '0.5 LD = inside lunar orbit. 10 LD = ten times farther.' : '0,5 DL = dentro da órbita lunar. 10 DL = dez vezes mais longe.'} />
                            <DistanceRow label={en ? 'AU' : 'UA'} accent="text-amber-300"
                                value={en ? 'Astronomical Unit (~150 million km)' : 'Unidade Astronômica (~150 milhões de km)'}
                                desc={en ? 'Used when objects are far from Earth.' : 'Usada quando os objetos estão mais distantes.'} />
                        </div>
                    </div>
                </div>
            </div>

            <CuriositiesSection en={en} mode="radar" />
        </div>
    );
}

function OrbitFriendly({ en }: { en: boolean }) {
    return (
        <div className="space-y-8">

            {/* ── Abertura ────────────────────────────────────────────── */}
            <Callout icon="orbit">
                <p className="text-sm leading-relaxed text-white/90">
                    {en
                        ? "The view just changed. That glowing ellipse is this asteroid's osculating orbit — the best-fit path calculated from today's observations. It shows the shape of the orbit now, not a future prediction."
                        : 'A visão acabou de mudar. Essa elipse brilhante é a órbita osculadora deste asteroide — o caminho calculado a partir das observações atuais. Mostra a forma da órbita agora, não uma previsão futura.'}
                </p>
            </Callout>

            {/* ── Diagrama ─────────────────────────────────────────────── */}
            <OrbitGuideDiagram locale={en ? 'en' : 'pt-BR'} />

            <div className="grid items-start gap-8 lg:grid-cols-[1fr_0.85fr]">

                {/* ── Coluna esquerda: o que você está vendo ───────────── */}
                <div>
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                        {en ? 'What you are looking at' : 'O que você está vendo'}
                    </h3>
                    <div className="divide-y divide-white/[0.08]">
                        <SceneItem
                            slot={<span className="mt-0.5 inline-block size-3 rounded-full bg-violet-400" />}
                            title={en ? 'The asteroid' : 'O asteroide'}
                            desc={en
                                ? 'The dot marks its calculated position right now, derived from orbital elements published by JPL. This is not a live sensor reading — it is a mathematical prediction using the Keplerian two-body model.'
                                : 'O ponto mostra a posição calculada agora, derivada dos elementos orbitais publicados pelo JPL. Não é uma leitura de sensor em tempo real. é uma previsão matemática usando o modelo kepleriano de dois corpos.'}
                        />
                        <SceneItem
                            slot={<span className="mt-0.5 inline-block h-2.5 w-4 rounded-full border-2 border-violet-400 bg-transparent" />}
                            title={en ? 'The orbit' : 'A órbita'}
                            desc={en
                                ? 'The osculating orbit — a snapshot of the ellipse fitted to current observations. Slowly shifts over years due to gravitational pulls from Jupiter and other planets.'
                                : 'A órbita osculadora — um instantâneo da elipse ajustada às observações atuais. Muda lentamente ao longo dos anos por influência gravitacional de Júpiter e outros planetas.'}
                        />
                        <SceneItem
                            slot={<span className="mt-0.5 text-[15px] leading-none">☀️</span>}
                            title={en ? 'The Sun' : 'O Sol'}
                            desc={en
                                ? 'Notice it sits at one side of the ellipse, not the centre. In an elliptical orbit the Sun sits at one focus — so the asteroid is sometimes closer, sometimes farther.'
                                : 'Repare que ele fica de um lado da elipse, não no centro. Numa órbita elíptica, o Sol fica em um dos focos — por isso o asteroide fica às vezes mais perto, às vezes mais longe.'}
                        />
                        <SceneItem
                            slot={<span className="mt-0.5 inline-block size-2 rounded-full bg-amber-300/80" />}
                            title={en ? 'Perihelion' : 'Periélio'}
                            desc={en
                                ? 'The closest point to the Sun. This is where the asteroid moves fastest in its whole orbit.'
                                : 'O ponto mais próximo do Sol. É aqui que o asteroide atinge a maior velocidade em toda a sua órbita.'}
                        />
                    </div>
                </div>

                {/* ── Coluna direita: como explorar + forma da órbita ──── */}
                <div className="space-y-6">
                    <div>
                        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
                            {en ? 'How to explore' : 'Como explorar'}
                        </h3>
                        <div className="space-y-2">
                            <InteractionHint icon="🖱️" label={en ? 'Drag' : 'Arrastar'} desc={en ? 'Rotate the scene' : 'Girar a cena'} />
                            <InteractionHint icon="🔍" label={en ? 'Scroll' : 'Scroll'} desc={en ? 'Zoom in or out' : 'Aproximar ou afastar'} />
                            <InteractionHint icon="👆" label={en ? 'Click a dot' : 'Clicar num ponto'} desc={en ? 'Open its data' : 'Abrir os dados'} />
                            <InteractionHint icon="⌨️" label={en ? 'WASD or ↑↓←→' : 'WASD ou ↑↓←→'} desc={en ? 'Pan the view' : 'Mover o ângulo de visão'} />
                        </div>
                    </div>

                    {/* ── O que a forma revela ──────────────────────────── */}
                    <div>
                    </div>
                </div>
            </div>

            <CuriositiesSection en={en} mode="orbit" />
        </div>
    );
}

/** Item de cena sem card — só separador sutil entre linhas. */
function SceneItem({ slot, title, desc }: { slot: React.ReactNode; title: string; desc: string }) {
    return (
        <div className="flex items-start gap-3 py-3">
            <span className="w-5 shrink-0 text-center">{slot}</span>
            <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug text-white/90">{title}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">{desc}</p>
            </div>
        </div>
    );
}

/** Linha de interação com ícone — escaneável, sem card pesado. */
function InteractionHint({ icon, label, desc }: { icon: string; label: string; desc: string }) {
    return (
        <div className="flex items-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2">
            <span className="shrink-0 text-base leading-none" aria-hidden>{icon}</span>
            <div className="min-w-0">
                <span className="text-[13px] font-semibold text-white/85">{label}</span>
                <span className="ml-2 text-[12px] text-white/60">{desc}</span>
            </div>
        </div>
    );
}

/** Linha de unidade de distância — dentro de um bloco agrupado com borda única. */
function DistanceRow({ label, accent, value, desc }: { label: string; accent: string; value: string; desc: string }) {
    return (
        <div className="flex items-start gap-3 bg-transparent px-3.5 py-3">
            <span className={`mt-0.5 w-7 shrink-0 font-mono text-sm font-bold leading-none ${accent}`}>{label}</span>
            <div className="min-w-0">
                <p className="text-[13px] font-medium leading-snug text-white/85">{value}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-white/60">{desc}</p>
            </div>
        </div>
    );
}
