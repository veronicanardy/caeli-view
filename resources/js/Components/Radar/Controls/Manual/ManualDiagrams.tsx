/**
 * Diagrama SVG didático da vista do modo radar.
 *
 * A variante técnica adiciona sobreposições sem mudar a composição base.
 */
export function RadarGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
    const en = locale === 'en';
    // Terra centrada em (270, 172). Asteroide em (400, 90). Trajetória começa em (80, 190).
    // Lua posicionada a ~60px acima-esquerda da Terra (dentro do anel de 1 DL visual).
    const EX = 270; const EY = 172; const ER = 30;
    const AX = 400; const AY = 90;
    return (
        <figure className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#07101d]">
            <svg viewBox="0 0 540 280" className="h-auto max-h-[240px] w-full sm:max-h-[280px]" role="img" aria-label={en ? "Radar diagram — Earth's neighbourhood" : 'Diagrama do radar — vizinhança da Terra'}>
                <defs>
                    <radialGradient id="rg-earth" cx="38%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#93c5fd" />
                        <stop offset="50%" stopColor="#1d4ed8" />
                        <stop offset="100%" stopColor="#0a1628" />
                    </radialGradient>
                    <clipPath id="rg-earth-clip">
                        <circle cx={EX} cy={EY} r={ER} />
                    </clipPath>
                    <radialGradient id="rg-ast" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#e9d5ff" />
                        <stop offset="100%" stopColor="#7c3aed" />
                    </radialGradient>
                    <marker id="rg-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                        <path d="M0,0 L0,6 L7,3 z" fill="#67e8f9" />
                    </marker>
                    <filter id="rg-glow-ast" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="7" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="rg-glow-earth">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                <rect width="540" height="280" fill="#07101d" />

                {/* Anel de 1 DL — raio calibrado para passar pela posição da Lua (dist ~77px). */}
                <circle cx={EX} cy={EY} r="78"  fill="none" stroke="#94a3b8" strokeOpacity="0.18" strokeWidth="1" />

                {/*
                  Trajetória: começa em (80, 195), passa acima da Terra,
                  termina no asteroide (400, 90).
                  P0=(80,195) P1=(140,100) P2=(270,72) P3=(400,90)
                  Marcadores:
                    t=0.28 → ~(145,127) [−72h]
                    t=0.52 → ~(237, 83) [−48h]
                    t=0.74 → ~(334, 82) [−24h]
                */}
                <path d="M80 195 C140 100 270 72 400 90"
                    fill="none" stroke="#64748b" strokeOpacity="0.35" strokeWidth="1.5" />

                {/* Marcadores de tempo. */}
                <circle cx="145" cy="127" r="2.5" fill="#475569" />
                <text x="153" y="124" fill="#475569" fontSize="9.5" textAnchor="start">−72h</text>

                <circle cx="237" cy="83" r="2.5" fill="#475569" />
                <text x="237" y="76" fill="#475569" fontSize="9.5" textAnchor="middle">−48h</text>

                <circle cx="334" cy="82" r="2.5" fill="#64748b" />
                <text x="334" y="75" fill="#64748b" fontSize="9.5" textAnchor="middle">−24h</text>

                {/* Lua — a ~55px acima-esquerda da Terra, dentro do 1º anel. */}
                <text x="213" y="120" fontSize="18" textAnchor="middle">🌙</text>
                <text x="213" y="135" fill="#94a3b8" fontSize="10.5" fontWeight="500" textAnchor="middle">{en ? '1 LD' : '1 DL'}</text>

                {/* Asteroide. */}
                <circle cx={AX} cy={AY} r="8" fill="url(#rg-ast)" filter="url(#rg-glow-ast)" opacity="0.75" />

                {/* Seta de direção. */}
                <line x1={AX + 8} y1={AY + 1} x2={AX + 50} y2={AY + 8} stroke="#67e8f9" strokeWidth="2" markerEnd="url(#rg-arrow)" strokeOpacity="0.65" />

                {/* Label do asteroide. */}
                <line x1={AX} y1={AY - 8} x2={AX} y2={AY - 34} stroke="#475569" strokeWidth="0.8" />
                <text x={AX} y={AY - 38} fill="#c4b5fd" fontSize="11" fontWeight="600" textAnchor="middle">{en ? 'asteroid · now' : 'asteroide · agora'}</text>
                <text x={AX + 55} y={AY + 14} fill="#67e8f9" fontSize="10.5" textAnchor="start">{en ? 'direction →' : 'direção →'}</text>

                {/* Terra. */}
                <circle cx={EX} cy={EY} r={ER} fill="url(#rg-earth)" filter="url(#rg-glow-earth)" />
                <g clipPath="url(#rg-earth-clip)" opacity="0.80">
                    {/* América do Norte */}
                    <path d="M252 155 C253 151 256 148 260 148 C264 148 267 150 268 153 C269 156 267 158 265 160 C263 162 263 164 261 165 C259 166 256 165 254 163 C252 161 251 158 252 155Z" fill="#166534" />
                    {/* América do Sul */}
                    <path d="M259 167 C261 166 264 167 265 170 C266 173 265 177 263 180 C261 182 259 182 257 180 C255 178 254 174 255 171 C255 168 257 167 259 167Z" fill="#15803d" />
                    {/* África */}
                    <path d="M278 155 C281 154 285 155 286 158 C287 161 286 164 284 166 C283 168 283 170 282 172 C281 175 280 178 279 179 C277 179 276 177 276 174 C275 170 276 166 276 163 C276 160 276 156 278 155Z" fill="#15803d" />
                </g>
                {/* Brilho atmosférico */}
                <circle cx={EX} cy={EY} r={ER} fill="none" stroke="#7dd3fc" strokeOpacity="0.22" strokeWidth="1.5" />
                <circle cx={EX - 8} cy={EY - 8} r="7" fill="white" opacity="0.05" />
                <text x={EX} y={EY + ER + 16} textAnchor="middle" fill="#bae6fd" fontSize="12" fontWeight="600">{en ? 'Earth' : 'Terra'}</text>

                {/* Sobreposições da aba técnica. */}
                {technical && (
                    <>
                        <line x1={EX} y1={EY} x2={AX} y2={AY} stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.85" strokeDasharray="3 4" />
                        <text x={(EX + AX) / 2 + 8} y={(EY + AY) / 2 - 10} fill="#fef3c7" fontSize="11" fontStyle="italic" textAnchor="middle">r = (x, y, z)</text>
                        <rect x="12" y="222" width="232" height="48" rx="5" fill="#0a1628" fillOpacity="0.92" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1" />
                        <text x="22" y="242" fill="#bae6fd" fontSize="11" fontFamily="monospace">r_scene = f(d_DL) · r̂</text>
                        <text x="22" y="260" fill="#bae6fd" fontSize="10" fontFamily="monospace" opacity="0.75">f(r) = K · ln(1 + r/R₀)</text>
                    </>
                )}
            </svg>
            <figcaption className="border-t border-white/[0.06] px-4 py-2.5 text-[12px] leading-relaxed text-white/55">
                {en
                    ? 'Earth at centre. The line is the trajectory of the asteroid — markers show the past 72 hours. The arrow shows where it is heading.'
                    : 'Terra no centro. A linha é a trajetória do asteroide — as marcações mostram as últimas 72 horas. A seta mostra para onde ele está indo.'}
            </figcaption>
        </figure>
    );
}

/**
 * Diagrama SVG didático da vista heliocêntrica da órbita.
 */
export function OrbitGuideDiagram({ locale, technical = false }: { locale: 'pt-BR' | 'en'; technical?: boolean }) {
    const en = locale === 'en';
    // e=0.75, a=185, b=122 → c=139. CX=300 (centro deslocado à direita para dar espaço ao periélio).
    // SUN=161, PERI=115, r_sol=13 → borda_sol=148. gap=115-148=-33: periélio 33px à esquerda da borda do Sol — claramente visível.
    // Elipse vai de x=115 a x=485, y de 36 a 280 — cabe no viewBox 540×300.
    const CX = 300;
    const CY = 158;
    const A = 185;
    const B = 122;
    const C = 139;
    const SUN_X = CX - C; // 161
    const PERI_X = CX - A; // 115
    const AST_X = 442;
    const AST_Y = 80;

    return (
        <figure className="overflow-hidden rounded-lg border border-white/[0.06] bg-[#07101d]">
            <svg viewBox="0 0 700 300" className="h-auto max-h-[260px] w-full sm:max-h-[300px]" role="img" aria-label={en ? 'Sun-centred orbit diagram' : 'Diagrama orbital centrado no Sol'}>
                <defs>
                    <radialGradient id="og-sun" cx="42%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#fef9c3" />
                        <stop offset="35%" stopColor="#fbbf24" />
                        <stop offset="70%" stopColor="#ea580c" />
                        <stop offset="100%" stopColor="#07101d" />
                    </radialGradient>
                    <radialGradient id="og-ast" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#e9d5ff" />
                        <stop offset="100%" stopColor="#7c3aed" />
                    </radialGradient>
                    <filter id="og-glow-ast" x="-80%" y="-80%" width="260%" height="260%">
                        <feGaussianBlur stdDeviation="7" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="og-glow-sun" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="14" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                <rect width="540" height="300" fill="#07101d" />

                {/* Órbita completa. */}
                <ellipse cx={CX} cy={CY} rx={A} ry={B} fill="none" stroke="#a78bfa" strokeOpacity="0.85" strokeWidth="2" />

                {/* Label da órbita. */}
                <text x={CX} y={CY + B + 16} textAnchor="middle" fill="#7c3aed" fontSize="11" opacity="0.70">{en ? 'orbit' : 'órbita'}</text>

                {/* Sol no foco esquerdo. */}
                <circle cx={SUN_X} cy={CY} r="14" fill="url(#og-sun)" filter="url(#og-glow-sun)" />
                <text x={SUN_X} y={CY + 28} textAnchor="middle" fill="#fed7aa" fontSize="12" fontWeight="600">{en ? 'Sun' : 'Sol'}</text>

                {/* Periélio. */}
                <circle cx={PERI_X} cy={CY} r="3.5" fill="#fbbf24" opacity="0.80" />
                <text x={PERI_X - 6} y={CY - 8} fill="#fbbf24" fontSize="10" opacity="0.70" textAnchor="end">{en ? 'perihelion' : 'periélio'}</text>

                {/* Asteroide — bolinha roxa, mesmo padrão do radar. */}
                <circle cx={AST_X} cy={AST_Y} r="7" fill="url(#og-ast)" filter="url(#og-glow-ast)" />

                {/* Label do asteroide. */}
                <text x={AST_X} y={AST_Y - 26} fill="#c4b5fd" fontSize="11" fontWeight="600" textAnchor="middle">{en ? 'asteroid · now' : 'asteroide · agora'}</text>

                {/* Sobreposições da aba técnica. */}
                {technical && (
                    <>
                        <line x1={SUN_X} y1={CY} x2={AST_X} y2={AST_Y} stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.8" strokeDasharray="3 4" />
                        <text x={(SUN_X + AST_X) / 2 - 8} y={(CY + AST_Y) / 2 - 14} fill="#fef3c7" fontSize="11" fontStyle="italic" textAnchor="middle">p_ecl [AU]</text>
                        <rect x="549" y="72" width="145" height="144" rx="5" fill="#0a1628" fillOpacity="0.95" stroke="#22d3ee" strokeOpacity="0.30" strokeWidth="1" />

                        <text x="561" y="91" fill="#94a3b8" fontSize="9" fontFamily="sans-serif" textAnchor="start" letterSpacing="0.08em">{en ? 'KEPLER PIPELINE' : 'PIPELINE KEPLERIANO'}</text>

                        <text x="561" y="113" fill="#bae6fd" fontSize="12" fontFamily="monospace" fontWeight="600">a = q / (1 − e)</text>
                        <text x="561" y="126" fill="#64748b" fontSize="9" fontFamily="sans-serif">{en ? 'semi-major axis from perihelion' : 'semieixo maior a partir do periélio'}</text>

                        <text x="561" y="148" fill="#bae6fd" fontSize="12" fontFamily="monospace" fontWeight="600">n = k / a^(3/2)</text>
                        <text x="561" y="161" fill="#64748b" fontSize="9" fontFamily="sans-serif">{en ? 'mean angular velocity' : 'velocidade angular média'}</text>

                        <text x="561" y="183" fill="#bae6fd" fontSize="12" fontFamily="monospace" fontWeight="600">E − e·sin(E) = M</text>
                        <text x="561" y="196" fill="#64748b" fontSize="9" fontFamily="sans-serif">{en ? 'solve for E → position on ellipse' : 'resolver E → posição na elipse'}</text>
                    </>
                )}
            </svg>
        </figure>
    );
}
