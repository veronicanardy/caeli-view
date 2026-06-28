/**
 * Definição dos passos do tutorial interativo do radar.
 *
 * Responsabilidade: declarar a sequência de passos, seus textos PT/EN, alvos
 * (`data-tutorial`) e condições de avanço como dados puros, sem React e sem DOM.
 * Helpers deste arquivo são funções puras testáveis em Node.
 *
 * Convenções:
 *  - `targets` lista seletores em ordem de preferência; o primeiro visível na
 *    tela vira o alvo do spotlight. Lista vazia = passo centralizado.
 *  - Passos com o mesmo `skipGroup` são pulados juntos quando o alvo do
 *    primeiro não existe (ex.: órbita indisponível sem época de periélio).
 *  - Trechos entre [[colchetes duplos]] viram chips visuais no tooltip,
 *    imitando o botão real que o usuário precisa encontrar.
 *  - Textos de produto não usam travessão; frases curtas separadas por ponto.
 *  - Tom de voz: caloroso e acolhedor, sem ser infantil. O Caeli conversa com
 *    a pessoa, não despeja instruções.
 *
 * Nota sobre o mouse: os OrbitControls da cena usam o mapeamento padrão do
 * three.js (sem remap em RadarScene): botão esquerdo arrasta = rotacionar,
 * botão direito arrasta = deslocar a cena (pan), scroll = zoom (InertialZoom).
 * Os textos do passo de rotação refletem exatamente isso.
 */

export type TutorialAudience = 'all' | 'desktop' | 'mobile';

export type TutorialSide = 'top' | 'bottom' | 'left' | 'right';

export type TutorialAdvance =
    /** Avança pelo botão primário do tooltip. */
    | { kind: 'manual' }
    /** Avança quando o usuário clica dentro de um dos `targets`. `requireSelector` restringe ao elemento clicado (via closest). */
    | { kind: 'click'; requireSelector?: string }
    /** Avança quando o critério da lista (nearest/upcoming) muda. Espera o radar terminar de carregar. */
    | { kind: 'criterion-change' }
    /** Avança quando o limite de objetos (5/15/Todos) muda. Espera o radar terminar de carregar. */
    | { kind: 'limit-change' }
    /** Avança quando um objeto é selecionado (selectedId não nulo). */
    | { kind: 'selection' }
    /** Avança quando o usuário re-seleciona a rocha JÁ selecionada (clique na rocha/label), que reaproxima a câmera. Não depende de selectedId mudar. */
    | { kind: 'reselect-object' }
    /** Avança quando todas as teclas do mini teclado (WASD + setas) foram usadas. */
    | { kind: 'keyboard-pan' }
    /** Avança após zoom de aproximação E de afastamento (medidor de duas fases). */
    | { kind: 'scene-zoom' }
    /** Avança após rotação acumulada suficiente (medidor em arco). */
    | { kind: 'scene-rotate' };

export type TutorialStep = {
    id: string;
    audience: TutorialAudience;
    targets: string[];
    advance: TutorialAdvance;
    /** Quando o alvo não existe/está desabilitado, o passo (e seu grupo) é pulado automaticamente. */
    optional?: boolean;
    /** O alvo precisa estar habilitado (botões disabled não contam). */
    targetMustBeEnabled?: boolean;
    /** Identificador de grupo pulado em bloco quando o primeiro passo do grupo está indisponível. */
    skipGroup?: string;
    /** Passo só faz sentido com objeto selecionado; sem seleção o tutorial volta ao passo de seleção. */
    requiresSelection?: boolean;
    /** Exibe o mini teclado WASD/setas dentro do tooltip. */
    showKeyboardHint?: boolean;
    /** Atraso entre a ação detectada e o avanço (padrão 350 ms). */
    advanceDelayMs?: number;
    /** Remove o escurecimento enquanto espera o avanço (câmera viajando, cena carregando). */
    settleWhileAdvancing?: boolean;
    /** Mantém a cena sem escurecimento quando o alvo do spotlight é o canvas inteiro. */
    keepSceneBright?: boolean;
    /** Quantos cliques distintos no alvo são necessários (padrão 1). */
    requiredClicks?: number;
    /** Ao entrar no passo, aciona o botão de resetar vista para devolver a câmera ao ponto de partida. */
    resetViewOnEnter?: boolean;
    side?: TutorialSide;
    /** Lado preferido no mobile quando difere do desktop (ex.: card vira bottom sheet). */
    sideMobile?: TutorialSide;
    titlePt: string;
    titleEn: string;
    bodyPt: string;
    bodyEn: string;
    bodyMobilePt?: string;
    bodyMobileEn?: string;
    primaryLabelPt?: string;
    primaryLabelEn?: string;
    secondaryLabelPt?: string;
    secondaryLabelEn?: string;
};

export type TutorialStepCopy = {
    title: string;
    body: string;
    primaryLabel: string | null;
    secondaryLabel: string | null;
};

export const RADAR_TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: 'welcome',
        audience: 'all',
        targets: [],
        advance: { kind: 'manual' },
        titlePt: 'Que bom ter você aqui!',
        titleEn: 'So glad you are here!',
        bodyPt: 'Sua janela para os asteroides e cometas que passam perto da Terra. Em poucos passos você domina tudo por aqui.',
        bodyEn: 'Your window to the asteroids and comets passing near Earth. A few steps and you will know your way around.',
        primaryLabelPt: 'Vamos lá',
        primaryLabelEn: 'Let\'s go',
        secondaryLabelPt: 'Pular tutorial',
        secondaryLabelEn: 'Skip tutorial',
    },
    {
        id: 'scene',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        titlePt: 'Esta é a cena orbital',
        titleEn: 'This is the orbital scene',
        bodyPt: 'A Terra fica no centro, com a Lua do lado. Cada rocha é um asteroide ou cometa real passando pela nossa vizinhança agora. Antes de explorar, vamos deixar a câmera na sua mão.',
        bodyEn: 'Earth sits at the centre, with the Moon right beside it. Every rock is a real asteroid or comet passing through our neighbourhood right now. Before we explore, let us put the camera in your hands.',
        primaryLabelPt: 'Próximo',
        primaryLabelEn: 'Next',
    },
    {
        id: 'camera-keyboard',
        audience: 'desktop',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'keyboard-pan' },
        showKeyboardHint: true,
        advanceDelayMs: 1500,
        titlePt: 'Primeiro, a câmera',
        titleEn: 'First, the camera',
        bodyPt: 'Pressione todas as teclas do mini teclado: W, A, S, D e as quatro setas. Elas acendem conforme você usa.',
        bodyEn: 'Press every key on the mini keyboard: W, A, S, D and the four arrows. They light up as you go.',
    },
    {
        id: 'camera-zoom',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'scene-zoom' },
        advanceDelayMs: 1500,
        titlePt: 'Aproxime, depois afaste',
        titleEn: 'Zoom in, then out',
        bodyPt: 'Scroll sobre a cena: chegue pertinho da Terra, depois recue para ver tudo. Repare como a vizinhança inteira cabe num gesto. As barrinhas mostram seu progresso.',
        bodyEn: 'Scroll over the scene: get up close to Earth, then pull back to see it all. Notice how the whole neighbourhood fits in one gesture. The bars below show your progress.',
        bodyMobilePt: 'Use a pinça: aproxime da Terra, depois afaste para ver tudo. As barrinhas mostram seu progresso.',
        bodyMobileEn: 'Pinch the scene: zoom in to Earth, then zoom out to see it all. The bars below show your progress.',
    },
    {
        id: 'camera-rotate',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'scene-rotate' },
        advanceDelayMs: 1500,
        titlePt: 'E a rotação',
        titleEn: 'And rotation',
        bodyPt: 'Botão esquerdo + arrastar gira a cena. Botão direito desloca sem girar. Gire até preencher a barrinha.',
        bodyEn: 'Left button + drag rotates the scene. Right button pans without rotating. Spin until the bar fills up.',
        bodyMobilePt: 'Arraste com um dedo para girar a cena. Gire até preencher a barrinha.',
        bodyMobileEn: 'Drag with one finger to spin around the scene. Spin until the bar fills up.',
    },
    {
        id: 'cheer-camera',
        audience: 'all',
        targets: [],
        advance: { kind: 'manual' },
        titlePt: 'Câmera dominada',
        titleEn: 'Camera mastered',
        bodyPt: 'Você já navega pela cena como quem é de casa. Agora vamos decidir o que aparece nela.',
        bodyEn: 'You already move through the scene like a regular. Now let us decide what shows up in it.',
        primaryLabelPt: 'Seguir',
        primaryLabelEn: 'Onward',
    },
    {
        id: 'filter-criterion',
        audience: 'all',
        targets: ['[data-tutorial="radar-filter-criterion"]', '[data-tutorial="radar-filters"]'],
        advance: { kind: 'criterion-change' },
        settleWhileAdvancing: true,
        side: 'bottom',
        /* Mobile: filtros viram bottom sheet aberto pela action bar; tooltip acima. */
        sideMobile: 'top',
        titlePt: 'Escolha o que você quer ver',
        titleEn: 'Choose what you want to see',
        bodyPt: 'O radar está com o critério [[Mais próximos agora]]. No painel de filtros, toque em [[Próximas aproximações]] para ver os objetos que estão se aproximando. Também há a opção dos [[Objetos famosos]], que você pode explorar depois desse tutorial.',
        bodyEn: 'The radar is set to [[Closest now]]. In the filter panel, tap [[Upcoming passes]] to see the objects arriving soon. There is also the [[Famous objects]] option, which you can explore after this tutorial.',
        bodyMobilePt: 'O filtro já está visível. Toque em [[Próximas aproximações]] para ver quais objetos chegam em breve.',
        bodyMobileEn: 'The filter is already visible. Tap [[Upcoming passes]] to see which objects are arriving soon.',
    },
    {
        id: 'filter-limit',
        audience: 'all',
        targets: ['[data-tutorial="radar-filter-limit"]', '[data-tutorial="radar-filters"]'],
        advance: { kind: 'limit-change' },
        settleWhileAdvancing: true,
        side: 'bottom',
        sideMobile: 'top',
        titlePt: 'Quantos objetos de uma vez?',
        titleEn: 'How many objects at once?',
        bodyPt: 'Aqui você escolhe o tamanho da plateia: [[5]] para uma cena limpinha, [[15]] para o equilíbrio ou [[Todos]] para ver o céu cheio. Escolha outra quantidade para continuar.',
        bodyEn: 'Here you choose the crowd size: [[5]] for a clean scene, [[15]] for balance or [[All]] for a busy sky. Pick another amount to continue.',
        bodyMobilePt: 'Em Exibir até, escolha [[5]], [[15]] ou [[Todos]] para continuar.',
        bodyMobileEn: 'Under Show up to, pick [[5]], [[15]] or [[All]] objects to continue.',
    },
    {
        id: 'filter-done',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        titlePt: 'Filtros no seu controle',
        titleEn: 'Filters in your control',
        bodyPt: 'Critério e quantidade ficam disponíveis o tempo todo, e a cena atualiza na hora. Agora a parte boa: vamos conhecer um desses objetos de perto.',
        bodyEn: 'Criterion and quantity are always there, and the scene updates instantly. Now the good part: let us meet one of these objects up close.',
        primaryLabelPt: 'Quero ver',
        primaryLabelEn: 'Show me',
    },
    {
        id: 'select-object',
        audience: 'all',
        targets: ['[data-tutorial="object-list"]', '[data-tutorial="object-list-toggle"]'],
        advance: { kind: 'selection' },
        resetViewOnEnter: true,
        settleWhileAdvancing: true,
        advanceDelayMs: 1400,
        side: 'right',
        /* Mobile: a lista é um bottom sheet; o tooltip fica acima dela. */
        sideMobile: 'top',
        titlePt: 'Escolha o primeiro da lista',
        titleEn: 'Pick the first on the list',
        bodyPt: 'Clique no primeiro nome da lista. É o {rockName}, uma rocha de verdade {rockMetric}. Eu abro o card dela para você.',
        bodyEn: 'Click the first name on the list. It is {rockName}, a real rock {rockMetric}. I will open its card for you.',
        bodyMobilePt: 'Abra Objetos e toque no primeiro nome. É o {rockName}, uma rocha de verdade {rockMetric}.',
        bodyMobileEn: 'Open Objects and tap the first name. It is {rockName}, a real rock {rockMetric}.',
    },
    {
        /* Contemplação da rocha recém-selecionada: a câmera acabou de chegar nela.
         * Cena iluminada (keepSceneBright) com o furo do spotlight no canvas, para a
         * pessoa ver o objeto real grande na tela ANTES de o card escurecer tudo. */
        id: 'meet-rock',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        optional: true,
        requiresSelection: true,
        keepSceneBright: true,
        titlePt: 'Olha ela aí',
        titleEn: 'There it is',
        bodyPt: 'A câmera chegou junto do {rockName}. Essa rocha que brilha na cena marca a posição real dele agora. O desenho é uma representação, o tamanho é aumentado só para ajudar a enxergar. Dá uma olhada antes da gente entender o card.',
        bodyEn: 'The camera has arrived right next to {rockName}. The rock glowing in the scene marks its real position right now. The shape is a representation, its on-screen size is just to help you see it. Take a look before we understand its card.',
        primaryLabelPt: 'Quero ver o card',
        primaryLabelEn: 'Show me its card',
    },
    {
        id: 'read-card',
        audience: 'all',
        targets: ['[data-tutorial="selected-card"]'],
        advance: { kind: 'manual' },
        optional: true,
        requiresSelection: true,
        side: 'right',
        sideMobile: 'top',
        titlePt: 'Este é o card do objeto',
        titleEn: 'This is the object card',
        bodyPt: 'Aqui você encontra as informações principais sobre o objeto selecionado.',
        bodyEn: 'Here you find the main information about the selected object.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'card-tabs-summary',
        audience: 'all',
        targets: ['[data-tutorial="selected-card"]'],
        advance: { kind: 'manual' },
        optional: true,
        requiresSelection: true,
        side: 'right',
        sideMobile: 'top',
        titlePt: 'Comece pelo resumo',
        titleEn: 'Start with the summary',
        bodyPt: 'O [[Resumo]] traz a distância da Terra, o status e o risco do objeto, com uma leitura rápida do que ele é. É o cartão de visita.',
        bodyEn: 'The [[Summary]] brings the distance from Earth, the status and the risk, with a quick read of what the object is. It is the calling card.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'card-tabs-to-physical',
        audience: 'all',
        targets: ['[data-tutorial="card-tabs"]'],
        advance: { kind: 'click', requireSelector: '[role="tab"][aria-selected="false"]' },
        optional: true,
        requiresSelection: true,
        side: 'right',
        sideMobile: 'top',
        titlePt: 'Veja o perfil físico',
        titleEn: 'See the physical profile',
        bodyPt: 'Clique em [[Perfil físico]] para ver tamanho, velocidade e brilho do objeto. A parte nerd bonitinha.',
        bodyEn: 'Click [[Physical profile]] to see the object\'s size, speed and brightness. The cute nerdy part.',
    },
    {
        id: 'card-tabs-physical-done',
        audience: 'all',
        targets: ['[data-tutorial="selected-card"]'],
        advance: { kind: 'manual' },
        optional: true,
        requiresSelection: true,
        side: 'right',
        sideMobile: 'top',
        titlePt: 'Perfil físico aberto',
        titleEn: 'Physical profile open',
        bodyPt: 'Aqui ficam os dados físicos do objeto. Um mini RG espacial, basicamente.',
        bodyEn: 'This shows the object physical data. Basically, a tiny space ID card.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'card-tabs-to-approach',
        audience: 'all',
        targets: ['[data-tutorial="card-tabs"]'],
        advance: { kind: 'click', requireSelector: '[role="tab"][aria-selected="false"]' },
        optional: true,
        requiresSelection: true,
        side: 'right',
        sideMobile: 'top',
        titlePt: 'E a aproximação?',
        titleEn: 'And the approach?',
        bodyPt: 'Clique em [[Aproximação]] para ver a data da máxima aproximação e a menor distância que o objeto chega da Terra.',
        bodyEn: 'Click [[Approach]] to see the date of closest approach and the smallest distance the object reaches from Earth.',
    },
    {
        id: 'card-tabs-approach-done',
        audience: 'all',
        targets: ['[data-tutorial="selected-card"]'],
        advance: { kind: 'manual' },
        optional: true,
        requiresSelection: true,
        side: 'right',
        sideMobile: 'top',
        titlePt: 'O momento do encontro',
        titleEn: 'The moment of encounter',
        bodyPt: 'Quando e como a rocha passa mais perto. Pronto, você decifrou o card inteiro. Agora vamos ver por onde ela anda.',
        bodyEn: 'When and how the rock passes closest. There, you have decoded the whole card. Now let us see where it travels.',
        primaryLabelPt: 'Ver o caminho',
        primaryLabelEn: 'See its path',
    },
    {
        id: 'zoom-trajectory',
        audience: 'all',
        targets: ['[data-tutorial="zoom-trajectory"]'],
        advance: { kind: 'click' },
        optional: true,
        requiresSelection: true,
        side: 'top',
        titlePt: 'Veja o caminho dela',
        titleEn: 'See its path',
        bodyPt: 'Afasta a câmera para revelar a trajetória completa e a direção da rocha. Clique para experimentar.',
        bodyEn: 'Pulls the camera back to reveal the full trajectory and the rock\'s direction. Click to try it.',
    },
    {
        id: 'trajectory-explain',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        optional: true,
        requiresSelection: true,
        keepSceneBright: true,
        titlePt: 'O que você está vendo',
        titleEn: 'What you are seeing',
        bodyPt: 'A linha é a trajetória estimada e a seta mostra a direção. Os marcadores [[−24h]], [[−48h]] e [[−72h]] indicam posições anteriores. Gire a cena para explorar.',
        bodyEn: 'The line is the estimated trajectory and the arrow shows direction. The [[−24h]], [[−48h]] and [[−72h]] markers show past positions. Rotate the scene to explore.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'trajectory-return',
        audience: 'all',
        /* Destaca o item da rocha na lista de navegação (alvo estável e fácil de
           emoldurar). A label na cena também volta pra perto ao ser clicada, mas
           o spotlight foca na lista; o texto convida a clicar nos dois. */
        targets: ['[data-tutorial="selected-rock-list-item"]', '[data-tutorial="selected-rock-label"]'],
        advance: { kind: 'reselect-object' },
        optional: true,
        requiresSelection: true,
        settleWhileAdvancing: true,
        advanceDelayMs: 1200,
        side: 'right',
        sideMobile: 'top',
        titlePt: 'Pertinho de novo',
        titleEn: 'Back up close',
        bodyPt: 'Para voltar de perto, clique na rocha outra vez, ou no nome dela na cena. A câmera retorna sozinha para junto do objeto.',
        bodyEn: 'To get back up close, click the rock again, or its name in the scene. The camera returns to the object on its own.',
    },
    {
        id: 'orbit-view',
        audience: 'all',
        targets: ['[data-tutorial="orbit-button"]'],
        advance: { kind: 'click' },
        optional: true,
        targetMustBeEnabled: true,
        skipGroup: 'orbit',
        requiresSelection: true,
        side: 'right',
        sideMobile: 'top',
        titlePt: 'Quer ver de onde ele vem?',
        titleEn: 'Want to see where it comes from?',
        bodyPt: 'Clique em Ver a órbita ao redor do Sol e venha conhecer o caminho completo deste objeto.',
        bodyEn: 'Click See its orbit around the Sun and come see this object\'s full path.',
    },
    {
        id: 'orbit-explain',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        requiresSelection: true,
        skipGroup: 'orbit',
        titlePt: 'Mudamos de escala!',
        titleEn: 'We changed scale!',
        bodyPt: 'Agora o Sol está no centro e você vê a volta completa que este objeto dá ao redor dele. A elipse é a trajetória orbital estimada, não uma rota de impacto. Sinta a diferença de escala: aqui cada passo é gigante.',
        bodyEn: 'Now the Sun is at the centre and you can see the full lap this object makes around it. The ellipse is the estimated orbital path, not an impact route. Feel the change of scale: every step here is huge.',
        primaryLabelPt: 'Próximo',
        primaryLabelEn: 'Next',
    },
    {
        id: 'orbit-return',
        audience: 'all',
        targets: ['[data-tutorial="orbit-button"]'],
        advance: { kind: 'click' },
        optional: true,
        skipGroup: 'orbit',
        requiresSelection: true,
        side: 'right',
        sideMobile: 'top',
        titlePt: 'Hora de voltar',
        titleEn: 'Time to head back',
        bodyPt: 'Passeio feito! Clique no botão de voltar para retomar a visão de aproximação.',
        bodyEn: 'Trip done! Click the back button to return to the close-up view.',
    },
    {
        id: 'references-bodies',
        audience: 'all',
        targets: ['[data-tutorial="reference-controls"]', '[data-tutorial="object-list-toggle"]'],
        advance: { kind: 'click', requireSelector: '[data-tutorial="reference-body"]' },
        optional: true,
        settleWhileAdvancing: true,
        advanceDelayMs: 1400,
        skipGroup: 'ref-bodies',
        side: 'right',
        sideMobile: 'top',
        titlePt: 'Visite a vizinhança',
        titleEn: 'Visit the neighbourhood',
        bodyPt: 'Nas Referências, um clique te leva direto para perto de quem você quiser. Por agora, escolha [[Lua]] e veja a câmera viajar até lá. Depois do tutorial, o Sol e a Terra ficam a um clique também.',
        bodyEn: 'In References, one click takes you right next to whoever you like. For now, pick [[Moon]] and watch the camera travel there. After the tutorial, the Sun and Earth are one click away too.',
        bodyMobilePt: 'Abra a lista de Objetos e, nas Referências, toque em [[Lua]] para ver a câmera viajar até lá. Depois você visita o Sol e a Terra à vontade.',
        bodyMobileEn: 'Open the Objects list and, under References, tap [[Moon]] to watch the camera travel there. Later you can visit the Sun and Earth freely.',
    },
    {
        id: 'references-bodies-arrival',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        optional: true,
        keepSceneBright: true,
        skipGroup: 'ref-bodies',
        side: 'right',
        sideMobile: 'bottom',
        titlePt: 'Chegamos na Lua!',
        titleEn: 'We reached the Moon!',
        bodyPt: 'Olha ela bem de perto na cena. Estes corpos têm um card próprio com características físicas e história. A navegação pelas abas é a mesma que você já conhece nas rochas, mas as informações são bem diferentes.',
        bodyEn: 'There it is, up close in the scene. These bodies have their own card with physical traits and history. The tab navigation works just like the one you know from rocks, but the information is quite different.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'references-planets',
        audience: 'all',
        targets: ['[data-tutorial="planet-flyout"]', '[data-tutorial="reference-planets"]', '[data-tutorial="object-list-toggle"]'],
        advance: { kind: 'click', requireSelector: '[data-tutorial="planet-option"]' },
        optional: true,
        settleWhileAdvancing: true,
        advanceDelayMs: 1400,
        skipGroup: 'ref-planets',
        side: 'right',
        sideMobile: 'top',
        titlePt: 'E os planetas também',
        titleEn: 'And the planets too',
        bodyPt: 'Agora clique em [[Planetas]] e veja a lista que aparece. Escolha um deles e a câmera te leva até lá.',
        bodyEn: 'Now click [[Planets]] and see the list that shows up. Pick one and the camera takes you there.',
        bodyMobilePt: 'Toque em [[Planetas]], veja a lista que aparece e escolha um deles. A câmera te leva até lá.',
        bodyMobileEn: 'Tap [[Planets]], see the list that shows up and pick one. The camera takes you there.',
    },
    {
        id: 'references-planets-arrival',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        optional: true,
        keepSceneBright: true,
        skipGroup: 'ref-planets',
        side: 'right',
        sideMobile: 'bottom',
        titlePt: 'Chegamos no planeta!',
        titleEn: 'We reached the planet!',
        bodyPt: 'Aí está ele de pertinho na cena. Os planetas também têm card próprio com dados básicos. E logo abaixo, em [[Naves]], dá para visitar do mesmo jeito sondas reais como as Voyager e a New Horizons, em posição ao vivo. Vale dar uma olhada antes de continuar.',
        bodyEn: 'There it is, up close in the scene. Planets have their own card with basic data too. And right below, under [[Spacecraft]], you can visit real probes the same way, like the Voyagers and New Horizons, in their live positions. Worth a look before moving on.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'reset-view',
        audience: 'all',
        targets: ['[data-tutorial="reset-view"]'],
        advance: { kind: 'click' },
        optional: true,
        settleWhileAdvancing: true,
        advanceDelayMs: 900,
        side: 'bottom',
        titlePt: 'Quanta viagem, hein?',
        titleEn: 'Quite a trip, right?',
        bodyPt: 'Você visitou a Lua e um planeta, e ainda pode passear pelo Sol, pelos outros planetas e pelas naves quando quiser. Para voltar para casa, este botão devolve a câmera a uma posição segura, pertinho da Terra. Clique para ver a mágica.',
        bodyEn: 'You visited the Moon and a planet, and you can roam to the Sun, the other planets and the spacecraft whenever you like. To head home, this button returns the camera to a safe spot, right by Earth. Click and watch the magic.',
    },
    {
        id: 'scene-click-hint',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        titlePt: 'Um atalho de quem já é de casa',
        titleEn: 'A shortcut for regulars',
        bodyPt: 'De volta ao radar, fica a dica: você pode clicar direto na cena, tanto nos nomes flutuantes quanto nas próprias rochas, que o card abre na hora.',
        bodyEn: 'Back in the radar, here is a tip: you can click straight on the scene, both the floating names and the rocks themselves, and the card opens right away.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'toolbar-labels-off',
        audience: 'all',
        targets: ['[data-tutorial="toggle-labels"]'],
        advance: { kind: 'click' },
        optional: true,
        skipGroup: 'labels',
        settleWhileAdvancing: true,
        advanceDelayMs: 700,
        side: 'bottom',
        titlePt: 'Os controles da cena',
        titleEn: 'The scene controls',
        bodyPt: 'Estes botõezinhos no canto ajustam a visualização. Este aqui esconde os nomes e marcações. Clique nele para ver a cena limpa.',
        bodyEn: 'These little buttons in the corner adjust the view. This one hides the names and markers. Click it to see the scene clean.',
    },
    {
        /* Contemplação: o alvo é a cena inteira, então o furo do spotlight deixa o céu visível sem escurecer.
         * A cena permanece sem marcações: religar os nomes é a ação do PRÓXIMO passo, feita pelo usuário. */
        id: 'labels-view',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        optional: true,
        skipGroup: 'labels',
        titlePt: 'Que limpeza, né?',
        titleEn: 'So clean, right?',
        bodyPt: 'Sem as marcações, sobra só o céu. Aproveite para contemplar um pouco. Quando quiser, a gente segue.',
        bodyEn: 'Without the markers, only the sky remains. Take a moment to contemplate. Whenever you are ready, we move on.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'toolbar-labels-on',
        audience: 'all',
        targets: ['[data-tutorial="toggle-labels"]'],
        advance: { kind: 'click' },
        optional: true,
        skipGroup: 'labels',
        side: 'bottom',
        titlePt: 'De volta com os nomes',
        titleEn: 'Names back on',
        bodyPt: 'Bonito, mas os nomes ajudam a se localizar. Clique de novo no mesmo botão para trazer as marcações de volta.',
        bodyEn: 'Beautiful, but the names help you find your way. Click the same button again to bring the markers back.',
    },
    {
        id: 'toolbar-fullscreen-on',
        audience: 'all',
        targets: ['[data-tutorial="toggle-fullscreen"]'],
        advance: { kind: 'click' },
        optional: true,
        skipGroup: 'fullscreen',
        settleWhileAdvancing: true,
        advanceDelayMs: 700,
        side: 'bottom',
        titlePt: 'Agora em tela cheia',
        titleEn: 'Now in fullscreen',
        bodyPt: 'Este botão amplia o Radar para a tela inteira. Clique para experimentar.',
        bodyEn: 'This button expands the Radar to the whole screen. Click to try it.',
    },
    {
        /* Contemplação da tela cheia: mesmo truque do furo do spotlight na cena inteira.
         * A cena continua em tela cheia: sair dela é a ação do PRÓXIMO passo, feita pelo usuário. */
        id: 'fullscreen-view',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        optional: true,
        skipGroup: 'fullscreen',
        titlePt: 'O céu todo para você',
        titleEn: 'The whole sky for you',
        bodyPt: 'Tudo isso é o seu radar agora. Respira, olha as rochas passando. Quando quiser, a gente continua.',
        bodyEn: 'All of this is your radar now. Breathe, watch the rocks drift by. Whenever you like, we continue.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'toolbar-fullscreen-off',
        audience: 'all',
        targets: ['[data-tutorial="toggle-fullscreen"]'],
        advance: { kind: 'click' },
        optional: true,
        skipGroup: 'fullscreen',
        side: 'bottom',
        titlePt: 'Hora de voltar ao normal',
        titleEn: 'Time to go back',
        bodyPt: 'Para sair da tela cheia, é só clicar de novo no mesmo botão. Pode clicar agora.',
        bodyEn: 'To leave fullscreen, just click the same button again. Go ahead and click it now.',
    },
    {
        id: 'radar-guide',
        audience: 'all',
        targets: ['[data-tutorial="radar-guide"]'],
        advance: { kind: 'click' },
        optional: true,
        side: 'top',
        titlePt: 'Seu guia de bolso',
        titleEn: 'Your pocket guide',
        bodyPt: 'O Guia do Radar explica escalas, símbolos e órbitas com toda a calma do mundo. É lá que mora o botão Rever tutorial, para o caso de você querer me ver de novo. Clique para conhecer.',
        bodyEn: 'The Radar guide explains scales, symbols and orbits at your own pace. That is also where the Replay tutorial button lives, in case you want to see me again. Click to take a look.',
    },
    {
        id: 'guide-invitation',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        optional: true,
        titlePt: 'Vale a leitura',
        titleEn: 'Worth a read',
        bodyPt: 'O Guia do Radar está aqui sempre que você precisar. Escalas, símbolos, o que significa cada indicador. Tem também um guia específico para o modo órbita, que aparece quando você estiver por lá. Vale ler os dois.',
        bodyEn: 'The Radar Guide is here whenever you need it. Scales, symbols, what each indicator means. There is also a specific guide for orbit mode, which appears when you are there. Both are worth reading.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'finale',
        audience: 'all',
        targets: [],
        advance: { kind: 'manual' },
        titlePt: 'Pronto. Agora o Radar é seu.',
        titleEn: 'Done. The Radar is yours now.',
        bodyPt: 'Explore à vontade, o céu não sai do lugar. Se quiser rever este tutorial um dia, ele mora no Guia do Radar.',
        bodyEn: 'Explore at will, the sky is not going anywhere. If you ever want to replay this tutorial, it lives in the Radar guide.',
        primaryLabelPt: 'Explorar agora',
        primaryLabelEn: 'Explore now',
    },
];

/** Filtra os passos pela audiência do viewport atual. */
export function stepsForViewport(isMobile: boolean): TutorialStep[] {
    return RADAR_TUTORIAL_STEPS.filter((step) =>
        step.audience === 'all' || step.audience === (isMobile ? 'mobile' : 'desktop'));
}

/**
 * Índice do primeiro passo após o grupo do passo atual. Sem grupo, é o próximo
 * passo. Usado para pular em bloco passos cujo pré-requisito não existe.
 */
export function indexAfterGroup(steps: TutorialStep[], index: number): number {
    const group = steps[index]?.skipGroup;
    if (!group) return index + 1;
    let i = index + 1;
    while (i < steps.length && steps[i].skipGroup === group) i += 1;
    return i;
}

/**
 * Fatos reais do céu de agora, injetados em passos que usam placeholders. Vêm
 * por props da página (nunca da cena 3D direta), mantendo o tutorial desacoplado.
 *  - `rockName`: nome real da rocha no topo da lista (segundo o filtro ativo).
 *  - `rockMetric`: frase pronta com a métrica do critério (distância OU data de
 *    aproximação), já formatada e localizada. Vazia quando não se aplica (famosos).
 */
export type TutorialLiveFacts = {
    rockName?: string | null;
    rockMetric?: string | null;
};

/**
 * Substitui os placeholders {rockName} e {rockMetric} pelo dado real. Quando o
 * fato falta, usa um termo neutro para a frase não quebrar nem mentir. Pura.
 */
export function fillLiveFacts(body: string, facts: TutorialLiveFacts | null, en: boolean): string {
    const name = facts?.rockName?.trim();
    const metric = facts?.rockMetric?.trim();
    let out = body.replace(/\{rockName\}/g, name || (en ? 'this rock' : 'esta rocha'));
    // {rockMetric} vem com a conjunção embutida (", a 380 mil km..."): se faltar, some.
    out = out.replace(/\{rockMetric\}/g, metric ? `${metric}` : '');
    // Limpa espaço duplo deixado por um placeholder vazio.
    return out.replace(/\s{2,}/g, ' ').replace(/\s+([.,])/g, '$1').trim();
}

/** Resolve título, corpo e rótulos do passo para o idioma e viewport atuais. */
export function stepCopy(step: TutorialStep, en: boolean, isMobile: boolean, facts: TutorialLiveFacts | null = null): TutorialStepCopy {
    const rawBody = isMobile
        ? (en ? step.bodyMobileEn ?? step.bodyEn : step.bodyMobilePt ?? step.bodyPt)
        : (en ? step.bodyEn : step.bodyPt);
    const body = fillLiveFacts(rawBody, facts, en);
    return {
        title: en ? step.titleEn : step.titlePt,
        body,
        primaryLabel: (en ? step.primaryLabelEn : step.primaryLabelPt) ?? null,
        secondaryLabel: (en ? step.secondaryLabelEn : step.secondaryLabelPt) ?? null,
    };
}

/** Lado preferido do tooltip para o viewport atual. */
export function stepSide(step: TutorialStep, isMobile: boolean): TutorialSide {
    return (isMobile ? step.sideMobile ?? step.side : step.side) ?? 'bottom';
}

/**
 * Divide o corpo do passo em segmentos de texto e chips ([[...]]).
 * Índices ímpares do retorno são chips. Pura, para o tooltip só renderizar.
 */
export function splitBodyChips(body: string): string[] {
    return body.split(/\[\[(.*?)\]\]/g);
}

/**
 * Capítulos do tutorial: agrupam os passos em fases nomeadas, para o tooltip
 * mostrar "Câmera", "O objeto", "A viagem"... em vez de um "7/30" seco. Marca a
 * trilha como uma jornada, não uma contagem. Pura.
 */
type TutorialChapterId = 'intro' | 'camera' | 'objects' | 'object' | 'journey' | 'scene' | 'closing';

const CHAPTER_BY_STEP_ID: Record<string, TutorialChapterId> = {
    welcome: 'intro',
    scene: 'intro',
    'camera-keyboard': 'camera',
    'camera-zoom': 'camera',
    'camera-rotate': 'camera',
    'cheer-camera': 'camera',
    'filter-criterion': 'objects',
    'filter-limit': 'objects',
    'filter-done': 'objects',
    'select-object': 'object',
    'meet-rock': 'object',
    'read-card': 'object',
    'card-tabs-summary': 'object',
    'card-tabs-to-physical': 'object',
    'card-tabs-physical-done': 'object',
    'card-tabs-to-approach': 'object',
    'card-tabs-approach-done': 'object',
    'zoom-trajectory': 'journey',
    'trajectory-explain': 'journey',
    'trajectory-return': 'journey',
    'orbit-view': 'journey',
    'orbit-explain': 'journey',
    'orbit-return': 'journey',
    'references-bodies': 'journey',
    'references-bodies-arrival': 'journey',
    'references-planets': 'journey',
    'references-planets-arrival': 'journey',
    'reset-view': 'journey',
    'scene-click-hint': 'scene',
    'toolbar-labels-off': 'scene',
    'labels-view': 'scene',
    'toolbar-labels-on': 'scene',
    'toolbar-fullscreen-on': 'scene',
    'fullscreen-view': 'scene',
    'toolbar-fullscreen-off': 'scene',
    'radar-guide': 'closing',
    'guide-invitation': 'closing',
    finale: 'closing',
};

const CHAPTER_LABELS: Record<TutorialChapterId, { pt: string; en: string }> = {
    intro: { pt: 'Início', en: 'Start' },
    camera: { pt: 'Câmera', en: 'Camera' },
    objects: { pt: 'Objetos', en: 'Objects' },
    object: { pt: 'O objeto', en: 'The object' },
    journey: { pt: 'A viagem', en: 'The journey' },
    scene: { pt: 'A cena', en: 'The scene' },
    closing: { pt: 'Reta final', en: 'Home stretch' },
};

/** Nome do capítulo (fase) ao qual o passo pertence, no idioma atual. */
export function tutorialChapterLabel(stepId: string, en: boolean): string {
    const chapter = CHAPTER_BY_STEP_ID[stepId] ?? 'intro';
    const labels = CHAPTER_LABELS[chapter];
    return en ? labels.en : labels.pt;
}
