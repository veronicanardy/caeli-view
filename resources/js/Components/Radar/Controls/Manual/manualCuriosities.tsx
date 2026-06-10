/**
 * Curiosidades do manual do radar.
 *
 * Responsabilidade: centralizar perguntas e respostas exibidas na seção de
 * curiosidades do FriendlyManual, em PT-BR e EN. As respostas são ReactNode
 * para suportar SVGs e elementos visuais inline.
 */

export type CuriosityItemData = {
    q: string;
    a: React.ReactNode;
};

/* ── Componentes visuais compartilhados ─────────────────────────────────── */

function Visual({ children }: { children: React.ReactNode }) {
    return (
        <div className="my-3 overflow-hidden rounded-md border border-white/[0.07] bg-black/20 p-3">
            {children}
        </div>
    );
}

function VisualLabel({ children }: { children: React.ReactNode }) {
    return <p className="mt-2 text-center text-[10.5px] text-white/40 leading-relaxed first-letter:capitalize">{children}</p>;
}

/* ── SVGs das curiosidades do radar ─────────────────────────────────────── */

function NamingCodeDiagram({ en }: { en: boolean }) {
    return (
        <Visual>
            <svg viewBox="0 0 380 84" className="w-full" aria-hidden>
                <defs>
                    <linearGradient id="nc-box-year" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e293b" /><stop offset="100%" stopColor="#0f172a" />
                    </linearGradient>
                    <linearGradient id="nc-box-cyan" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0e2a3a" /><stop offset="100%" stopColor="#061520" />
                    </linearGradient>
                    <linearGradient id="nc-box-violet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e1a3a" /><stop offset="100%" stopColor="#100e22" />
                    </linearGradient>
                </defs>

                {/* Caixas com gradiente */}
                <rect x="4"   y="14" width="68" height="34" rx="6" fill="url(#nc-box-year)"   stroke="#334155"  strokeWidth="1" />
                <rect x="82"  y="14" width="34" height="34" rx="6" fill="url(#nc-box-cyan)"   stroke="#22d3ee"  strokeWidth="1.2" />
                <rect x="126" y="14" width="34" height="34" rx="6" fill="url(#nc-box-violet)" stroke="#a78bfa"  strokeWidth="1.2" />
                <rect x="170" y="14" width="34" height="34" rx="6" fill="url(#nc-box-violet)" stroke="#a78bfa"  strokeWidth="1.2" />

                {/* Texto dentro das caixas */}
                <text x="38"  y="36" textAnchor="middle" fill="#94a3b8" fontSize="15" fontWeight="700" fontFamily="monospace">2026</text>
                <text x="99"  y="36" textAnchor="middle" fill="#67e8f9" fontSize="15" fontWeight="700" fontFamily="monospace">K</text>
                <text x="143" y="36" textAnchor="middle" fill="#c4b5fd" fontSize="15" fontWeight="700" fontFamily="monospace">X</text>
                <text x="187" y="36" textAnchor="middle" fill="#c4b5fd" fontSize="15" fontWeight="700" fontFamily="monospace">1</text>

                {/* Labels de categoria abaixo */}
                <text x="38"  y="62" textAnchor="middle" fill="#475569" fontSize="8.5">{en ? 'year' : 'ano'}</text>
                <text x="99"  y="62" textAnchor="middle" fill="#67e8f9" fontSize="8.5" opacity="0.85">{en ? 'half-month' : 'quinzena'}</text>
                <text x="143" y="62" textAnchor="middle" fill="#a78bfa" fontSize="8.5" opacity="0.85">{en ? 'order' : 'ordem'}</text>
                <text x="187" y="62" textAnchor="middle" fill="#a78bfa" fontSize="8.5" opacity="0.85">{en ? 'cycle' : 'ciclo'}</text>

                {/* Separador vertical */}
                <line x1="218" y1="12" x2="218" y2="72" stroke="#1e293b" strokeWidth="1" />

                {/* Legenda à direita */}
                <text x="228" y="26" fill="#67e8f9"  fontSize="9" fontWeight="700">K</text>
                <text x="238" y="26" fill="#64748b"  fontSize="9">= {en ? '2nd half of May' : '2ª metade de maio'}</text>
                <text x="228" y="42" fill="#c4b5fd"  fontSize="9" fontWeight="700">X</text>
                <text x="238" y="42" fill="#64748b"  fontSize="9">= {en ? '24th object discovered' : '24º objeto descoberto'}</text>
                <text x="228" y="58" fill="#c4b5fd"  fontSize="9" fontWeight="700">1</text>
                <text x="238" y="58" fill="#64748b"  fontSize="9">= {en ? '2nd letter cycle' : '2º ciclo de letras'}</text>
            </svg>
            <VisualLabel>{en ? 'How to read a provisional designation: year, fortnight, and discovery order.' : 'Como ler uma designação provisória: ano, quinzena e ordem de descoberta.'}</VisualLabel>
        </Visual>
    );
}

function AsteroidVsCometDiagram({ en }: { en: boolean }) {
    return (
        <Visual>
            <svg viewBox="0 0 340 116" className="w-full" aria-hidden>
                <defs>
                    <radialGradient id="ac-sun-l" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#fef08a" /><stop offset="60%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#92400e" />
                    </radialGradient>
                    <radialGradient id="ac-sun-r" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#fef08a" /><stop offset="60%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#92400e" />
                    </radialGradient>
                    <radialGradient id="ac-comet" cx="35%" cy="30%" r="65%">
                        <stop offset="0%" stopColor="#bae6fd" /><stop offset="50%" stopColor="#1a3548" /><stop offset="100%" stopColor="#0c1f2e" />
                    </radialGradient>
                    <radialGradient id="ac-sun-halo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </radialGradient>
                    <filter id="ac-glow-comet">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* ── Painel esquerdo: Asteroide ── */}
                <text x="85" y="13" textAnchor="middle" fill="#c4b5fd" fontSize="8.5" fontWeight="700" letterSpacing="1.2">{en ? 'ASTEROID' : 'ASTEROIDE'}</text>

                {/* Sol distante à esquerda */}
                <circle cx="20" cy="55" r="20" fill="url(#ac-sun-halo)" opacity="0.9" />
                <circle cx="20" cy="55" r="9" fill="url(#ac-sun-l)" opacity="0.9" />
                <line x1="29" y1="55" x2="56" y2="55" stroke="#fbbf24" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3 4" />

                {/* Corpo rochoso irregular */}
                <polygon points="62,44 70,35 83,32 97,37 106,48 102,60 91,67 76,66 64,58" fill="#3d4f63" stroke="#64748b" strokeWidth="1.2" />
                {/* Facetas de sombra para dar volume */}
                <polygon points="66,46 73,39 80,38 73,52 65,54" fill="#253040" opacity="0.75" />
                <polygon points="89,56 99,51 102,59 94,65 88,63" fill="#253040" opacity="0.65" />
                {/* Highlight */}
                <polygon points="70,36 80,33 85,36 76,40" fill="#5a7080" opacity="0.45" />

                <text x="84" y="84" textAnchor="middle" fill="#64748b" fontSize="8.5" fontWeight="500">{en ? 'no tail' : 'sem cauda'}</text>
                <text x="84" y="97" textAnchor="middle" fill="#334155" fontSize="7.5">{en ? 'rocky · stays inert near Sun' : 'rochoso · permanece inerte perto do Sol'}</text>

                {/* Divisor */}
                <line x1="170" y1="6" x2="170" y2="108" stroke="#1e3a52" strokeWidth="1.2" />

                {/* ── Painel direito: Cometa ── */}
                <text x="255" y="13" textAnchor="middle" fill="#67e8f9" fontSize="8.5" fontWeight="700" letterSpacing="1.2">{en ? 'COMET' : 'COMETA'}</text>

                {/* Sol próximo à esquerda */}
                <circle cx="188" cy="55" r="22" fill="url(#ac-sun-halo)" opacity="0.95" />
                <circle cx="188" cy="55" r="10" fill="url(#ac-sun-r)" opacity="0.95" />

                {/* Coma difusa */}
                <circle cx="235" cy="55" r="18" fill="#0d2233" opacity="0.5" />
                <circle cx="234" cy="54" r="12" fill="#112b40" opacity="0.6" />

                {/* Núcleo do cometa com gradiente */}
                <circle cx="234" cy="55" r="9" fill="url(#ac-comet)" stroke="#38bdf8" strokeWidth="1" filter="url(#ac-glow-comet)" />
                {/* Highlight no núcleo */}
                <circle cx="231" cy="52" r="3" fill="#7dd3fc" opacity="0.25" />

                {/* Cauda de íons — reta, afastando-se do Sol */}
                <path d="M243 51 C260 46 280 43 316 39" fill="none" stroke="#67e8f9" strokeWidth="2.5" strokeOpacity="0.6" strokeLinecap="round" />
                <path d="M243 50 C260 45 280 42 316 38" fill="none" stroke="#e0f2fe" strokeWidth="0.8" strokeOpacity="0.25" strokeLinecap="round" />

                {/* Cauda de poeira — curvada */}
                <path d="M243 59 C260 62 282 68 316 76" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeOpacity="0.28" strokeLinecap="round" />

                {/* Labels das caudas */}
                <text x="318" y="38" fill="#67e8f9" fontSize="7.5" opacity="0.85">{en ? 'Ions' : 'Íons'}</text>
                <text x="318" y="78" fill="#64748b" fontSize="7.5" opacity="0.75">{en ? 'Dust' : 'Poeira'}</text>

                <text x="253" y="84" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontWeight="500">{en ? 'Tail away from Sun' : 'cauda longe do Sol'}</text>
                <text x="253" y="97" textAnchor="middle" fill="#334155" fontSize="7.5">{en ? 'Ice turns to gas when heated' : 'gelo vira gás com o calor'}</text>
            </svg>
            <VisualLabel>{en ? 'Asteroid: rocky, no tail. Comet: icy body with two tails blown by the Sun. One tail is gas, the other is dust.' : 'Asteroide: rochoso, sem cauda. Cometa: corpo gelado com duas caudas sopradas pelo Sol. Uma é de gás e a outra de poeira.'}</VisualLabel>
        </Visual>
    );
}

function TorinoScaleDiagram({ en }: { en: boolean }) {
    const levels  = [0,1,2,3,4,5,6,7,8,9,10];
    // Gradiente de verde a vermelho escuro
    const colors  = ['#14532d','#166534','#15803d','#16a34a','#854d0e','#d97706','#ea580c','#dc2626','#991b1b','#7f1d1d','#450a0a'];
    const borders = ['#166534','#15803d','#16a34a','#4ade80','#ca8a04','#f59e0b','#f97316','#ef4444','#dc2626','#b91c1c','#7f1d1d'];
    const w = 24;
    return (
        <Visual>
            <svg viewBox="0 0 340 76" className="w-full" aria-hidden>
                <defs>
                    <linearGradient id="tor-bar-glow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="white" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="white" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {levels.map((v, i) => (
                    <g key={v}>
                        <rect x={4 + i * w} y="10" width={w - 2} height="24" rx="4" fill={colors[i]} stroke={borders[i]} strokeWidth="0.6" strokeOpacity="0.6" />
                        {/* Reflexo interno */}
                        <rect x={4 + i * w} y="10" width={w - 2} height="12" rx="4" fill="url(#tor-bar-glow)" />
                        <text x={4 + i * w + (w - 2) / 2} y="27" textAnchor="middle" fill="white" fontSize="9" fontWeight="700" opacity="0.95">{v}</text>
                    </g>
                ))}
                {/* Seta "maioria dos objetos = 0" */}
                <line x1="15" y1="34" x2="15" y2="46" stroke="#4ade80" strokeWidth="1.5" />
                <circle cx="15" cy="47" r="2" fill="#4ade80" opacity="0.8" />
                <text x="15" y="58" textAnchor="middle" fill="#4ade80" fontSize="8" fontWeight="500">{en ? 'Most objects' : 'Maioria'}</text>

                {/* Legenda de faixas de cor */}
                <rect x="276" y="10" width="8" height="8" rx="2" fill="#15803d" />
                <text x="288" y="18" fill="#64748b" fontSize="7.5">{en ? '0–3 Routine' : '0–3 Rotina'}</text>
                <rect x="276" y="22" width="8" height="8" rx="2" fill="#d97706" />
                <text x="288" y="30" fill="#64748b" fontSize="7.5">{en ? '4–6 Watch' : '4–6 Atenção'}</text>
                <rect x="276" y="34" width="8" height="8" rx="2" fill="#dc2626" />
                <text x="288" y="42" fill="#64748b" fontSize="7.5">{en ? '7–10 Threat' : '7–10 Ameaça'}</text>
            </svg>
            <VisualLabel>{en ? 'The Torino Scale: 0 is no concern, 10 is certain impact. Almost every known asteroid sits at 0.' : 'A Escala de Torino: 0 é sem preocupação, 10 é impacto certo. Quase todos os asteroides conhecidos ficam em 0.'}</VisualLabel>
        </Visual>
    );
}

function SizeDiagram({ en }: { en: boolean }) {
    return (
        <Visual>
            <svg viewBox="0 0 340 112" className="w-full" aria-hidden>
                <defs>
                    <linearGradient id="sz-building" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#475569" /><stop offset="100%" stopColor="#2d3a4a" />
                    </linearGradient>
                    <linearGradient id="sz-city" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3f5068" /><stop offset="100%" stopColor="#253040" />
                    </linearGradient>
                </defs>

                {/* Linha de base */}
                <line x1="8" y1="68" x2="332" y2="68" stroke="#1e3a52" strokeWidth="1.2" />

                {/* 10 m — meteorito pequeno */}
                <circle cx="22" cy="65" r="3.5" fill="#475569" stroke="#64748b" strokeWidth="0.8" />
                <line x1="22" y1="68" x2="22" y2="74" stroke="#334155" strokeWidth="1" />
                <text x="22" y="84" textAnchor="middle" fill="#475569" fontSize="8">10 m</text>

                {/* 140 m — estádio, vista aérea */}
                {/* Arquibancada externa */}
                <ellipse cx="72" cy="59" rx="18" ry="12" fill="#2a3a4a" stroke="#64748b" strokeWidth="1" />
                {/* Gramado interno */}
                <ellipse cx="72" cy="59" rx="12" ry="7" fill="#14532d" stroke="#16a34a" strokeWidth="0.8" />
                {/* Linha central do gramado */}
                <line x1="72" y1="52" x2="72" y2="66" stroke="#22c55e" strokeWidth="0.6" strokeOpacity="0.5" />
                {/* Círculo central */}
                <circle cx="72" cy="59" r="3" fill="none" stroke="#22c55e" strokeWidth="0.6" strokeOpacity="0.5" />
                <line x1="72" y1="47" x2="72" y2="38" stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 3" />
                <text x="72" y="35" textAnchor="middle" fill="#fbbf24" fontSize="7.5" fontWeight="700">{en ? 'Hazard limit' : 'Limite de risco'}</text>
                <text x="72" y="25" textAnchor="middle" fill="#fbbf24" fontSize="7">140 m</text>
                <line x1="72" y1="71" x2="72" y2="74" stroke="#334155" strokeWidth="1" />
                <text x="72" y="84" textAnchor="middle" fill="#475569" fontSize="7.5">{en ? '≈ stadium' : '≈ estádio'}</text>

                {/* 1 km — quarteirão de prédios */}
                {/* Prédio esquerdo — médio */}
                <rect x="112" y="44" width="10" height="24" rx="1" fill="url(#sz-city)" stroke="#52525b" strokeWidth="0.8" />
                <rect x="114" y="47" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="114" y="52" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="114" y="57" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                {/* Prédio central — mais alto */}
                <rect x="124" y="34" width="12" height="34" rx="1" fill="url(#sz-city)" stroke="#64748b" strokeWidth="0.8" />
                <rect x="126" y="37" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="131" y="37" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="126" y="43" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="131" y="43" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="126" y="49" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="131" y="49" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="126" y="55" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="131" y="55" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                {/* Prédio direito — baixo */}
                <rect x="138" y="52" width="9" height="16" rx="1" fill="url(#sz-city)" stroke="#52525b" strokeWidth="0.8" />
                <rect x="140" y="55" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <rect x="140" y="60" width="3" height="2" fill="#7dd3fc" opacity="0.2" />
                <line x1="130" y1="68" x2="130" y2="74" stroke="#334155" strokeWidth="1" />
                <text x="130" y="84" textAnchor="middle" fill="#475569" fontSize="8">1 km</text>
                <text x="130" y="26" textAnchor="middle" fill="#94a3b8" fontSize="7.5">{en ? 'City block' : 'Quarteirão'}</text>

                {/* Meteor Crater — elipse violeta */}
                <ellipse cx="200" cy="68" rx="20" ry="8" fill="#2d1a4a" fillOpacity="0.4" stroke="#a78bfa" strokeWidth="1.3" strokeDasharray="3 2" />
                <line x1="200" y1="60" x2="200" y2="48" stroke="#a78bfa" strokeWidth="0.8" strokeOpacity="0.6" />
                <text x="200" y="45" textAnchor="middle" fill="#a78bfa" fontSize="7.5" fontWeight="600">{en ? 'Meteor Crater' : 'Cratera do Arizona'}</text>
                <text x="200" y="84" textAnchor="middle" fill="#64748b" fontSize="7.5">1.2 km</text>

                {/* Chicxulub — elipse vermelha dominante */}
                <ellipse cx="284" cy="68" rx="44" ry="11" fill="#3a0a0a" fillOpacity="0.45" stroke="#f87171" strokeWidth="1.4" strokeDasharray="4 2" />
                <line x1="284" y1="57" x2="284" y2="40" stroke="#f87171" strokeWidth="0.9" strokeOpacity="0.55" />
                <text x="284" y="37" textAnchor="middle" fill="#f87171" fontSize="8.5" fontWeight="700">Chicxulub</text>
                <text x="284" y="26" textAnchor="middle" fill="#64748b" fontSize="7">~180 km · {en ? 'killed the dinosaurs' : 'matou os dinossauros'}</text>
                <text x="284" y="90" textAnchor="middle" fill="#64748b" fontSize="7.5">~180 km</text>
            </svg>
            <VisualLabel>{en ? 'Objects grow from left to right. The craters on the right show the scale of damage each size can cause.' : 'Os objetos crescem da esquerda para a direita. As crateras mostram a escala de destruição que cada tamanho pode causar.'}</VisualLabel>
        </Visual>
    );
}

function SpeedDiagram({ en }: { en: boolean }) {
    const items = [
        { label: en ? 'Plane'             : 'Avião',              km: 0.25, display: '0.25' },
        { label: en ? 'Bullet'            : 'Bala',               km: 1,    display: '1'    },
        { label: en ? 'Space Station'    : 'Estação Espacial',    km: 7.7,  display: '7.7'  },
        { label: en ? 'Asteroid · slowest' : 'Asteroide · mais lento',  km: 10, display: '10' },
        { label: en ? 'Asteroid · fastest' : 'Asteroide · mais rápido', km: 30, display: '30' },
    ];
    const colors   = ['#475569','#64748b','#67e8f9','#c4b5fd','#a78bfa'];
    const bgColors = ['#0f172a','#0f172a','#0c2233','#150f2e','#120a2a'];
    // escala: 30 km/s → 190 px
    const scale = 190 / 30;
    const rowH = 22; const startX = 96; const startY = 8;
    return (
        <Visual>
            <svg viewBox={`0 0 340 ${startY + items.length * rowH + 4}`} className="w-full" aria-hidden>
                {/* Linha de grade vertical sutil */}
                {[0, 5, 10, 15, 20, 25, 30].map(v => (
                    <line key={v}
                        x1={startX + v * scale} y1={startY} x2={startX + v * scale} y2={startY + items.length * rowH}
                        stroke="#1e293b" strokeWidth={v === 0 ? 1.2 : 0.5} />
                ))}
                {items.map((item, i) => {
                    const barW = Math.max(2, item.km * scale);
                    const y = startY + i * rowH;
                    return (
                        <g key={item.label}>
                            {/* Fundo de linha */}
                            <rect x={startX} y={y + 4} width={190} height={14} rx="3" fill={bgColors[i]} opacity="0.6" />
                            {/* Barra */}
                            <rect x={startX} y={y + 4} width={barW} height={14} rx="3" fill={colors[i]} opacity="0.8" />
                            {/* Reflexo */}
                            <rect x={startX} y={y + 4} width={barW} height={6} rx="3" fill="white" opacity="0.07" />
                            {/* Label de nome */}
                            <text x={startX - 4} y={y + 14} textAnchor="end" fill="#64748b" fontSize="8.5" dominantBaseline="middle">{item.label}</text>
                            {/* Valor km/s */}
                            <text x={startX + barW + 5} y={y + 14} fill={colors[i]} fontSize="8" dominantBaseline="middle" opacity="0.95" fontWeight="600">{item.display} km/s</text>
                        </g>
                    );
                })}
                {/* Eixo de escala */}
                {[0, 10, 20, 30].map(v => (
                    <text key={v} x={startX + v * scale} y={startY + items.length * rowH + 10}
                        textAnchor="middle" fill="#334155" fontSize="7">{v}</text>
                ))}
            </svg>
            <VisualLabel>{en ? 'Speed comparison: plane, bullet, space station, and the range asteroids travel at.' : 'Comparação de velocidades: avião, bala, estação espacial e a faixa em que asteroides viajam.'}</VisualLabel>
        </Visual>
    );
}

function MoonCratersDiagram({ en }: { en: boolean }) {
    return (
        <Visual>
            <svg viewBox="0 0 340 110" className="w-full" aria-hidden>
                <defs>
                    {/* Lua: prata com highlight no topo-esquerdo */}
                    <radialGradient id="mc-moon" cx="35%" cy="28%" r="70%">
                        <stop offset="0%" stopColor="#d8d8d8" />
                        <stop offset="45%" stopColor="#a8a8a8" />
                        <stop offset="100%" stopColor="#484848" />
                    </radialGradient>
                    {/* Mare lunar (região escura) */}
                    <radialGradient id="mc-mare" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#4a4840" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#4a4840" stopOpacity="0" />
                    </radialGradient>
                    {/* Terra */}
                    <radialGradient id="mc-earth" cx="38%" cy="32%" r="65%">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#0c1a2e" />
                    </radialGradient>
                    {/* Atmosfera halo */}
                    <radialGradient id="mc-atmo" cx="50%" cy="50%" r="50%">
                        <stop offset="78%" stopColor="#7dd3fc" stopOpacity="0" />
                        <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.2" />
                    </radialGradient>
                    {/* Clip para crateras dentro da Lua */}
                    <clipPath id="mc-moon-clip"><circle cx="88" cy="54" r="34" /></clipPath>
                    {/* Clip para Terra */}
                    <clipPath id="mc-earth-clip"><circle cx="252" cy="54" r="34" /></clipPath>
                    {/* Cauda do meteoro: sólido no topo, some na ponta */}
                    <linearGradient id="mc-moon-trail" x1="56" y1="17" x2="74" y2="37" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </linearGradient>
                    {/* Halo suave para o flash de impacto na Lua */}
                    <radialGradient id="mc-impact-flash" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.85" />
                        <stop offset="25%" stopColor="#f97316" stopOpacity="0.3" />
                        <stop offset="60%" stopColor="#f97316" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                    </radialGradient>
                    <filter id="mc-meteor-glow">
                        <feGaussianBlur stdDeviation="2.5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* ── Lua ─────────────────────────────────────────────── */}
                <circle cx="88" cy="54" r="34" fill="url(#mc-moon)" />
                {/* Mares lunares — manchas escuras características da Lua real */}
                <g clipPath="url(#mc-moon-clip)">
                    <ellipse cx="82" cy="46" rx="14" ry="10" fill="#686868" opacity="0.55" />
                    <ellipse cx="97" cy="59" rx="10" ry="7" fill="#606060" opacity="0.5" />
                    <ellipse cx="74" cy="62" rx="7" ry="5" fill="#646464" opacity="0.45" />
                    <ellipse cx="100" cy="44" rx="5" ry="4" fill="#6a6a6a" opacity="0.4" />
                    {/* Crateras — anel exterior claro + interior escuro */}
                    {/* [73,40,8] removida — fica sob o ponto de impacto */}
                    {([[98,56,11],[82,66,6],[107,39,4.5],[67,52,4],[94,70,7],[115,54,4],[77,74,5],[59,46,4.5],[108,67,3]] as [number,number,number][]).map(([cx,cy,r],i) => (
                        <g key={i}>
                            <circle cx={cx} cy={cy} r={r} fill="#3c3c3c" stroke="#c0c0c0" strokeWidth="0.6" opacity="0.75" />
                            <circle cx={cx - r * 0.25} cy={cy - r * 0.25} r={r * 0.45} fill="#909090" opacity="0.35" />
                        </g>
                    ))}
                    {/* Brilho de limbo (curvatura) */}
                    <circle cx="88" cy="54" r="34" fill="none" stroke="#e8e8e8" strokeWidth="1.5" strokeOpacity="0.1" />
                </g>
                {/* Borda da Lua */}
                <circle cx="88" cy="54" r="34" fill="none" stroke="#706e66" strokeWidth="0.8" />
                <text x="88" y="99" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">{en ? 'Moon' : 'Lua'}</text>
                {/* Label "sem atmosfera" abaixo do título, acima do corpo */}
                <text x="88" y="13" textAnchor="middle" fill="#64748b" fontSize="7.5">{en ? 'No atmosphere' : 'Sem atmosfera'}</text>

                {/* Meteoro bate direto na Lua — cauda com fade nas bordas */}
                <line x1="56" y1="17" x2="74" y2="37" stroke="url(#mc-moon-trail)" strokeWidth="2.5" strokeLinecap="round" />
                {/* Flash de impacto com fade radial nas bordas */}
                <circle cx="74" cy="37" r="10" fill="url(#mc-impact-flash)" />
                {/* Núcleo brilhante do impacto */}
                <circle cx="74" cy="37" r="2.5" fill="#fff7ed" filter="url(#mc-meteor-glow)" opacity="0.95" />
                {/* Ejecta — fragmentos espalhados */}
                <line x1="74" y1="37" x2="68" y2="30" stroke="#fbbf24" strokeWidth="0.8" strokeOpacity="0.6" strokeLinecap="round" />
                <line x1="74" y1="37" x2="80" y2="30" stroke="#fbbf24" strokeWidth="0.8" strokeOpacity="0.5" strokeLinecap="round" />
                <line x1="74" y1="37" x2="65" y2="36" stroke="#fbbf24" strokeWidth="0.7" strokeOpacity="0.45" strokeLinecap="round" />
                <line x1="74" y1="37" x2="83" y2="35" stroke="#fbbf24" strokeWidth="0.7" strokeOpacity="0.4" strokeLinecap="round" />

                {/* ── Terra ─────────────────────────────────────────────── */}
                <circle cx="252" cy="54" r="34" fill="url(#mc-earth)" />
                <g clipPath="url(#mc-earth-clip)">
                    {/* Oceano base já é o gradiente */}
                    {/* Continentes */}
                    <path d="M237 42 C241 36 252 37 257 42 C262 47 260 54 255 57 C250 60 241 58 237 54 C233 50 233 46 237 42Z" fill="#166534" opacity="0.8" />
                    <path d="M244 59 C247 57 253 59 254 63 C255 67 252 70 248 70 C244 70 243 66 244 63Z" fill="#15803d" opacity="0.65" />
                    <path d="M262 44 C264 42 268 43 268 46 C268 49 265 50 263 49 C261 48 261 46 262 44Z" fill="#166534" opacity="0.5" />
                    {/* Nuvem */}
                    <ellipse cx="240" cy="50" rx="7" ry="3" fill="white" opacity="0.18" />
                </g>
                {/* Atmosfera halo */}
                <circle cx="252" cy="54" r="39" fill="url(#mc-atmo)" />
                <circle cx="252" cy="54" r="34" fill="none" stroke="#7dd3fc" strokeOpacity="0.3" strokeWidth="2.5" />

                {/* Meteoro some na atmosfera — não chega à superfície */}
                {/* Trecho fora da atmosfera: sólido */}
                <line x1="224" y1="18" x2="232" y2="26" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.9" strokeLinecap="round" />
                {/* Trecho dentro da atmosfera: desaparece (opacidade decai) */}
                <line x1="232" y1="26" x2="238" y2="32" stroke="#fbbf24" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round" />
                <line x1="238" y1="32" x2="242" y2="36" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.2" strokeLinecap="round" />
                {/* Ponto de extinção — faísca final que some */}
                <circle cx="240" cy="34" r="2.5" fill="#fef08a" opacity="0.5" filter="url(#mc-meteor-glow)" />

                {/* Label "queima" — ao lado do meteoro, sem sobrepor o label de cima */}
                <text x="283" y="27" textAnchor="start" fill="#fbbf24" fontSize="7.5" fontWeight="500" opacity="0.95">{en ? 'burns up' : 'queima'}</text>
                <line x1="281" y1="26" x2="247" y2="36" stroke="#fbbf24" strokeWidth="0.6" strokeOpacity="0.3" strokeDasharray="2 2" />

                <text x="252" y="13" textAnchor="middle" fill="#64748b" fontSize="7.5">{en ? 'Atmosphere shields' : 'Atmosfera protege'}</text>
                <text x="252" y="99" textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="600">{en ? 'Earth' : 'Terra'}</text>
            </svg>
            <VisualLabel>{en ? 'Left: Moon with no atmosphere — every rock hits the surface and leaves a crater. Right: Earth\'s atmosphere burns most objects before they land.' : 'Esquerda: Lua sem atmosfera — toda rocha atinge a superfície e deixa uma cratera. Direita: a atmosfera da Terra queima a maioria antes de chegar ao solo.'}</VisualLabel>
        </Visual>
    );
}

/* ── SVGs das curiosidades de órbita ────────────────────────────────────── */

function EllipseVsCircleDiagram({ en }: { en: boolean }) {
    // Elipse direita: cx=252 cy=82 rx=72 ry=54 → c=√(72²-54²)=√2268≈48
    // Sol em x=252-48=204. Periélio em x=252-72=180. Afélio em x=252+72=324.
    // Distância Sol↔periélio = 24px — visualmente separados mesmo com halo r=14.
    const ECX = 252; const ECY = 82; const ERX = 72; const ERY = 54;
    const EC = 48; // √(ERX²-ERY²) arredondado
    const SUN_E = ECX - EC;  // 204
    const PERI  = ECX - ERX; // 180
    const APH   = ECX + ERX; // 324
    return (
        <Visual>
            <svg viewBox="0 0 340 168" className="w-full" aria-hidden>
                <defs>
                    <radialGradient id="ec-sun-c" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#fef08a" /><stop offset="60%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#92400e" />
                    </radialGradient>
                    <radialGradient id="ec-sun-e" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#fef08a" /><stop offset="60%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#92400e" />
                    </radialGradient>
                    <radialGradient id="ec-ast">
                        <stop offset="0%" stopColor="#e9d5ff" /><stop offset="100%" stopColor="#7c3aed" />
                    </radialGradient>
                    <radialGradient id="ec-sun-halo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </radialGradient>
                    <marker id="ec-arrow-c" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                        <path d="M0,0 L0,5 L5,2.5 z" fill="#94a3b8" opacity="0.6" />
                    </marker>
                    <marker id="ec-arrow-fast" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                        <path d="M0,0 L0,5 L5,2.5 z" fill="#c4b5fd" />
                    </marker>
                    <marker id="ec-arrow-slow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto">
                        <path d="M0,0 L0,5 L5,2.5 z" fill="#a78bfa" opacity="0.7" />
                    </marker>
                </defs>

                {/* Divisor vertical sutil */}
                <line x1="158" y1="14" x2="158" y2="154" stroke="#1e293b" strokeWidth="1" />

                {/* ── ESQUERDA: Órbita circular, cx=76 cy=84 r=50 ── */}
                <text x="76" y="11" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="600">{en ? 'Circular orbit' : 'Órbita circular'}</text>
                <circle cx="76" cy="84" r="50" fill="none" stroke="#475569" strokeWidth="1.5" />
                {/* Sol no centro */}
                <circle cx="76" cy="84" r="16" fill="url(#ec-sun-halo)" />
                <circle cx="76" cy="84" r="6" fill="url(#ec-sun-c)" />
                <text x="76" y="97" textAnchor="middle" fill="#fbbf24" fontSize="7.5" fontWeight="600">{en ? 'Sun' : 'Sol'}</text>
                {/* Três asteroides equidistantes — mesma opacidade para indicar velocidade constante */}
                <circle cx="126" cy="84" r="4" fill="url(#ec-ast)" opacity="0.85" />
                <circle cx="57"  cy="37" r="4" fill="url(#ec-ast)" opacity="0.85" />
                <circle cx="57"  cy="131" r="4" fill="url(#ec-ast)" opacity="0.85" />
                {/* Setas tangentes à órbita, sentido anti-horário */}
                {/* direito (126,84): tangente aponta para cima */}
                <path d="M126 84 L126 74" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.55" markerEnd="url(#ec-arrow-c)" />
                {/* superior-esquerdo (57,37): tangente aponta para direita */}
                <path d="M57 37 L66 34"   stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.55" markerEnd="url(#ec-arrow-c)" />
                {/* inferior-esquerdo (57,131): tangente aponta para esquerda */}
                <path d="M57 131 L48 128" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.55" markerEnd="url(#ec-arrow-c)" />

                {/* ── DIREITA: Órbita elíptica ── */}
                <text x={ECX} y="11" textAnchor="middle" fill="#c4b5fd" fontSize="8" fontWeight="600">{en ? 'Elliptical orbit' : 'Órbita elíptica'}</text>
                <ellipse cx={ECX} cy={ECY} rx={ERX} ry={ERY} fill="none" stroke="#4c3a7a" strokeWidth="1" strokeDasharray="3 3" />
                <ellipse cx={ECX} cy={ECY} rx={ERX} ry={ERY} fill="none" stroke="#a78bfa" strokeWidth="1.5" />

                {/* Sol no foco esquerdo */}
                <circle cx={SUN_E} cy={ECY} r="14" fill="url(#ec-sun-halo)" />
                <circle cx={SUN_E} cy={ECY} r="6"  fill="url(#ec-sun-e)" />
                <text x={SUN_E} y={ECY + 22} textAnchor="middle" fill="#fbbf24" fontSize="7.5" fontWeight="600">{en ? 'Sun' : 'Sol'}</text>

                {/* Asteroide rápido — periélio, label acima com linha-guia clara */}
                <circle cx={PERI} cy={ECY} r="4.5" fill="url(#ec-ast)" opacity="0.95" />
                {/* Seta de velocidade alta acima — mais longa que a do devagar */}
                <path d={`M${PERI} ${ECY - 5} L${PERI} ${ECY - 22}`} stroke="#c4b5fd" strokeWidth="1.5" markerEnd="url(#ec-arrow-fast)" />
                {/* Linha-guia e label acima da seta */}
                <path d={`M${PERI} ${ECY - 24} L${PERI} ${ECY - 38}`} stroke="#c4b5fd" strokeWidth="0.8" strokeOpacity="0.6" strokeDasharray="2 2" />
                <text x={PERI} y={ECY - 42} textAnchor="middle" fill="#c4b5fd" fontSize="8.5">{en ? 'Fast' : 'Rápido'}</text>

                {/* Asteroide lento — afélio, label abaixo da órbita */}
                <circle cx={APH} cy={ECY} r="4" fill="url(#ec-ast)" opacity="0.80" />
                {/* Seta de velocidade baixa — aponta para baixo (anti-horário no afélio) */}
                <path d={`M${APH} ${ECY + 5} L${APH} ${ECY + 18}`} stroke="#a78bfa" strokeWidth="1.5" strokeOpacity="0.8" markerEnd="url(#ec-arrow-slow)" />
                {/* Linha-guia e label abaixo, com espaço generoso */}
                <path d={`M${APH} ${ECY + 20} L${APH} ${ECY + 46}`} stroke="#a78bfa" strokeWidth="0.8" strokeOpacity="0.5" />
                <text x={APH} y={ECY + 58} textAnchor="middle" fill="#c4b5fd" fontSize="8.5">{en ? 'Slow' : 'Devagar'}</text>
            </svg>
            <VisualLabel>{en ? 'Circle vs ellipse: in a circle the Sun sits at the centre and speed is constant. In an ellipse the Sun is off-centre and the asteroid speeds up when close, slows when far.' : 'Círculo vs elipse: no círculo o Sol fica no centro e a velocidade é constante. Na elipse o Sol é deslocado e o asteroide acelera quando perto e desacelera quando longe.'}</VisualLabel>
        </Visual>
    );
}

function EccentricityScaleDiagram({ en }: { en: boolean }) {
    // rx fixo = semi-eixo maior para todas. ry calculado de e: ry = rx·√(1-e²).
    // Terra e=0.017 → ry≈42. Asteroide e=0.4 → ry≈38. Halley e=0.97 → ry≈10.
    // Sol em cx - e·rx (foco correto). Labels alinhados na mesma linha base (CY+56).
    const rx = 42;
    const CY = 74;
    const LABEL_Y = CY + 56; // linha base fixa para todos os labels
    const orbits = [
        { label: en ? 'Earth' : 'Terra',                         e: 0.017, color: '#38bdf8', glow: '#0ea5e9' },
        { label: en ? 'Near-Earth asteroid' : 'Asteroide próximo', e: 0.4,  color: '#a78bfa', glow: '#7c3aed' },
        { label: en ? "Halley's comet" : 'Cometa Halley',          e: 0.97, color: '#67e8f9', glow: '#0891b2' },
    ];
    const cxs = [57, 170, 283];
    return (
        <Visual>
            <svg viewBox="0 0 340 148" className="w-full" aria-hidden>
                <defs>
                    <radialGradient id="ecc-sun-0" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#fef08a" /><stop offset="100%" stopColor="#92400e" /></radialGradient>
                    <radialGradient id="ecc-sun-1" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#fef08a" /><stop offset="100%" stopColor="#92400e" /></radialGradient>
                    <radialGradient id="ecc-sun-2" cx="40%" cy="35%" r="60%"><stop offset="0%" stopColor="#fef08a" /><stop offset="100%" stopColor="#92400e" /></radialGradient>
                    <radialGradient id="ecc-sun-halo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </radialGradient>
                </defs>
                {orbits.map((o, i) => {
                    const cx = cxs[i];
                    const ry = Math.round(rx * Math.sqrt(1 - o.e * o.e));
                    // Sol no foco real; se ficar a menos de 8px da borda, empurra para dentro
                    const focalX = cx - o.e * rx;
                    const minX = cx - rx + 8;
                    const sunX = Math.max(focalX, minX);
                    const topY = CY - ry;
                    return (
                        <g key={o.label}>
                            <text x={cx} y={topY - 10} textAnchor="middle" fill="#94a3b8" fontSize="9" fontWeight="700">e = {o.e}</text>
                            <ellipse cx={cx} cy={CY} rx={rx} ry={ry} fill="none" stroke={o.glow} strokeWidth="3" strokeOpacity="0.12" />
                            <ellipse cx={cx} cy={CY} rx={rx} ry={ry} fill="none" stroke={o.color} strokeWidth="1.5" opacity="0.9" />
                            <circle cx={sunX} cy={CY} r="10" fill="url(#ecc-sun-halo)" />
                            <circle cx={sunX} cy={CY} r="4" fill={`url(#ecc-sun-${i})`} />
                            <text x={cx} y={LABEL_Y} textAnchor="middle" fill={o.color} fontSize="8.5" fontWeight="600">{o.label}</text>
                        </g>
                    );
                })}
            </svg>
            <VisualLabel>{en ? 'Three orbits at the same scale. The more stretched, the further the Sun sits from the centre.' : 'Três órbitas na mesma escala. Quanto mais esticada, mais o Sol se afasta do centro.'}</VisualLabel>
        </Visual>
    );
}

function InclinationDiagram({ en }: { en: boolean }) {
    // Vista lateral: plano da Terra = linha horizontal no centro.
    // Órbita inclinada = elipse atravessando o plano em dois pontos.
    // CX=170 CY=80. Elipse: rx=110 ry=44 inclinada 18° em torno do centro.
    // Interseção com y=CY calculada geometricamente.
    const CX = 160; const CY = 82;
    const rx = 90; const ry = 38;
    const DEG = 18; const RAD = DEG * Math.PI / 180;
    // Nodos: onde a elipse rotacionada cruza y=CY
    // tan(t) = rx·sin(DEG) / (ry·cos(DEG))
    const t1 = Math.atan2(rx * Math.sin(RAD), ry * Math.cos(RAD));
    const pt = (t: number) => ({
        x: CX + rx * Math.cos(t) * Math.cos(-RAD) - ry * Math.sin(t) * Math.sin(-RAD),
        y: CY + rx * Math.cos(t) * Math.sin(-RAD) + ry * Math.sin(t) * Math.cos(-RAD),
    });
    const n1 = pt(t1);         // cruza subindo
    const n2 = pt(t1 + Math.PI); // cruza descendo
    return (
        <Visual>
            <svg viewBox="0 0 340 160" className="w-full" aria-hidden>
                <defs>
                    <radialGradient id="inc-sun" cx="40%" cy="35%" r="60%">
                        <stop offset="0%" stopColor="#fef08a" /><stop offset="60%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#92400e" />
                    </radialGradient>
                    <radialGradient id="inc-sun-halo" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </radialGradient>
                    <filter id="inc-glow-node" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="3.5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* 1. Órbita inclinada */}
                <ellipse cx={CX} cy={CY} rx={rx} ry={ry} fill="none" stroke="#6d28d9" strokeWidth="1" strokeOpacity="0.3"
                    transform={`rotate(-${DEG} ${CX} ${CY})`} />
                <ellipse cx={CX} cy={CY} rx={rx} ry={ry} fill="none" stroke="#a78bfa" strokeWidth="2" strokeOpacity="0.9"
                    transform={`rotate(-${DEG} ${CX} ${CY})`} />

                {/* 2. Plano da Terra */}
                <line x1="14" y1={CY} x2="326" y2={CY} stroke="#334155" strokeWidth="1.2" />

                {/* Label órbita inclinada — acima da elipse, centralizado */}
                <text x={CX} y={CY - ry - 10} textAnchor="middle" fill="#a78bfa" fontSize="8">{en ? 'Tilted Orbit' : 'Órbita Inclinada'}</text>
                <text x="298" y={CY + 14} textAnchor="middle" fill="#475569" fontSize="7.5">{en ? "Earth's Plane" : 'Plano da Terra'}</text>

                {/* 3. Sol — sobre o plano */}
                <circle cx={CX} cy={CY} r="16" fill="url(#inc-sun-halo)" />
                <circle cx={CX} cy={CY} r="7" fill="url(#inc-sun)" />

                {/* 4. Terra — sobre o plano à direita */}
                <circle cx="298" cy={CY} r="5" fill="#38bdf8" opacity="0.9" />
                <text x="298" y={CY - 10} textAnchor="middle" fill="#38bdf8" fontSize="8">{en ? 'Earth' : 'Terra'}</text>

                {/* 5. Ângulo de inclinação */}
                <path d={`M${CX + 22} ${CY} A22 22 0 0 0 ${CX + 22 * Math.cos(RAD)} ${CY - 22 * Math.sin(RAD)}`}
                    fill="none" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.7" />
                <text x={CX + 28} y={CY - 8} fill="#94a3b8" fontSize="8.5" fontWeight="600">{DEG}°</text>

                {/* 6. Nodos — sobre tudo, com glow circular correto */}
                <circle cx={n1.x} cy={n1.y} r="5" fill="#4ade80" filter="url(#inc-glow-node)" />
                <line x1={n1.x} y1={n1.y - 7} x2={n1.x} y2={n1.y - 22} stroke="#4ade80" strokeWidth="1.5" strokeOpacity="0.7" />
                <polygon points={`${n1.x - 4},${n1.y - 20} ${n1.x + 4},${n1.y - 20} ${n1.x},${n1.y - 28}`} fill="#4ade80" opacity="0.85" />

                <circle cx={n2.x} cy={n2.y} r="5" fill="#4ade80" filter="url(#inc-glow-node)" />
                <line x1={n2.x} y1={n2.y + 7} x2={n2.x} y2={n2.y + 22} stroke="#4ade80" strokeWidth="1.5" strokeOpacity="0.7" />
                <polygon points={`${n2.x - 4},${n2.y + 20} ${n2.x + 4},${n2.y + 20} ${n2.x},${n2.y + 28}`} fill="#4ade80" opacity="0.85" />
            </svg>
            <VisualLabel>{en ? "Side view. The purple orbit crosses the flat plane (where Earth travels) at two green points — one going up, one going down." : 'Vista lateral. A órbita roxa cruza o plano plano (onde a Terra viaja) em dois pontos verdes — um subindo, um descendo.'}</VisualLabel>
        </Visual>
    );
}

function OrbitUncertaintyDiagram({ en }: { en: boolean }) {
    return (
        <Visual>
            <svg viewBox="0 0 340 112" className="w-full" aria-hidden>
                <defs>
                    <linearGradient id="unc-cone1" x1="0.5" y1="0" x2="0.5" y2="1">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.5" /><stop offset="100%" stopColor="#a78bfa" stopOpacity="0.04" />
                    </linearGradient>
                    <linearGradient id="unc-cone2" x1="0.5" y1="0" x2="0.5" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.04" />
                    </linearGradient>
                    <linearGradient id="unc-cone3" x1="0.5" y1="0" x2="0.5" y2="1">
                        <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.5" /><stop offset="100%" stopColor="#67e8f9" stopOpacity="0.05" />
                    </linearGradient>
                    <marker id="unc-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                        <path d="M0,0 L0,7 L7,3.5 z" fill="#475569" />
                    </marker>
                    <filter id="unc-glow-obs">
                        <feGaussianBlur stdDeviation="1.5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Cones centrados em x=60,170,280 — distribuídos simetricamente no viewBox 340 */}
                {/* cone1: 60±38=22..98  cone2: 170±22=148..192  cone3: 280±11=269..291 */}
                {/* Seta + label cobrindo os 3 cones */}
                <text x="170" y="10" textAnchor="middle" fill="#475569" fontSize="7.5">{en ? 'More observations →' : 'Mais observações →'}</text>
                <line x1="22" y1="16" x2="318" y2="16" stroke="#334155" strokeWidth="1" markerEnd="url(#unc-arrow)" />

                {/* Labels obs acima dos pontos */}
                {([60, 170, 280] as number[]).map((x, i) => (
                    <g key={x}>
                        <text x={x} y="28" textAnchor="middle" fill="#64748b" fontSize="7.5">{en ? `obs ${i + 1}` : `obs ${i + 1}`}</text>
                        <line x1={x} y1="30" x2={x} y2="36" stroke="#475569" strokeWidth="0.8" strokeOpacity="0.4" />
                    </g>
                ))}

                {/* Cones — largura decresce: cone1=76px, cone2=44px, cone3=22px */}
                <path d="M60 40 L22 100 L98 100 Z"   fill="url(#unc-cone1)" stroke="#a78bfa" strokeWidth="0.8" strokeOpacity="0.4" />
                <path d="M170 40 L148 100 L192 100 Z" fill="url(#unc-cone2)" stroke="#8b5cf6" strokeWidth="0.8" strokeOpacity="0.35" />
                <path d="M280 40 L269 100 L291 100 Z" fill="url(#unc-cone3)" stroke="#67e8f9" strokeWidth="0.8" strokeOpacity="0.5" />

                {/* Pontos de observação */}
                {([60, 170, 280] as number[]).map((x) => (
                    <g key={x}>
                        <circle cx={x} cy="40" r="5" fill="#67e8f9" opacity="0.15" filter="url(#unc-glow-obs)" />
                        <circle cx={x} cy="40" r="3.5" fill="#67e8f9" opacity="0.95" />
                    </g>
                ))}

                {/* Labels dos cones */}
                <text x="60"  y="110" textAnchor="middle" fill="#a78bfa" fontSize="8" fontWeight="500">{en ? 'wide' : 'larga'}</text>
                <text x="280" y="110" textAnchor="middle" fill="#67e8f9" fontSize="8" fontWeight="500">{en ? 'precise' : 'precisa'}</text>
            </svg>
            <VisualLabel>{en ? 'How orbit uncertainty shrinks with more observations: one sighting leaves a wide cone of possible paths; three narrow it to a thin sliver.' : 'Como a incerteza orbital diminui com mais observações: um avistamento deixa um cone largo de caminhos possíveis; três o afunilam até uma faixa fina.'}</VisualLabel>
        </Visual>
    );
}

/* ── Curiosidades do radar — EN ─────────────────────────────────────────── */

export const EN_CURIOSITIES: CuriosityItemData[] = [
    {
        q: 'What does the code in an asteroid\'s name mean?',
        a: <>
            <p>When a new asteroid is spotted, it gets a temporary label right away. The label looks like a code, but each part follows a clear rule.</p>
            <p className="mt-2">The first four characters are the year. The first letter encodes the half-month: <strong className="text-cyan-400">A</strong> is the first half of January, <strong className="text-cyan-400">B</strong> the second half of January, <strong className="text-cyan-400">C</strong> the first half of February, and so on through the alphabet — skipping <strong className="text-cyan-400">I</strong> because it looks too similar to the number 1 in handwritten notes. That gives exactly 24 slots, one for each half-month of the year.</p>
            <p className="mt-2">The second letter shows which asteroid it was within that two-week window, again skipping <strong className="text-cyan-400">I</strong>: <strong className="text-cyan-400">A</strong> is the first, <strong className="text-cyan-400">B</strong> the second, all the way to <strong className="text-cyan-400">Z</strong>, giving 25 letters total. When all 25 are used up, the cycle restarts at <strong className="text-cyan-400">A</strong> and a number is added at the end — <strong className="text-cyan-400">1</strong> for the second round, <strong className="text-cyan-400">2</strong> for the third, and so on. If there is no number, the letters have not wrapped around yet.</p>
            <NamingCodeDiagram en />
            <p>A proper name only comes later, once the orbit is confirmed and the scientific community considers the object notable enough to deserve one.</p>
        </>,
    },
    {
        q: 'Why do some asteroids have real names, like Bennu or Apophis?',
        a: <>
            <p>Once an asteroid has a permanent number, the team that found it can suggest a name to the International Astronomical Union. Most names come from mythology or literature. Bennu is an ancient Egyptian bird god. Apophis is the Egyptian god of chaos. With over a million catalogued objects, only the more famous ones ever get a name.</p>
        </>,
    },
    {
        q: 'What is the difference between an asteroid and a comet?',
        a: <>
            <p>Asteroids and comets are both survivors from the early solar system, drifting through space for billions of years. Asteroids are mainly rock and metal, and most orbit in the Asteroid Belt, a wide ring of rocky debris that sits between Mars and Jupiter. Comets are balls of ice, dust and rock from the outer solar system. When a comet swings close to the Sun, the ice heats up and releases gas, forming the glowing tail you can sometimes see in the sky.</p>
            <AsteroidVsCometDiagram en />
            <p>The line between them can blur: a few objects labelled as asteroids have shown a faint comet-like haze when the Sun warms them.</p>
        </>,
    },
    {
        q: 'What makes an asteroid dangerous?',
        a: <>
            <p>Two things matter most: how big it is, and whether its path crosses Earth's. A rock the size of a house burns up in the atmosphere. One the size of a city could cause serious regional damage. Scientists use a numbered scale called the Torino Scale to communicate the risk level clearly.</p>
            <TorinoScaleDiagram en />
            <SizeDiagram en />
            <p>The ⚠️ objects on this radar are ones NASA watches because their calculated paths show a small, non-zero chance of hitting Earth at some point. More observations almost always bring that chance down to zero.</p>
        </>,
    },
    {
        q: 'Could one of these hit Earth?',
        a: <>
            <p>Every asteroid shown on this radar is a near-Earth asteroid, meaning its orbit passes through the same region of space where Earth travels. But passing through the same region is not the same as being on a collision course. Most will fly past by thousands or millions of kilometres.</p>
            <p className="mt-2">The ones marked ⚠️ are worth paying attention to: scientists track them for years, refining their path with each new observation. In almost every case, the risk eventually drops to zero. And if a real threat were ever confirmed, NASA's 2022 DART mission proved we can nudge an asteroid off course by crashing a spacecraft into it.</p>
        </>,
    },
    {
        q: 'How fast are these things moving?',
        a: <>
            <p>Near-Earth asteroids typically travel at 10 to 30 km per second relative to Earth. The International Space Station orbits at about 7.7 km/s, so even the slower ones are moving faster than that.</p>
            <SpeedDiagram en />
            <p>The arrows show each object's direction of motion, derived from the most recent available data.</p>
        </>,
    },
    {
        q: 'Could one of these hit the Moon?',
        a: <>
            <p>It is possible, but the Moon is a small target. The craters covering its surface are mostly scars from impacts over the past four billion years. The rate has slowed a lot since then.</p>
            <MoonCratersDiagram en />
            <p>Without an atmosphere, nothing slows an incoming rock before it hits. On Earth most small objects burn up on the way down. On the Moon everything arrives at full speed.</p>
        </>,
    },
];

/* ── Curiosidades do radar — PT ─────────────────────────────────────────── */

export const PT_CURIOSITIES: CuriosityItemData[] = [
    {
        q: 'O que significa o código no nome de um asteroide?',
        a: <>
            <p>Quando um asteroide novo é descoberto, ele recebe um rótulo temporário imediatamente. O rótulo parece um código, mas cada parte segue uma regra clara.</p>
            <p className="mt-2">Os quatro primeiros caracteres são o ano. A primeira letra indica a quinzena: <strong className="text-cyan-400">A</strong> é a primeira metade de janeiro, <strong className="text-cyan-400">B</strong> é a segunda metade de janeiro, <strong className="text-cyan-400">C</strong> é a primeira metade de fevereiro, e assim por diante pelo alfabeto, pulando o <strong className="text-cyan-400">I</strong> porque ele se confunde com o número 1 em anotações escritas à mão. Isso dá exatamente 24 posições, uma para cada quinzena do ano.</p>
            <p className="mt-2">A segunda letra mostra qual asteroide foi dentro daquela quinzena, também pulando o <strong className="text-cyan-400">I</strong>: <strong className="text-cyan-400">A</strong> é o primeiro, <strong className="text-cyan-400">B</strong> o segundo, até o <strong className="text-cyan-400">Z</strong>, totalizando 25 letras. Quando as 25 acabam, o ciclo recomeça em <strong className="text-cyan-400">A</strong> e um número é adicionado no final. <strong className="text-cyan-400">1</strong> indica a segunda rodada, <strong className="text-cyan-400">2</strong> a terceira, e assim por diante. Se não há número, as letras ainda não deram a volta.</p>
            <NamingCodeDiagram en={false} />
            <p>Um nome de verdade só vem depois, quando a órbita está bem confirmada e a comunidade científica considera o objeto relevante o suficiente para merecer um.</p>
        </>,
    },
    {
        q: 'Por que alguns asteroides têm nomes próprios, como Bennu ou Apophis?',
        a: <>
            <p>Quando um asteroide recebe um número permanente, a equipe que o encontrou pode sugerir um nome à União Astronômica Internacional. A maioria vem de mitologia ou literatura. Bennu é um deus-pássaro do Egito antigo. Apophis é o deus egípcio do caos. Com mais de um milhão de objetos catalogados, só os mais famosos acabam ganhando nome.</p>
        </>,
    },
    {
        q: 'Qual a diferença entre um asteroide e um cometa?',
        a: <>
            <p>Asteroides e cometas são sobreviventes dos primeiros tempos do sistema solar, à deriva no espaço há bilhões de anos. Asteroides são principalmente rocha e metal, e a maioria orbita no Cinturão de Asteroides, um anel largo de fragmentos rochosos que fica entre Marte e Júpiter. Cometas são bolas de gelo, poeira e rocha que vêm das regiões mais distantes. Quando um cometa se aproxima do Sol, o gelo aquece e libera gás, formando a cauda brilhante que às vezes dá para ver no céu.</p>
            <AsteroidVsCometDiagram en={false} />
            <p>A linha entre eles pode ser tênue: alguns objetos classificados como asteroides já mostraram uma névoa fraca parecida com a de cometas quando o Sol os aquece.</p>
        </>,
    },
    {
        q: 'O que faz um asteroide ser perigoso?',
        a: <>
            <p>Duas coisas importam mais: o tamanho e se o caminho dele cruza o da Terra. Uma rocha do tamanho de uma casa queima na atmosfera. Uma do tamanho de uma cidade pode causar danos sérios numa região inteira. Os cientistas usam uma escala numerada chamada Escala de Torino para comunicar o nível de risco de forma clara.</p>
            <TorinoScaleDiagram en={false} />
            <SizeDiagram en={false} />
            <p>Os objetos marcados com ⚠️ neste radar são monitorados pela NASA porque o caminho calculado deles mostra uma chance pequena, mas não zero, de atingir a Terra em algum momento. Mais observações quase sempre reduzem essa chance a zero.</p>
        </>,
    },
    {
        q: 'Um desses pode atingir a Terra?',
        a: <>
            <p>Todo asteroide mostrado neste radar é um asteroide próximo da Terra, ou seja, a órbita dele passa pela mesma região do espaço onde a Terra viaja. Mas passar pela mesma região não é a mesma coisa que estar em rota de colisão. A maioria vai passar a milhares ou milhões de quilômetros de distância.</p>
            <p className="mt-2">Os marcados com ⚠️ merecem atenção: cientistas os acompanham por anos, refinando o caminho a cada nova observação. Em quase todos os casos, o risco cai a zero com o tempo. E se uma ameaça real fosse confirmada, a missão DART da NASA em 2022 já provou que conseguimos desviar um asteroide jogando uma sonda contra ele.</p>
        </>,
    },
    {
        q: 'Com que velocidade essas coisas se movem?',
        a: <>
            <p>Asteroides próximos à Terra costumam viajar entre 10 e 30 km por segundo em relação à Terra. A Estação Espacial Internacional orbita a cerca de 7,7 km/s, então mesmo os mais lentos vão mais rápido que ela.</p>
            <SpeedDiagram en={false} />
            <p>As setas mostram a direção do movimento de cada objeto, calculada a partir dos dados mais recentes disponíveis.</p>
        </>,
    },
    {
        q: 'Um desses poderia atingir a Lua?',
        a: <>
            <p>É possível, mas a Lua é um alvo pequeno. As crateras que cobrem a sua superfície são cicatrizes de impactos ao longo dos últimos quatro bilhões de anos. O ritmo diminuiu muito desde então.</p>
            <MoonCratersDiagram en={false} />
            <p>Sem atmosfera, nada desacelera a rocha antes de chegar. Na Terra a maioria dos objetos pequenos queima durante a queda. Na Lua tudo chega com força total.</p>
        </>,
    },
];

/* ── Curiosidades de órbita — EN ────────────────────────────────────────── */

export const EN_ORBIT_CURIOSITIES: CuriosityItemData[] = [
    {
        q: 'Why an ellipse?',
        a: <>
            <p>An asteroid does not fall straight into the Sun because it is already moving sideways through space. At the same time, the Sun's gravity bends its path inward. The result is not a straight line but a closed curve around the Sun. When the asteroid swings close, gravity pulls harder, it speeds up, and the curve tightens. When it moves away, it slows down and the curve opens out. That interplay between speed and gravity is what draws the ellipse.</p>
        </>,
    },
    {
        q: 'Why does the asteroid move faster when it is close to the Sun?',
        a: <>
            <p>When the asteroid swings close to the Sun, gravity pulls harder and it picks up speed. On the far side, gravity is weaker and it slows down. Think of a ball rolling down a hill and then climbing back up: it goes fastest at the bottom and slowest at the top. Comets with very stretched orbits can be dozens of times faster at their closest than at their farthest point.</p>
            <EllipseVsCircleDiagram en />
        </>,
    },
    {
        q: 'What does the shape of the orbit tell us?',
        a: <>
            <p>Orbits range from almost circular to very stretched out. A perfectly round orbit means the asteroid always stays the same distance from the Sun and moves at a constant speed. A stretched orbit means it swings between a close, fast pass near the Sun and a long, slow drift far away. The more stretched, the more extreme the difference in speed between the two ends.</p>
            <EccentricityScaleDiagram en />
            <p>Earth's orbit is nearly circular. Many near-Earth asteroids are noticeably stretched. Halley's comet is so elongated that it travels from inside Venus's orbit all the way out beyond Neptune before coming back.</p>
        </>,
    },
    {
        q: 'Why do some orbits look tilted?',
        a: <>
            <p>All the planets orbit roughly in the same flat plane, like rings on a table. Some asteroids travel at an angle to that plane, almost like a spinning top tilted sideways. The more tilted the orbit, the more steeply the asteroid dips above and below that imaginary table.</p>
            <InclinationDiagram en />
            <p>A tilted orbit can still cross Earth's path, but only at two specific points. Earth and the asteroid both have to arrive at the same crossing at the same moment for anything to happen, which is very rare.</p>
        </>,
    },
    {
        q: 'What is the closest point of the orbit, and why does it matter?',
        a: <>
            <p>Every orbit has one point that is closest to the Sun and one that is farthest. The closest point is called perihelion. For an asteroid to ever pass near Earth, that closest point has to fall within the same region where Earth travels, roughly 150 million km from the Sun. Some asteroids spend most of their time far out in the solar system but dip inward twice each orbit, briefly passing through Earth's neighbourhood. Those are the ones worth watching.</p>
        </>,
    },
    {
        q: 'How do scientists figure out an orbit from just a few nights of data?',
        a: <>
            <p>When a new asteroid is spotted, scientists record where it appears in the sky over several nights. Even three well-spaced sightings are enough to sketch a rough path. Gravity does the rest of the maths: there is only one orbit that fits those positions, so the computer finds it.</p>
            <OrbitUncertaintyDiagram en />
            <p>After months or years of tracking, the orbit is known precisely enough to rule out any impact with Earth for decades ahead. The positions you see on this view are derived from that data, refreshed periodically.</p>
        </>,
    },
];

/* ── Curiosidades de órbita — PT ────────────────────────────────────────── */

export const PT_ORBIT_CURIOSITIES: CuriosityItemData[] = [
    {
        q: 'Por que uma elipse?',
        a: <>
            <p>Um asteroide não cai direto no Sol porque já viaja com velocidade própria pelo espaço. Ao mesmo tempo, a gravidade solar puxa sua trajetória para dentro. O resultado não é uma linha reta, mas uma curva fechada ao redor do Sol. Quando passa mais perto do Sol, ele acelera e a curva fica mais apertada. Quando está mais longe, segue mais devagar e o caminho parece mais aberto. Essa combinação entre movimento e gravidade desenha a elipse.</p>
        </>,
    },
    {
        q: 'Por que o asteroide é mais rápido quando está perto do Sol?',
        a: <>
            <p>Quando o asteroide se aproxima do Sol, a gravidade puxa com mais força e ele ganha velocidade. No lado oposto, a gravidade é mais fraca e ele desacelera. Pense numa bola rolando por uma ladeira e subindo do outro lado: ela vai mais rápido na descida e mais devagar na subida. Cometas com órbitas muito esticadas podem ser dezenas de vezes mais rápidos na passagem mais próxima do Sol do que quando estão no ponto mais distante.</p>
            <EllipseVsCircleDiagram en={false} />
        </>,
    },
    {
        q: 'O que a forma da órbita revela?',
        a: <>
            <p>Órbitas vão de quase circulares a muito esticadas. Uma órbita redonda significa que o asteroide mantém sempre a mesma distância do Sol e viaja em velocidade constante. Uma órbita esticada significa que ele alterna entre uma passagem rápida e próxima do Sol e uma deriva lenta e distante. Quanto mais esticada, maior a diferença de velocidade entre os dois extremos.</p>
            <EccentricityScaleDiagram en={false} />
            <p>A órbita da Terra é quase circular. Muitos asteroides próximos da Terra são visivelmente esticados. O cometa Halley é tão alongado que vai de dentro da órbita de Vênus até além de Netuno antes de voltar.</p>
        </>,
    },
    {
        q: 'Por que algumas órbitas parecem inclinadas?',
        a: <>
            <p>Todos os planetas orbitam mais ou menos no mesmo plano plano, como anéis numa mesa. Alguns asteroides viajam em ângulo em relação a esse plano, quase como um pião inclinado. Quanto mais inclinada a órbita, mais o asteroide mergulha acima e abaixo dessa mesa imaginária.</p>
            <InclinationDiagram en={false} />
            <p>Uma órbita inclinada ainda pode cruzar o caminho da Terra, mas só em dois pontos específicos. A Terra e o asteroide precisam chegar ao mesmo ponto de cruzamento ao mesmo tempo para que algo aconteça, o que é muito raro.</p>
        </>,
    },
    {
        q: 'O que é o ponto mais próximo da órbita e por que ele importa?',
        a: <>
            <p>Toda órbita tem um ponto mais próximo do Sol e um mais distante. O ponto mais próximo chama-se periélio. Para que um asteroide passe perto da Terra, esse ponto precisa estar na mesma faixa onde a Terra viaja, cerca de 150 milhões de km do Sol. Alguns asteroides passam a maior parte do tempo longe, no sistema solar externo, mas mergulham para dentro duas vezes por órbita, cruzando brevemente a vizinhança da Terra. Esses são os que valem monitorar.</p>
        </>,
    },
    {
        q: 'Como os cientistas descobrem uma órbita com poucos dias de dados?',
        a: <>
            <p>Quando um novo asteroide é avistado, os cientistas registram onde ele aparece no céu ao longo de várias noites. Mesmo três observações bem espaçadas já são suficientes para traçar um caminho aproximado. A gravidade faz o resto da matemática: só existe uma órbita que passa por aquelas posições, então o computador a encontra.</p>
            <OrbitUncertaintyDiagram en={false} />
            <p>Depois de meses ou anos de acompanhamento, a órbita é conhecida com precisão suficiente para descartar qualquer impacto com a Terra por décadas. As posições que você vê aqui derivam desses dados, renovados periodicamente.</p>
        </>,
    },
];
