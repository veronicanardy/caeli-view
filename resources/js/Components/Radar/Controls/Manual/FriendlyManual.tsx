import type { SceneMode } from './manualTypes';
import {
    Callout,
    CuriositiesSection,
    HighlightBox,
    InteractionHint,
    ReadingStep,
    RulerRow,
    Section,
    SwitchModeHint,
    VisualKey,
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
                        <p className="mb-2 text-sm leading-relaxed text-white/70">
                            {en
                                ? 'The distances in the left panel use three different units depending on how far the object is. They all measure the same thing — just at different scales. Understanding them helps you interpret what you see on screen.'
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
                        <p className="mb-3 text-sm leading-relaxed text-white/60">
                            {en
                                ? "The radar has two layers drawn on top of each other. The inner layer shows the Earth's neighbourhood — asteroids, the Moon, and distance rings. A second, much larger background layer shows the planets for scale, so you can see how the whole solar system fits around the scene. Here is what each element represents:"
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
                                <li><span className="font-medium text-white/80">{en ? 'Top' : 'Superior'}</span>{en ? " — bird's-eye. Good overview, but hides depth. Use it to see the big picture." : ' — visão de cima. Boa visão geral, mas esconde a profundidade. Use para ter uma ideia do conjunto.'}</li>
                                <li><span className="font-medium text-white/80">{en ? 'Side' : 'Lateral'}</span>{en ? " — from the side. Reveals which objects are above or below Earth's plane." : ' — lateral. Revela quais objetos estão acima ou abaixo do plano da Terra.'}</li>
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

            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-white/60">
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
                            <VisualKey color="bg-white" label={en ? 'Bright dot on the oval' : 'Ponto brilhante no oval'} desc={en ? 'Where the asteroid is today. It moves as days pass.' : 'Onde o asteroide está hoje. Ele avança com o passar dos dias.'} />
                        </div>
                    </Section>

                    <SwitchModeHint en={en} targetMode="radar" />
                </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[13px] leading-relaxed text-white/60">
                    {en
                        ? 'Now you know how to read an orbit. To see where the asteroid is relative to Earth right now, switch back to radar mode.'
                        : 'Agora você sabe ler uma órbita. Para ver onde o asteroide está em relação à Terra agora, troque para o modo radar.'}
                </p>
            </div>

            <CuriositiesSection en={en} mode="orbit" />
        </div>
    );
}
