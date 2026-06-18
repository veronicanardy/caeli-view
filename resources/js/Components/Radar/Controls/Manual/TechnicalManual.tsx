/**
 * Manual técnico do radar orbital.
 *
 * Responsabilidade: apresentar o pipeline completo de dados — desde a API JPL
 * até a renderização 3D — com fórmulas, limiares e decisões de implementação.
 * Destinado a usuários avançados e desenvolvedores. Conteúdo estático.
 */

import { Info } from 'lucide-react';
import { KM_PER_AU } from '@/lib/sceneEphemeris';
import { transparencyCopy } from '@/lib/transparencyCopy';
import { OrbitGuideDiagram, RadarGuideDiagram } from './ManualDiagrams';
import {
    FormulaPanel,
    TechGroup,
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

    return (
        <div className="space-y-6">
            {mode === 'radar'
                ? <RadarTechnical en={en} ldKm={ldKm} locale={locale} auKm={auKm} />
                : <OrbitTechnical en={en} locale={locale} />}
            <TransparencyNote locale={locale} />
        </div>
    );
}

/**
 * Nota de transparência (afiliação, fontes e limites). Antes vivia no rodapé global; no radar a
 * tela ocupa a viewport inteira sem scroll, então a transparência passou a viver aqui dentro do
 * guia, na aba de dados e métodos. Usa o copy compartilhado em `@/lib/transparencyCopy`.
 */
function TransparencyNote({ locale }: { locale: 'pt-BR' | 'en' }) {
    const copy = transparencyCopy(locale);
    return (
        <section className="border-t border-white/[0.08] pt-5">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-signal-cyan/55">
                <Info className="size-3" aria-hidden="true" />
                {copy.label}
            </p>
            <h3 className="mt-2 text-[13px] font-medium tracking-tight text-white/70">{copy.title}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-white/40">{copy.subtitle}</p>
            <div className="mt-3 space-y-2">
                {copy.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-[12px] leading-6 text-white/35">{paragraph}</p>
                ))}
            </div>
        </section>
    );
}

function RadarTechnical({ en, auKm, ldKm, locale }: { en: boolean; auKm: string; ldKm: string; locale: 'pt-BR' | 'en' }) {
    return (
        <div className="space-y-6">
            <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    {en ? 'Optional deep-dive' : 'Aprofundamento opcional'}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                    {en
                        ? 'Where the data comes from, how the calculations work, and which visual choices were made. Not required to use the radar. Switch to the reading guide if you just want to interpret the scene.'
                        : 'De onde vêm os dados, como os cálculos funcionam e quais escolhas visuais foram feitas. Não é necessário para usar o radar. Mude para o guia de leitura se quiser apenas interpretar a cena.'}
                </p>
            </div>

            {/* ── Diagrama full-width ────────────────────────────────── */}
            <RadarGuideDiagram locale={locale} technical />

            {/* ── Contexto em três colunas ─────────────────────────── */}
            <div className="grid gap-5 lg:grid-cols-3">
                <TechSection prose title={en ? '1. Coordinate frame and axis mapping' : '1. Referencial de coordenadas e mapeamento de eixos'}>
                    <p className="text-sm leading-relaxed text-white/70">
                        {en
                            ? 'Horizons delivers geocentric J2000 equatorial vectors. All bodies (asteroids, Moon, Sun) are rotated to J2000 ecliptic, then remapped to the Three.js scene so the ecliptic plane lies flat on screen when viewed from above:'
                            : 'O Horizons entrega vetores geocêntricos no referencial J2000 equatorial. Todos os corpos (asteroides, Lua, Sol) são rotacionados para o eclíptico J2000 e então remapeados para a cena Three.js, de forma que o plano eclíptico fique horizontal na tela quando visto de cima:'}
                    </p>
                    <div className="mt-2 rounded-md border border-signal-cyan/15 bg-signal-cyan/[0.055] px-3 py-2">
                        <span className="font-mono text-[13px] font-medium text-cyan-100">
                            {en ? 'scene(x,y,z) = (ecl.x, ecl.z, −ecl.y)' : 'cena(x,y,z) = (ecl.x, ecl.z, −ecl.y)'}
                        </span>
                        <span className="ml-2 text-[11px] text-white/40">{en ? 'asteroid / Moon / Sun' : 'asteroide / Lua / Sol'}</span>
                    </div>
                </TechSection>

                <TechSection prose title={en ? '2. Earth illumination and terminator' : '2. Iluminação da Terra e terminador'}>
                    <p className="text-sm leading-relaxed text-white/70">
                        {en
                            ? "The day/night boundary is computed from the subsolar point via astronomy-engine + Greenwich Apparent Sidereal Time (GAST). Earth's axial tilt is embedded in the Sun's declination, so the terminator shifts correctly across seasons. Visual approximation on a sphere; atmospheric refraction and polar flattening not modelled."
                            : 'A fronteira dia/noite é calculada a partir do ponto subsolar via astronomy-engine + Tempo Sideral Aparente de Greenwich (GAST). A inclinação axial da Terra está embutida na declinação solar, então o terminador muda corretamente entre estações. Aproximação visual sobre uma esfera; refração atmosférica e achatamento polar não modelados.'}
                    </p>
                </TechSection>

                <TechSection prose title={en ? '3. 3D body models and data freshness' : '3. Modelos 3D e atualização dos dados'}>
                    <p className="text-sm leading-relaxed text-white/70">
                        {en
                            ? 'Published NASA shape models for Bennu, Ceres, Eros, Itokawa, and Vesta. All others: representative rock meshes. Bodies are rendered at a fixed scene scale — a real 200 m asteroid would be sub-pixel at scene scale. Distances in the data panel are always the original uncompressed values. Positions cached up to 15 min; trajectories up to 30 min. If Horizons returns no data, the object is absent with no local fallback.'
                            : 'Modelos de forma publicados pela NASA para Bennu, Ceres, Eros, Itokawa e Vesta. Demais: malhas representativas. Os corpos são renderizados numa escala fixa de cena — um asteroide real de 200 m seria sub-pixel na escala da cena. As distâncias no painel de dados são sempre os valores originais sem compressão. Posições cacheadas até 15 min; trajetórias até 30 min. Se o Horizons não retornar dados, o objeto não aparece.'}
                    </p>
                </TechSection>
            </div>

            {/* ── Fórmulas em grade 2×2 ─────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2">
                <FormulaPanel
                    en={en}
                    title={en ? '4. Geocentric state vectors → distance units' : '4. Vetores de estado geocêntricos → unidades de distância'}
                    formulas={[
                        { expr: 'r = (x, y, z)', comment: { en: 'km, J2000 geocentric — JPL Horizons', pt: 'km, geocêntrico J2000 — JPL Horizons' } },
                        { expr: 'v = (vx, vy, vz)', comment: { en: 'km/s — JPL Horizons', pt: 'km/s — JPL Horizons' } },
                        { expr: 'd_km = ‖r‖', comment: { en: 'Euclidean distance', pt: 'distância euclidiana' } },
                        { expr: `d_DL = d_km / ${ldKm}`, comment: { en: "today's Moon distance", pt: 'distância lunar de hoje' } },
                        { expr: `d_AU = d_km / ${auKm}` },
                    ]}
                    note={en
                        ? "All three distance units (km, LD, AU) derive from the same Euclidean norm of r — consistent by construction. The Lunar Distance denominator is recalculated each session from astronomy-engine's real Moon position, so '1 LD' reflects today's actual Earth–Moon distance (perigee ≈ 356 500 km, apogee ≈ 406 700 km)."
                        : 'As três unidades de distância (km, DL, UA) derivam da mesma norma euclidiana de r — consistentes por construção. O denominador da Distância Lunar é recalculado a cada sessão pela posição real da Lua via astronomy-engine, então "1 DL" reflete a distância Terra-Lua real do dia (perigeu ≈ 356.500 km, apogeu ≈ 406.700 km).'}
                />

                <FormulaPanel
                    en={en}
                    title={en ? '5. Single linear AU scale — asteroids and Moon' : '5. Escala linear única em UA — asteroides e Lua'}
                    formulas={[
                        { expr: 'p_helio = p_earth + r_geo / AU', comment: { en: 'asteroid heliocentric position [AU]', pt: 'posição heliocêntrica do asteroide [UA]' } },
                        { expr: 'p_scene = (x, z, −y) · LINEAR_AU_SCALE', comment: { en: 'linear scale, no compression', pt: 'escala linear, sem compressão' } },
                        { expr: 'moon_scene = d_DL · (LD / AU) · LINEAR_AU_SCALE', comment: { en: 'Moon on the same ruler', pt: 'Lua na mesma régua' } },
                        { expr: 'closeness ← camera zoom', comment: { en: 'not a distorted scale', pt: 'não uma escala distorcida' } },
                    ]}
                    note={en
                        ? 'Everything in the scene shares ONE strictly linear scale in AU: asteroids, Moon, planets and the Sun are placed at their true relative distances, with no compression. Because the scale is honest, a close approach is genuinely tiny next to the Earth-Sun gap, so the camera zooms toward Earth to reveal it. Closeness is shown by moving the camera, never by stretching the ruler. Direction, inclination and trail shape are exact. The numbers in the data panel are the real distances.'
                        : 'Tudo na cena compartilha UMA escala estritamente linear em UA: asteroides, Lua, planetas e o Sol ficam nas suas distâncias relativas reais, sem compressão. Como a escala é honesta, uma aproximação é de fato minúscula perto do vão Terra-Sol, então a câmera dá zoom na Terra para revelá-la. A proximidade é mostrada movendo a câmera, nunca esticando a régua. Direção, inclinação e forma da trilha são exatas. Os números no painel de dados são as distâncias reais.'}
                />

                <FormulaPanel
                    en={en}
                    title={en ? '5b. Planets and their drawn orbits' : '5b. Planetas e suas órbitas desenhadas'}
                    formulas={[
                        { expr: 'planet_scene = (ecl.x, ecl.z, −ecl.y) · LINEAR_AU_SCALE', comment: { en: 'same ruler as the asteroids', pt: 'mesma régua dos asteroides' } },
                        { expr: 'position ← astronomy-engine HelioState()', comment: { en: 'real heliocentric vector', pt: 'vetor heliocêntrico real' } },
                        { expr: 'orbit ellipse ← perifocal(a, e, i, Ω, ω)', comment: { en: 'same source as position', pt: 'mesma fonte da posição' } },
                    ]}
                    note={en
                        ? 'Planets ride the SAME single linear scale as the asteroids and the Moon, so distances stay comparable across the whole scene. The full 3D ecliptic mapping (x, z, −y) preserves orbital inclination, and position and orbit ellipse come from the SAME geometry source (perifocal rotation from live osculating elements), so each planet always lands on its drawn line.'
                        : 'Os planetas usam a MESMA escala linear única dos asteroides e da Lua, então as distâncias permanecem comparáveis em toda a cena. O mapeamento eclíptico 3D completo (x, z, −y) preserva a inclinação orbital, e a posição e a elipse vêm da MESMA fonte de geometria (rotação perifocal dos elementos osculadores ao vivo), então cada planeta sempre cai sobre a linha desenhada.'}
                />

                <FormulaPanel
                    en={en}
                    title={en ? '6. Motion cone and trajectory trail' : '6. Cone de movimento e trilha de trajetória'}
                    formulas={[
                        { expr: 'û = v / ‖v‖', comment: { en: 'unit velocity vector', pt: 'vetor velocidade unitário' } },
                        { expr: en ? 'cone direction ← û' : 'direção do cone ← û', comment: { en: 'physically real direction', pt: 'direção fisicamente real' } },
                        { expr: en ? 'trail ← Horizons, −72 h to now' : 'trilha ← Horizons, −72 h até agora', comment: { en: 'adaptive step', pt: 'passo adaptativo' } },
                        { expr: en ? 'step: 1 h · 2 h · 4 h' : 'passo: 1 h · 2 h · 4 h', comment: { en: '< 50M km · < 500M km · farther', pt: '< 50M km · < 500M km · mais distante' } },
                        { expr: en ? 'trail_scene = linear AU per point' : 'trilha_cena = UA linear por ponto', comment: { en: 'same single scale', pt: 'mesma escala única' } },
                    ]}
                    note={en
                        ? 'The cone points in the true geocentric velocity direction. The trail covers the past 72 hours of ephemeris, ending at the current moment, mapped through the same single linear scale as the rest of the scene. Step resolution adapts to distance: 1 h for close flybys, coarser for distant objects.'
                        : 'O cone aponta na direção real da velocidade geocêntrica. A trilha cobre as últimas 72 horas de efeméride, terminando no momento atual, mapeada pela mesma escala linear única do resto da cena. A resolução do passo é adaptativa: 1 h para passagens próximas, maior para objetos distantes.'}
                />
            </div>

            <TechGroup title={en ? '7. How to interpret the radar technically' : '7. Como interpretar o radar com olhos técnicos'}>
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
                            ? 'The scene uses a linear scale, so visual distance is faithful to the real distance between bodies (body sizes are amplified separately, for legibility). What still shifts the look is perspective projection (objects nearer the camera appear larger) and the camera zoom used to reveal a close approach. The data panel always shows the real distance.'
                            : 'A cena usa escala linear, então a distância visual é fiel à distância real entre os corpos (os tamanhos dos corpos são ampliados à parte, para legibilidade). O que ainda muda a aparência é a projeção em perspectiva (objetos mais próximos da câmera parecem maiores) e o zoom de câmera usado para revelar uma aproximação. O painel de dados sempre mostra a distância real.'}
                    />
                </div>
            </TechGroup>

            <TechGroup title={en ? '8. Limitations' : '8. Limitações'}>
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
                                ['Visual scale', 'Single linear AU scale, true to real distances. Direction and inclination faithfully preserved; a close approach is revealed by camera zoom, not by stretching the scale.'],
                                ['Body size', 'Visual only. Amplified for legibility (a real asteroid would be sub-pixel).'],
                                ['Earth illumination', 'Spherical model. Atmospheric refraction and polar flattening not modelled.'],
                                ['Trail', 'Past 72 hours of ephemeris, ending at now. No future segment. Step resolution adapts to distance (1 h / 2 h / 4 h).'],
                                ['Data freshness', 'Positions cached up to 15 min; trajectories up to 30 min.'],
                                ['Missing object', 'If Horizons returns no data, the object is absent — no local fallback.'],
                            ] : [
                                ['Precisão posicional', 'Alta para objetos com arco observacional longo (meses–anos). Menor para descobertas recentes (dias de dados) — a solução pode mudar com mais observações.'],
                                ['Modelo orbital', 'Kepleriano de dois corpos. Perturbações planetárias estão embutidas nos vetores de estado do Horizons na época da consulta, mas não são reintegradas localmente.'],
                                ['Escala visual', 'Escala linear única em UA, fiel às distâncias reais. Direção e inclinação preservadas fielmente; uma aproximação é revelada por zoom de câmera, não esticando a escala.'],
                                ['Tamanho dos corpos', 'Visual apenas. Amplificado para legibilidade (um asteroide real seria sub-pixel).'],
                                ['Iluminação da Terra', 'Modelo esférico. Refração atmosférica e achatamento polar não modelados.'],
                                ['Trilha', 'Últimas 72 horas de efeméride, terminando agora. Sem trecho futuro. Passo adaptativo por distância (1 h / 2 h / 4 h).'],
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
            </TechGroup>

            <TechSection title={en ? '9. Data sources' : '9. Fontes de dados'}>
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
                                text: 'The second source for the approach list, covering both asteroids and comets. Provides miss distance, velocity, and orbital data for close approaches matching the selected filters. Merged and deduplicated with NeoWs results; the two sources complement each other in coverage.',
                            },
                            {
                                name: 'JPL SBDB',
                                sub: 'Small-Body Database',
                                text: "Queried for individual object details: physical parameters, full orbital elements, discovery data, and the SPK-ID used to query Horizons. Acts as the identity resolver when an object's Horizons ephemeris needs to be fetched.",
                            },
                            {
                                name: 'JPL Horizons',
                                sub: 'Ephemeris System',
                                text: 'The world reference for solar system body ephemerides. Called per-object to retrieve geocentric state vectors (position x,y,z and velocity vx,vy,vz in the J2000 equatorial frame) for the 3D scene placement, the motion cone, and the trajectory trail. Results cached up to 15-30 minutes.',
                            },
                            {
                                name: 'astronomy-engine',
                                sub: 'local analytical library · no network call',
                                text: "Computes Sun position (light direction), Moon position and phase, Earth's heliocentric position (orbit view), and the subsolar point that drives the day/night terminator shader. Based on USNO/NOVAS algorithms; high-precision results for the inner solar system with no external API round-trip.",
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
                                text: 'Segunda fonte da lista de aproximações, cobrindo asteroides e cometas. Fornece distância de miss, velocidade e dados orbitais para aproximações que satisfazem os filtros selecionados. Mesclado e deduplicado com os resultados do NeoWs; as duas fontes se complementam em cobertura.',
                            },
                            {
                                name: 'JPL SBDB',
                                sub: 'Small-Body Database',
                                text: 'Consultado para detalhes individuais de objetos: parâmetros físicos, elementos orbitais completos, dados de descoberta e o SPK-ID usado para consultar o Horizons. Funciona como o resolvedor de identidade quando a efeméride Horizons de um objeto precisa ser buscada.',
                            },
                            {
                                name: 'JPL Horizons',
                                sub: 'Sistema de Efemérides',
                                text: 'A referência mundial para efemérides de corpos do sistema solar. Chamado por objeto para entregar vetores de estado geocêntricos (posição x,y,z e velocidade vx,vy,vz no referencial equatorial J2000) para posicionamento na cena 3D, o cone de movimento e a trilha de trajetória. Cache de 15-30 minutos.',
                            },
                            {
                                name: 'astronomy-engine',
                                sub: 'biblioteca analítica local · sem chamada de rede',
                                text: 'Calcula a posição do Sol (direção da luz), posição e fase da Lua, posição heliocêntrica da Terra (vista de órbita) e o ponto subsolar que alimenta o shader do terminador dia/noite. Baseada em algoritmos USNO/NOVAS; resultados de alta precisão para o sistema solar interno sem API externa.',
                            },
                        ]).map((src) => (
                            <div key={src.name} className="rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
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
                                { kind: 'calculated', label: 'Locally: Sun/Moon/Earth positions, subsolar point, distance units, linear scene scale, cone direction, trail' },
                                { kind: 'visual', label: 'Visual choice: body radii amplified for legibility; trail window -72 h / now' },
                            ]
                            : [
                                { kind: 'observed', label: 'NeoWs + CAD: lista de aproximações, distâncias, velocidades, flag de perigo' },
                                { kind: 'observed', label: 'SBDB: parâmetros físicos, elementos orbitais, SPK-ID' },
                                { kind: 'observed', label: 'Horizons: posição r e velocidade v do asteroide (por objeto, para a cena 3D)' },
                                { kind: 'calculated', label: 'Localmente: posições do Sol/Lua/Terra, ponto subsolar, unidades de distância, escala linear da cena, direção do cone, trilha' },
                                { kind: 'visual', label: 'Escolha visual: raios dos corpos amplificados para legibilidade; janela da trilha -72 h / agora' },
                            ]}
                    />
                </div>
            </TechSection>

            <p className="text-[12px] leading-relaxed text-white/35">
                {en
                    ? 'For impact risk assessment, mission planning, or precision orbital analysis, use JPL CNEOS, Scout, or certified professional software directly.'
                    : 'Para avaliação de risco de impacto, planejamento de missão ou análise orbital de precisão, use diretamente o JPL CNEOS, Scout ou software profissional certificado.'}
            </p>
        </div>
    );
}

function OrbitTechnical({ en, locale }: { en: boolean; locale: 'pt-BR' | 'en' }) {
    return (
        <div className="space-y-6">
            <div className="rounded-md border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    {en ? 'Optional deep-dive' : 'Aprofundamento opcional'}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                    {en
                        ? 'How the orbital ellipse is computed, which physical laws it rests on, and the limits of the model. Not required to use the radar. Switch to the reading guide if you just want to understand the scene visually.'
                        : 'Como a elipse orbital é calculada, em que leis físicas ela se baseia e os limites do modelo. Não é necessário para usar o radar. Mude para o guia de leitura se quiser entender a cena visualmente.'}
                </p>
            </div>

            {/* ── Diagrama full-width (mesmo tamanho do friendly) ────── */}
            <OrbitGuideDiagram locale={locale} technical />

            {/* ── Contexto em duas colunas ──────────────────────────── */}
            <div className="grid gap-5 lg:grid-cols-2">
                <TechSection prose title={en ? '1. What the full-orbit view adds' : '1. O que a vista de órbita completa acrescenta'}>
                    <p className="text-sm leading-relaxed text-white/70">
                        {en
                            ? 'The whole scene uses one linear AU scale, so this view shares the same ruler as the radar — it just reveals the full Keplerian ellipse around the Sun instead of zooming in on the Earth neighbourhood. The radar answers "how close right now?"; the full-orbit view answers "does this path ever cross Earth\'s?"'
                            : 'A cena inteira usa uma única escala linear em UA, então esta vista compartilha a mesma régua do radar. Ela apenas revela a elipse Kepleriana completa ao redor do Sol em vez de dar zoom na vizinhança da Terra. O radar responde "quão perto agora?"; a vista de órbita completa responde "esse caminho cruza o da Terra?"'}
                    </p>
                </TechSection>

                <TechSection prose title={en ? 'What "osculating" means' : 'O que significa "osculador"'}>
                    <p className="text-sm leading-relaxed text-white/70">
                        {en
                            ? 'An osculating orbit is the best-fit Keplerian ellipse at a specific instant. It shows the path the body would follow if all other planets disappeared. Planetary perturbations (mainly Jupiter) cause it to drift over years. Elements cached up to 24 hours; the dot position on the ellipse is computed locally from the current Julian Date and advances with the clock.'
                            : 'A órbita osculadora é a elipse kepleriana que melhor se ajusta à trajetória real num instante específico. É o caminho que o corpo seguiria se todos os outros planetas desaparecessem. Perturbações planetárias (principalmente Júpiter) fazem a órbita derivar ao longo dos anos. Elementos em cache até 24 horas; a posição do ponto na elipse é calculada localmente a partir da Data Juliana atual e avança com o relógio.'}
                    </p>
                </TechSection>
            </div>

            {/* ── Fórmulas em grade 2×2 ─────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2">
                <FormulaPanel
                    en={en}
                    title={en ? '2. Osculating orbital elements (input from JPL Horizons)' : '2. Elementos orbitais osculadores (entrada do JPL Horizons)'}
                    formulas={[
                        { expr: 'q', comment: { en: 'perihelion distance [AU]  ← JPL Horizons', pt: 'distância do periélio [UA]  ← JPL Horizons' } },
                        { expr: 'e', comment: { en: 'eccentricity  (0 = circle, <1 = ellipse)', pt: 'excentricidade  (0 = círculo, <1 = elipse)' } },
                        { expr: 'i', comment: { en: 'inclination vs. ecliptic [deg]', pt: 'inclinação em relação ao eclíptico [graus]' } },
                        { expr: 'Ω', comment: { en: 'longitude of ascending node [deg]', pt: 'longitude do nodo ascendente [graus]' } },
                        { expr: 'ω', comment: { en: 'argument of perihelion [deg]', pt: 'argumento do periélio [graus]' } },
                        { expr: 'Tₚ', comment: { en: 'time of perihelion passage [JD]', pt: 'instante da passagem pelo periélio [JD]' } },
                    ]}
                    note={en
                        ? "Six numbers uniquely define a conic section in 3D space. q and e set the ellipse shape and size. i, Ω, ω orient the orbital plane in the J2000 ecliptic frame via three sequential Euler rotations. Tₚ anchors the body's position in time along the ellipse."
                        : 'Seis números definem unicamente uma seção cônica no espaço 3D. q e e definem a forma e o tamanho da elipse. i, Ω, ω orientam o plano orbital no referencial eclíptico J2000 via três rotações de Euler sequenciais. Tₚ ancora a posição do corpo no tempo ao longo da elipse.'}
                />

                <FormulaPanel
                    en={en}
                    title={en ? '3. Kepler propagation — position on the ellipse' : '3. Propagação Kepleriana — posição na elipse'}
                    formulas={[
                        { expr: 'a  = q / (1 − e)', comment: { en: 'semi-major axis [AU]', pt: 'semieixo maior [UA]' } },
                        { expr: 'k  = 0.01720209895', comment: { en: 'Gaussian gravitational constant', pt: 'constante gravitacional gaussiana' } },
                        { expr: 'n  = k / a^(3/2)', comment: { en: 'mean motion [rad/day]', pt: 'movimento médio [rad/dia]' } },
                        { expr: 'M  = n · (JD_now − Tₚ)', comment: { en: 'mean anomaly', pt: 'anomalia média' } },
                        { expr: 'E − e·sin(E) = M', comment: { en: "Kepler's equation → eccentric anomaly E", pt: 'equação de Kepler → anomalia excêntrica E' } },
                    ]}
                    note={en
                        ? "M grows linearly with time — it's a fictitious angle that would mark the position if the body moved at constant speed. E is the eccentric anomaly, the real angular position on the ellipse. The Gaussian constant k is √(GM☉) in AU–day units, a centuries-old convention that avoids SI unit conversion in orbit calculations. Kepler's equation has no closed-form solution; it's solved by Newton's method in 6 fixed iterations, which is sufficient to fall below machine epsilon for typical near-Earth eccentricities."
                        : 'M cresce linearmente com o tempo — é um ângulo fictício que marcaria a posição se o corpo se movesse em velocidade constante. E é a anomalia excêntrica, a posição angular real na elipse. A constante gaussiana k é √(GM☉) em unidades UA–dia, convenção secular que evita conversão de unidades SI em cálculos orbitais. A equação de Kepler não tem solução analítica; é resolvida pelo método de Newton em 6 iterações fixas, suficientes para ficar abaixo do epsilon de máquina para excentricidades típicas de objetos próximos à Terra.'}
                />

                <FormulaPanel
                    en={en}
                    title={en ? '4. From orbital plane to 3D ecliptic' : '4. Do plano orbital para o eclíptico 3D'}
                    formulas={[
                        { expr: 'x = a·(cos E − e)', comment: { en: 'perifocal x', pt: 'x perifocal' } },
                        { expr: 'y = a·√(1 − e²)·sin E', comment: { en: 'perifocal y', pt: 'y perifocal' } },
                        { expr: 'R = Rz(Ω) · Rx(i) · Rz(ω)', comment: { en: 'Euler rotation matrix', pt: 'matriz de rotação de Euler' } },
                        { expr: 'p_ecl = R · (x, y, 0)', comment: { en: 'heliocentric ecliptic [AU, J2000]', pt: 'eclíptico heliocêntrico [UA, J2000]' } },
                    ]}
                    note={en
                        ? "The result is the body's heliocentric position in J2000 ecliptic coordinates after orienting the ellipse in 3D space."
                        : 'O resultado é a posição heliocêntrica do corpo em coordenadas eclípticas J2000 depois de orientar a elipse no espaço 3D.'}
                />

                <FormulaPanel
                    en={en}
                    title={en ? '5. Mapping to the 3D scene' : '5. Mapeamento para a cena 3D'}
                    formulas={[
                        { expr: '1 AU = LINEAR_AU_SCALE', comment: { en: 'one linear scale, no compression', pt: 'escala linear única, sem compressão' } },
                        { expr: 'body: (x_ecl, z_ecl, −y_ecl) · scale', comment: { en: 'full 3D, inclination preserved', pt: '3D completo, inclinação preservada' } },
                        { expr: 'ellipse ← perifocal(a, e, i, Ω, ω)', comment: { en: 'same rotation as the body', pt: 'mesma rotação do corpo' } },
                        { expr: en ? 'positions ← astronomy-engine HelioState()' : 'posições ← astronomy-engine HelioState()', comment: { en: 'real heliocentric vectors', pt: 'vetores heliocêntricos reais' } },
                    ]}
                    note={en
                        ? 'One axis convention for the whole heliocentric scene: the full 3D ecliptic mapping (x, z, −y), so orbital inclination is preserved for planets and asteroids alike. Steeply tilted orbits rise above/below the screen plane. The body position is SAMPLED ON THE SAME POLYLINE that is drawn for the orbit (at the body true anomaly ν), not on the ideal curve, so the body lands exactly on its line at any distance, even when the orbit is eccentric (Mercury) or far out (Uranus, Neptune). The scale is strictly linear: the ellipse faithfully reflects the real eccentricity, inclination and perihelion.'
                        : 'Uma única convenção de eixos para toda a cena heliocêntrica: o mapeamento eclíptico 3D completo (x, z, −y), então a inclinação orbital é preservada para planetas e asteroides igualmente. Órbitas muito inclinadas sobem acima ou abaixo do plano da tela. A posição do corpo é AMOSTRADA NA MESMA POLILINHA desenhada para a órbita (na anomalia verdadeira ν do corpo), não na curva ideal, então o corpo cai exatamente sobre a sua linha em qualquer distância, mesmo quando a órbita é excêntrica (Mercúrio) ou distante (Urano, Netuno). A escala é estritamente linear: a elipse reflete fielmente a excentricidade, a inclinação e o periélio reais.'}
                />
            </div>

            <TechGroup title={en ? '6. How to interpret the orbit view technically' : '6. Como interpretar a vista de órbita com olhos técnicos'}>
                <table className="w-full text-[12px]">
                    <thead>
                        <tr className="border-b border-white/[0.08]">
                            <th className="pb-1.5 pr-4 text-left font-semibold text-white/40">{en ? 'What you see' : 'O que você vê'}</th>
                            <th className="pb-1.5 text-left font-semibold text-white/40">{en ? 'What it means' : 'O que significa'}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                        {[
                            {
                                see: en ? 'Round ellipse' : 'Elipse redonda',
                                means: en ? 'Low eccentricity (e ≈ 0) — nearly constant Sun distance' : 'Baixa excentricidade (e ≈ 0) — distância quase constante do Sol',
                            },
                            {
                                see: en ? 'Stretched ellipse' : 'Elipse esticada',
                                means: en ? 'High e — fast at perihelion, slow at aphelion' : 'e alto — rápido no periélio, lento no afélio',
                            },
                            {
                                see: en ? 'Sun off-centre' : 'Sol fora do centro',
                                means: en ? "Kepler's 1st law — Sun is at one focus, not the geometric centre" : '1ª lei de Kepler — Sol num foco, não no centro geométrico',
                            },
                            {
                                see: en ? 'Tilted orbit (side view)' : 'Órbita inclinada (vista lateral)',
                                means: en ? 'High inclination i — crosses Earth\'s zone only at two nodes' : 'Inclinação i alta — cruza a zona da Terra em apenas dois nodos',
                            },
                            {
                                see: en ? 'Asteroid dot' : 'Ponto do asteroide',
                                means: en ? "Kepler propagation from JPL Horizons elements (today's JD)" : 'Propagação Kepleriana dos elementos do JPL Horizons (JD de hoje)',
                            },
                            {
                                see: en ? 'Planet dots' : 'Pontos dos planetas',
                                means: en ? 'astronomy-engine HelioState() — no Kepler step' : 'astronomy-engine HelioState() — sem etapa Kepleriana',
                            },
                        ].map(({ see, means }) => (
                            <tr key={see}>
                                <td className="py-2 pr-4 font-medium text-white/75">{see}</td>
                                <td className="py-2 text-white/55">{means}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TechGroup>

            <TechGroup title={en ? '7. Limitations' : '7. Limitações'}>
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
                            ? '⬡ The view shows the full orbit as a closed loop. It does not animate the asteroid moving along the loop; for real-time motion, switch to radar mode.'
                            : '⬡ A vista mostra a órbita completa como um loop fechado. Não anima o asteroide se movendo pelo loop; para movimento em tempo real, mude para o modo radar.'}
                    </p>
                    <p>
                        {en
                            ? '⬡ The rendered body is sampled on the same polyline that draws the orbit, so it always sits exactly on its line. This shifts the body along its own orbit by under 0.02% of the distance versus the exact Keplerian point. The direction is unchanged; the offset has no physical meaning at this scale.'
                            : '⬡ O corpo renderizado é amostrado na mesma polilinha que desenha a órbita, então fica sempre exatamente sobre a sua linha. Isso desloca o corpo ao longo da própria órbita em menos de 0,02% da distância em relação ao ponto Kepleriano exato. A direção não muda; o deslocamento não tem significado físico nessa escala.'}
                    </p>
                </div>
                <p className="mt-3 text-[12px] leading-relaxed text-white/40">
                    {en
                        ? 'This is an educational visualisation. For precision orbital mechanics, use JPL Horizons, CNEOS, or certified professional software.'
                        : 'Esta é uma visualização educativa. Para mecânica orbital de precisão, use JPL Horizons, CNEOS ou software profissional certificado.'}
                </p>
            </TechGroup>
        </div>
    );
}
