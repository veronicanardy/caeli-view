import { KM_PER_AU } from '@/lib/sceneEphemeris';
import { OrbitGuideDiagram, RadarGuideDiagram } from './ManualDiagrams';
import {
    FormulaPanel,
    TechInterpretItem,
    TechLegend,
    TechSection,
} from './ManualParts';
import type { SceneMode } from './manualTypes';

/**
 * Conteúdo técnico do manual.
 *
 * Reúne explicações de pipeline, fórmulas e limitações de cada modo,
 * mantendo o modal desacoplado desse material.
 */
export function TechnicalManual({ mode, locale, lunarDistanceKm }: { mode: SceneMode; locale: 'pt-BR' | 'en'; lunarDistanceKm: number }) {
    const en = locale === 'en';
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
    const auKm = nf.format(KM_PER_AU);
    const ldKm = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(lunarDistanceKm));

    if (mode === 'radar') return <RadarTechnical en={en} ldKm={ldKm} lunarDistanceKm={lunarDistanceKm} locale={locale} auKm={auKm} />;
    return <OrbitTechnical en={en} locale={locale} />;
}

function RadarTechnical({ en, auKm, ldKm, lunarDistanceKm, locale }: { en: boolean; auKm: string; ldKm: string; lunarDistanceKm: number; locale: 'pt-BR' | 'en' }) {
    const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    return (
        <div className="space-y-6">
            <p className="text-sm leading-relaxed text-white/65">
                {en
                    ? 'This section explains the data pipeline, the math, and the visual approximations behind what you see. Switch to the reading guide if you just need to interpret the scene.'
                    : 'Esta seção explica o pipeline de dados, a matemática e as aproximações visuais por trás do que você vê. Mude para o guia de leitura se você só precisa interpretar a cena.'}
            </p>

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
                                text: "Queried for individual object details: physical parameters, full orbital elements, discovery data, and the SPK-ID used to query Horizons. Acts as the identity resolver when an object's Horizons ephemeris needs to be fetched.",
                            },
                            {
                                name: 'JPL Horizons',
                                sub: 'Ephemeris System',
                                text: 'The world reference for solar system body ephemerides. Called per-object to retrieve geocentric state vectors — position (x, y, z) and velocity (vx, vy, vz) in the J2000 equatorial frame — for the 3D scene placement, the motion cone, and the trajectory trail. Results cached up to 15–30 minutes.',
                            },
                            {
                                name: 'astronomy-engine',
                                sub: 'local analytical library · no network call',
                                text: "Computes Sun position (light direction), Moon position and phase, Earth's heliocentric position (orbit view), and the subsolar point that drives the day/night terminator shader. Based on USNO/NOVAS algorithms — high-precision results for the inner solar system with no external API round-trip.",
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
                            <div key={src.name} className="rounded-md border border-white/10 bg-black/15 px-3 py-2.5">
                                <p className="text-[13px] font-semibold text-white/85">
                                    {src.name}{' '}
                                    <span className="font-normal text-white/40">{src.sub}</span>
                                </p>
                                <p className="mt-1 text-[12px] leading-relaxed text-white/60">{src.text}</p>
                            </div>
                        ))}
                    </div>
                    <TechLegend
                        en={en}
                        items={en
                            ? [
                                { kind: 'observed', label: 'From NeoWs + CAD: approach list, distances, velocities, hazard flag' },
                                { kind: 'observed', label: 'From SBDB: physical parameters, orbital elements, SPK-ID' },
                                { kind: 'observed', label: 'From Horizons: asteroid position r, velocity v (per-object, for the 3D scene)' },
                                { kind: 'calculated', label: 'Locally: Sun/Moon/Earth positions, subsolar point, distance units, log compression, cone direction, trail' },
                                { kind: 'visual', label: 'Visual choice: body radii amplified ~10,000-100,000x; trail window -72 h / now' },
                            ]
                            : [
                                { kind: 'observed', label: 'NeoWs + CAD: lista de aproximações, distâncias, velocidades, flag de perigo' },
                                { kind: 'observed', label: 'SBDB: parâmetros físicos, elementos orbitais, SPK-ID' },
                                { kind: 'observed', label: 'Horizons: posição r e velocidade v do asteroide (por objeto, para a cena 3D)' },
                                { kind: 'calculated', label: 'Localmente: posições do Sol/Lua/Terra, ponto subsolar, unidades de distância, compressão log, direção do cone, trilha' },
                                { kind: 'visual', label: 'Escolha visual: raios dos corpos amplificados ~10.000-100.000x; janela da trilha -72 h / agora' },
                            ]}
                    />
                </div>
            </TechSection>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-5">
                    <RadarGuideDiagram locale={locale} technical />

                    <TechSection title={en ? '2. Coordinate frame and axis mapping' : '2. Referencial de coordenadas e mapeamento de eixos'}>
                        <p className="text-sm leading-relaxed text-white/70">
                            {en
                                ? `JPL Horizons delivers vectors in the geocentric J2000 equatorial frame. "J2000" is the standard epoch: Earth's mean equatorial plane at noon TDB on 1 Jan 2000. "Geocentric" means Earth is at the origin — all coordinates measure each object's position relative to Earth's centre.`
                                : 'O JPL Horizons entrega vetores no referencial equatorial geocêntrico J2000. "J2000" é o epoch padrão: o plano equatorial médio da Terra ao meio-dia TDB em 1 jan 2000. "Geocêntrico" significa que a Terra está na origem — todas as coordenadas medem a posição de cada objeto em relação ao centro da Terra.'}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'Sun and Moon vectors from astronomy-engine are also in J2000 equatorial, then rotated to the J2000 ecliptic frame (where Z points to the ecliptic north pole). All geocentric vectors — asteroids, Moon, Sun — then go through the same axis remap before placement in the Three.js scene:'
                                : 'Os vetores do Sol e da Lua calculados pelo astronomy-engine também estão em J2000 equatorial, depois rotacionados para o referencial eclíptico J2000 (onde Z aponta para o polo norte eclíptico). Todos os vetores geocêntricos — asteroides, Lua, Sol — passam pelo mesmo remapeamento de eixos antes de serem posicionados na cena Three.js:'}
                        </p>
                        <div className="mt-2 rounded-md border border-signal-cyan/15 bg-signal-cyan/[0.055] px-3 py-2.5 font-mono text-[12px] leading-relaxed text-cyan-100/90">
                            <div>{en ? 'scene(x, y, z) = (ecl.x, ecl.z, −ecl.y)   ← asteroid / Moon / Sun' : 'cena(x, y, z) = (ecl.x, ecl.z, −ecl.y)   ← asteroide / Lua / Sol'}</div>
                        </div>
                        <p className="mt-2 text-[13px] leading-relaxed text-white/60">
                            {en
                                ? "The ecliptic frame has Z pointing up (north pole). Three.js uses Y-up. Swapping ecliptic Z→scene Y and negating ecliptic Y→scene Z preserves handedness and maps the ecliptic plane onto the horizontal plane of the scene — so the Earth's orbital plane lies flat on screen when viewed from above."
                                : 'O referencial eclíptico tem Z apontando para cima (polo norte). O Three.js usa Y-up. Trocar eclíptico Z→cena Y e negar eclíptico Y→cena Z preserva a orientação (handedness) e mapeia o plano eclíptico para o plano horizontal da cena — assim o plano orbital da Terra fica horizontal na tela quando visto de cima.'}
                        </p>
                    </TechSection>

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
                            : 'R₀ = 8 DL é o pivô de compressão: define onde a curva logarítmica transita de quase linear (objetos muito mais próximos que R₀) para fortemente comprimida (objetos muito mais distantes). Em 8 DL a Lua fica bem dentro da região linear, preservando sua posição visual, enquanto objetos a 50–200 DL — que estariam fora da tela numa escala linear — são trazidos para dentro da cena. K é derivado de R₀ pela restrição f(1) = 1, forçando a Lua a sempre cair em exatamente 1 unidade de cena independentemente da sua distância real no dia. r̂ é calculado antes e reaplicado depois, então direção e forma das trajetórias nunca são distorcidas. Os números na interface são sempre os valores originais, sem compressão.'}
                    />

                    <FormulaPanel
                        title={en ? '4b. Linear AU scale — planets and their orbits' : '4b. Escala linear em UA — planetas e suas órbitas'}
                        formulas={[
                            'ORBIT_AU_SCALE = f(1 AU in DL)   (same K·ln constant)',
                            en ? 'planet_scene = (ecl.x, 0, −ecl.y) · ORBIT_AU_SCALE' : 'planeta_cena = (ecl.x, 0, −ecl.y) · ORBIT_AU_SCALE',
                            en ? 'planet position ← astronomy-engine HelioState()' : 'posição do planeta ← astronomy-engine HelioState()',
                            en ? 'orbit ellipse ← same scale, lonPerihelion from ephemeris' : 'elipse orbital ← mesma escala, lonPeriélio da efeméride',
                        ]}
                        note={en
                            ? "Planets (Mercury through Neptune) live in a separate heliocentric layer with a strictly linear scale — 1 AU maps to the same fixed number of scene units everywhere. The ecliptic z component is dropped (y = 0 in scene), so all planetary orbits are projected onto the ecliptic plane. Planet positions come from astronomy-engine's HelioState(), which returns real heliocentric position and velocity. The perihelion longitude orienting each orbit ellipse is derived from those live vectors — not from a fixed table — so the ellipse always passes exactly through the planet's projected position."
                            : 'Os planetas (de Mercúrio a Netuno) vivem numa camada heliocêntrica separada com escala estritamente linear — 1 UA mapeia para o mesmo número fixo de unidades de cena em todo lugar. A componente z eclíptica é descartada (y = 0 na cena), então todas as órbitas planetárias são projetadas no plano eclíptico. As posições dos planetas vêm do HelioState() do astronomy-engine, que retorna posição e velocidade heliocêntricas reais. A longitude do periélio que orienta cada elipse orbital é derivada desses vetores ao vivo — não de uma tabela fixa — então a elipse sempre passa exatamente pela posição projetada do planeta.'}
                    />

                    <FormulaPanel
                        title={en ? '6. Motion cone and trajectory trail' : '6. Cone de movimento e trilha de trajetória'}
                        formulas={[
                            'û = v / ‖v‖              (unit velocity vector)',
                            en ? 'cone direction ← û  (physically real)' : 'direção do cone ← û  (fisicamente real)',
                            en ? 'trail ← Horizons ephemeris, −24 h to +72 h, 1 h steps' : 'trilha ← efeméride Horizons, −24 h a +72 h, passo 1 h',
                            en ? 'trail_scene = same f() compression per point' : 'trilha_cena = mesma compressão f() por ponto',
                        ]}
                        note={en
                            ? 'The cone points in the true geocentric velocity direction — if it aims toward Earth the object is approaching. The trail is sampled from the Horizons ephemeris over a window of −24 h to +72 h around the current moment (1-hour steps), with the same log compression applied to each point. It shows the qualitative path shape, not a quantitative prediction: the dashed segment ahead of the object represents the next 72 hours, not a long-range forecast.'
                            : 'O cone aponta na direção real da velocidade geocêntrica — se aponta para a Terra o objeto está se aproximando. A trilha é amostrada da efeméride Horizons numa janela de −24 h a +72 h em torno do momento atual (passos de 1 hora), com a mesma compressão logarítmica aplicada a cada ponto. Mostra a forma qualitativa do caminho, não uma previsão quantitativa: o segmento tracejado adiante do objeto representa as próximas 72 horas, não uma projeção de longo prazo.'}
                    />

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
                            ? "A sharply curved trail indicates strong geocentric acceleration — a close flyby in progress. A nearly straight trail means the object is far enough that Earth's gravity barely bends its path."
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
                                    <td className="py-2 pr-4 align-top font-medium text-white/75">{aspect}</td>
                                    <td className="py-2 leading-relaxed text-white/60">{situation}</td>
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

            <TechSection title={en ? '1. Why a separate heliocentric view?' : '1. Por que uma vista heliocêntrica separada?'}>
                <p className="text-sm leading-relaxed text-white/70">
                    {en
                        ? 'The radar uses logarithmic compression calibrated for the Earth neighbourhood (LD scale). The orbit view uses a linear AU scale calibrated for the solar system. Mixing them would mean the same ruler represents different physical distances depending on mode — guaranteed misreading.'
                        : 'O radar usa compressão logarítmica calibrada para a vizinhança da Terra (escala DL). A vista de órbita usa escala linear em UA calibrada para o sistema solar. Misturá-las significaria que a mesma régua representa distâncias físicas diferentes dependendo do modo — leitura errada garantida.'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {en
                        ? `Keeping them strictly separated means each view has one consistent scale. The radar answers "how close is it right now?" The orbit view answers "what path does gravity keep it on — and does that path ever cross Earth's?"`
                        : 'Mantê-las estritamente separadas significa que cada vista tem uma escala consistente. O radar responde "quão perto está agora?" A vista de órbita responde "em que caminho a gravidade o mantém — e esse caminho cruza alguma vez o da Terra?"'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                    {en
                        ? "The orbit scale is linear and shape-exact: the ellipse eccentricity, perihelion distance, and inclination are all faithful. Earth is placed from its real heliocentric ephemeris (astronomy-engine), so the Sun direction and Earth–asteroid geometry are physically correct."
                        : 'A escala de órbita é linear e fiel em forma: a excentricidade da elipse, a distância do periélio e a inclinação são todas exatas. A Terra é posicionada pela sua efeméride heliocêntrica real (astronomy-engine), então a direção do Sol e a geometria Terra-asteroide são fisicamente corretas.'}
                </p>
            </TechSection>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-5">
                    <OrbitGuideDiagram locale={locale} technical />

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
                                ? "The orbital elements (q, e, i, Ω, ω, Tₚ) are fetched from JPL Horizons per object and cached for up to 6 hours — distinct from the radar's position cache (15 min). This means the drawn ellipse shape is stable across a session and changes only when the backend refreshes the SBDB solution. The asteroid's dot position on the ellipse is always computed locally from the current Julian Date, so it moves in real time without a new network call."
                                : 'Os elementos orbitais (q, e, i, Ω, ω, Tₚ) são buscados no JPL Horizons por objeto e cacheados por até 6 horas — distinto do cache de posição do radar (15 min). Isso significa que a forma da elipse desenhada é estável ao longo de uma sessão e muda apenas quando o backend renova a solução do SBDB. A posição do ponto do asteroide na elipse é sempre calculada localmente a partir da Data Juliana atual, então ele avança em tempo real sem uma nova chamada de rede.'}
                        </p>
                    </TechSection>
                </div>

                <div className="space-y-4">
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
                            ? "Six numbers uniquely define a conic section in 3D space. q and e set the ellipse shape and size. i, Ω, ω orient the orbital plane in the J2000 ecliptic frame via three sequential Euler rotations. Tₚ anchors the body's position in time along the ellipse."
                            : 'Seis números definem unicamente uma seção cônica no espaço 3D. q e e definem a forma e o tamanho da elipse. i, Ω, ω orientam o plano orbital no referencial eclíptico J2000 via três rotações de Euler sequenciais. Tₚ ancora a posição do corpo no tempo ao longo da elipse.'}
                    />

                    <FormulaPanel
                        title={en ? '3. Kepler propagation — position on the ellipse' : '3. Propagação Kepleriana — posição na elipse'}
                        formulas={[
                            'a  = q / (1 − e)           (semi-major axis [AU])',
                            'k  = 0.01720209895         (Gaussian grav. const.)',
                            'n  = k / a^(3/2)           (mean motion [rad/day])',
                            'M  = n · (JD_now − Tₚ)    (mean anomaly)',
                            "E − e·sin(E) = M           (Kepler's equation → E)",
                        ]}
                        note={en
                            ? "M grows linearly with time — it's a fictitious angle that would mark the position if the body moved at constant speed. E is the eccentric anomaly, the real angular position on the ellipse. The Gaussian constant k is √(GM☉) in AU–day units, a centuries-old convention that avoids SI unit conversion in orbit calculations. Kepler's equation has no closed-form solution; it's solved by Newton's method, converging in 3–5 iterations for typical eccentricities."
                            : 'M cresce linearmente com o tempo — é um ângulo fictício que marcaria a posição se o corpo se movesse em velocidade constante. E é a anomalia excêntrica, a posição angular real na elipse. A constante gaussiana k é √(GM☉) em unidades UA–dia, convenção secular que evita conversão de unidades SI em cálculos orbitais. A equação de Kepler não tem solução analítica; é resolvida pelo método de Newton, convergindo em 3–5 iterações para excentricidades típicas.'}
                    />

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
                            ? "The result is the body's heliocentric position in J2000 ecliptic coordinates after orienting the ellipse in 3D space."
                            : 'O resultado é a posição heliocêntrica do corpo em coordenadas eclípticas J2000 depois de orientar a elipse no espaço 3D.'}
                    />

                    <FormulaPanel
                        title={en ? '5. Mapping to the 3D scene' : '5. Mapeamento para a cena 3D'}
                        formulas={[
                            '1 AU = ORBIT_AU_SCALE scene units   (linear, no log)',
                            en ? 'asteroid scene(x,y,z) = (x_ecl, z_ecl, y_ecl) · scale' : 'asteroide cena(x,y,z) = (x_ecl, z_ecl, y_ecl) · scale',
                            en ? 'planet  scene(x,y,z) = (x_ecl,    0, −y_ecl) · scale' : 'planeta  cena(x,y,z) = (x_ecl,    0, −y_ecl) · scale',
                            en ? 'Earth, Sun, planets ← astronomy-engine (heliocentric)' : 'Terra, Sol, planetas ← astronomy-engine (heliocêntrico)',
                        ]}
                        note={en
                            ? 'Two axis conventions coexist in the same scene. The asteroid orbit uses a full 3D ecliptic mapping (y↔z swap) so inclination is preserved — steeply tilted orbits rise above/below the screen plane. The planet layer projects onto the ecliptic plane (y = 0 always), which is accurate because planetary inclinations are small (< 7°) and the visual difference is sub-pixel. The scale is strictly linear for both: the drawn ellipse has the exact eccentricity and perihelion of the real orbit.'
                            : 'Duas convenções de eixos coexistem na mesma cena. A órbita do asteroide usa mapeamento eclíptico 3D completo (troca y↔z) para que a inclinação seja preservada — órbitas muito inclinadas sobem acima ou abaixo do plano da tela. A camada dos planetas é projetada no plano eclíptico (y = 0 sempre), o que é preciso porque as inclinações planetárias são pequenas (< 7°) e a diferença visual é sub-pixel. A escala é estritamente linear para ambos: a elipse desenhada tem a excentricidade e o periélio exatos da órbita real.'}
                    />
                </div>
            </div>

            <TechSection title={en ? '6. How to interpret the orbit view technically' : '6. Como interpretar a vista de órbita com olhos técnicos'}>
                <div className="grid gap-3 sm:grid-cols-2">
                    <TechInterpretItem
                        label={en ? 'Ellipse shape = eccentricity' : 'Forma da elipse = excentricidade'}
                        text={en
                            ? 'A nearly circular ellipse means e ≈ 0 — the object keeps a nearly constant distance from the Sun. A stretched ellipse (high e) means a large speed difference between perihelion and aphelion, and more time spent in the outer part of the orbit.'
                            : 'Uma elipse quase circular significa e ≈ 0 — o objeto mantém distância quase constante do Sol. Uma elipse esticada (e alto) significa grande diferença de velocidade entre periélio e afélio, e mais tempo passado na parte externa da órbita.'}
                    />
                    <TechInterpretItem
                        label={en ? "Sun off-centre = Kepler's first law" : 'Sol fora do centro = 1ª lei de Kepler'}
                        text={en
                            ? "The Sun sits at one focus of the ellipse, not its geometric centre. This is Kepler's first law. The empty second focus has no physical body — it's a mathematical feature of the ellipse. The asymmetry is why the asteroid moves faster when close to the Sun (Kepler's second law)."
                            : 'O Sol fica em um foco da elipse, não no seu centro geométrico. Esta é a 1ª lei de Kepler. O segundo foco vazio não tem corpo físico — é uma característica matemática da elipse. A assimetria explica por que o asteroide se move mais rápido quando está perto do Sol (2ª lei de Kepler).'}
                    />
                    <TechInterpretItem
                        label={en ? 'Tilt = orbital inclination (i)' : 'Inclinação = inclinação orbital (i)'}
                        text={en
                            ? "Rotating to the side view reveals the orbital inclination. An orbit lying flat on the screen has i ≈ 0° (nearly coplanar with Earth's orbit). An orbit that rises sharply above or below the ecliptic plane has high i — it only crosses Earth's orbital zone at two specific nodes, making a close approach geometrically less likely."
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
                            ? "⬡ Earth's rendered radius is amplified for visibility. Earth's orbital position is accurate; its visual size is not."
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
