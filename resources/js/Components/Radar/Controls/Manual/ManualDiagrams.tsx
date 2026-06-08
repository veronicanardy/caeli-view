/**
 * Diagrama SVG didático da vista geocêntrica.
 *
 * A variante técnica adiciona sobreposições sem mudar a composição base.
 */
export function RadarGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
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

                {/* Anéis de distância do radar. */}
                <circle cx="270" cy="195" r="54" fill="none" stroke="#94a3b8" strokeOpacity="0.22" strokeWidth="1" />
                <circle cx="270" cy="195" r="108" fill="none" stroke="#94a3b8" strokeOpacity="0.13" strokeWidth="1" strokeDasharray="5 7" />
                <circle cx="270" cy="195" r="162" fill="none" stroke="#94a3b8" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 9" />

                {/* Lua em prata para refletir a cena 3D. */}
                <circle cx="270" cy="141" r="9" fill="url(#rg-moon)" />
                <text x="285" y="146" fill="#cbd5e1" fontSize="13" fontWeight="600">{en ? 'Moon · 1 LD' : 'Lua · 1 DL'}</text>

                {/* Trilha recente do asteroide. */}
                <path d="M270 195 C306 130 372 112 432 88" fill="none" stroke="#94a3b8" strokeOpacity="0.40" strokeWidth="2.5" strokeDasharray="6 8" />

                {/* Posição atual do asteroide e cone de movimento. */}
                <circle cx="396" cy="112" r="12" fill="#d8b4fe" filter="url(#rg-glow)" />
                <polygon points="396,100 388,120 404,120" fill="#67e8f9" opacity="0.85" transform="rotate(-40 396 112)" />
                <line x1="396" y1="112" x2="450" y2="80" stroke="#67e8f9" strokeWidth="3" markerEnd="url(#rg-arrow)" />

                {/* Segundo objeto para reforçar profundidade. */}
                <circle cx="190" cy="290" r="8" fill="#fb923c" opacity="0.8" />
                <polygon points="190,278 183,296 197,296" fill="#67e8f9" opacity="0.6" transform="rotate(150 190 290)" />

                {/* Terra na origem geocêntrica. */}
                <circle cx="270" cy="195" r="28" fill="url(#rg-earth)" />
                <text x="270" y="241" textAnchor="middle" fill="#e0f2fe" fontSize="16" fontWeight="700">{en ? 'Earth' : 'Terra'}</text>

                {/* Sobreposições da aba técnica. */}
                {technical && (
                    <>
                        <line x1="270" y1="195" x2="396" y2="112" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.85" strokeDasharray="3 4" />
                        <text x="358" y="98" fill="#fef3c7" fontSize="13" fontStyle="italic" textAnchor="middle">r = (x, y, z)</text>
                        <rect x="12" y="310" width="240" height="48" rx="5" fill="#0a1628" fillOpacity="0.92" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1" />
                        <text x="22" y="330" fill="#bae6fd" fontSize="13" fontFamily="monospace">r_scene = f(d_DL) · r̂</text>
                        <text x="22" y="349" fill="#bae6fd" fontSize="12" fontFamily="monospace" opacity="0.75">f(r) = K · ln(1 + r/R₀)</text>
                    </>
                )}

                {/* Título e rótulos de apoio. */}
                <text x="20" y="30" fill="#cbd5e1" fontSize="15" fontWeight="700">{en ? 'Read outward from Earth' : 'Leia saindo da Terra'}</text>
                <text x="20" y="50" fill="#64748b" fontSize="13">{en ? '— numbers in the focus panel are uncompressed' : '— números no painel de foco são descomprimidos'}</text>

                <text x="327" y="192" fill="#475569" fontSize="12">1 DL</text>
                <text x="381" y="192" fill="#334155" fontSize="12">2 DL</text>

                <text x="412" y="105" fill="#e2e8f0" fontSize="14">{en ? 'object' : 'objeto'}</text>
                <text x="448" y="72" fill="#67e8f9" fontSize="14" fontWeight="600">{en ? 'moving' : 'movimento'}</text>
            </svg>
            <figcaption className="border-t border-white/10 px-4 py-3 text-[12px] leading-relaxed text-white/60">
                {en
                    ? 'Earth at centre. Grey rings are distance bands (logarithmically spaced in the real view). The cone points in the direction of motion. The grey dashed line is the recent trajectory.'
                    : 'Terra no centro. Anéis cinzas são faixas de distância (com espaçamento logarítmico na vista real). O cone aponta na direção do movimento. A linha tracejada cinza é a trajetória recente.'}
            </figcaption>
        </figure>
    );
}

/**
 * Diagrama SVG didático da vista heliocêntrica da órbita.
 */
export function OrbitGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
    const en = locale === 'en';
    // Geometria do layout usada para manter o diagrama centralizado e legível.
    // Elipse: a=185, b=90 -> c=sqrt(185²-90²)=sqrt(26425)≈162.6
    // Centro da elipse: cx=270, cy=205
    // Sol no foco esquerdo: 107,205
    // Periélio: 85,205
    // Afélio: 455,205
    // Asteroide: E≈50° -> x≈389, y≈136
    const CX = 270;
    const CY = 205;
    const A = 185;
    const B = 90;
    const C = 163;
    const SUN_X = CX - C;
    const PERI_X = CX - A;
    const AST_X = 389;
    const AST_Y = 136;

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

                {/* Órbita completa desenhada em escala linear. */}
                <ellipse
                    cx={CX}
                    cy={CY}
                    rx={A}
                    ry={B}
                    fill="none"
                    stroke="#a78bfa"
                    strokeOpacity="0.90"
                    strokeWidth="2.5"
                />

                {/* Sol no foco esquerdo da elipse. */}
                <circle cx={SUN_X} cy={CY} r="22" fill="url(#og-sun)" filter="url(#og-sun-glow)" />
                <text x={SUN_X} y={CY + 42} textAnchor="middle" fill="#fed7aa" fontSize="15" fontWeight="700">{en ? 'Sun' : 'Sol'}</text>

                {/* Periélio como ponto mais próximo do Sol. */}
                <circle cx={PERI_X} cy={CY} r="4" fill="#fbbf24" opacity="0.85" />
                <text x={PERI_X + 8} y={CY - 10} fill="#fbbf24" fontSize="12" opacity="0.85">{en ? 'perihelion' : 'periélio'}</text>
                <text x={PERI_X + 8} y={CY + 6} fill="#fbbf24" fontSize="11" opacity="0.60">{en ? '(closest to Sun)' : '(mais perto do Sol)'}</text>

                {/* Asteroide em uma posição didática da elipse. */}
                <circle cx={AST_X} cy={AST_Y} r="11" fill="#f8fafc" filter="url(#og-glow)" />
                <path d={`M${AST_X - 8} ${AST_Y + 7} L${AST_X + 22} ${AST_Y - 22}`} stroke="#67e8f9" strokeWidth="2.5" markerEnd="url(#og-arrow)" />
                <text x={AST_X + 14} y={AST_Y - 6} fill="#e2e8f0" fontSize="13">{en ? 'asteroid' : 'asteroide'}</text>
                <text x={AST_X + 14} y={AST_Y - 21} fill="#67e8f9" fontSize="12" fontWeight="600">{en ? 'moving' : 'movimento'}</text>

                {/* Sobreposições da aba técnica. */}
                {technical && (
                    <>
                        <line x1={SUN_X} y1={CY} x2={AST_X} y2={AST_Y} stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="3 4" />
                        <text x={(SUN_X + AST_X) / 2} y={(CY + AST_Y) / 2 - 16} fill="#fef3c7" fontSize="13" fontStyle="italic" textAnchor="middle">p_ecl [AU]</text>
                        <rect x="286" y="312" width="244" height="66" rx="5" fill="#0a1628" fillOpacity="0.92" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1" />
                        <text x="300" y="331" fill="#bae6fd" fontSize="13" fontFamily="monospace">E − e·sin(E) = M</text>
                        <text x="300" y="350" fill="#bae6fd" fontSize="12" fontFamily="monospace" opacity="0.80">a = q / (1 − e)</text>
                        <text x="300" y="368" fill="#bae6fd" fontSize="12" fontFamily="monospace" opacity="0.65">n = k / a^(3/2)</text>
                    </>
                )}

                <text x="20" y="30" fill="#cbd5e1" fontSize="15" fontWeight="700">{en ? 'The full orbit — true to scale' : 'A órbita completa — em escala real'}</text>
                <text x="20" y="50" fill="#64748b" fontSize="13">{en ? '— Sun sits at one focus of the ellipse, not the centre' : '— o Sol fica em um foco da elipse, não no centro'}</text>
            </svg>
            <figcaption className="border-t border-white/10 px-4 py-3 text-[12px] leading-relaxed text-white/60">
                {en
                    ? 'Sun (orange) at the left focus — not at the centre of the ellipse. Purple oval = full orbit. White dot = asteroid today. Yellow dot = perihelion, the closest point to the Sun.'
                    : 'Sol (laranja) no foco esquerdo — não no centro da elipse. Oval roxo = órbita completa. Ponto branco = asteroide hoje. Ponto amarelo = periélio, o ponto mais próximo do Sol.'}
            </figcaption>
        </figure>
    );
}
