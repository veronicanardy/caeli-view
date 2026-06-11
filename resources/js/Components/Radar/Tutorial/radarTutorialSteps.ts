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
    /** Avança quando o limite de objetos (5/15/30) muda. Espera o radar terminar de carregar. */
    | { kind: 'limit-change' }
    /** Avança quando um objeto é selecionado (selectedId não nulo). */
    | { kind: 'selection' }
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
        bodyPt: 'Este é o Radar do CaeliView, sua janela para os asteroides e cometas que passam perto da Terra. Vem comigo: em poucos passos você vai dominar tudo por aqui.',
        bodyEn: 'This is the CaeliView Radar, your window to the asteroids and comets passing near Earth. Come along: in a few steps you will master everything here.',
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
        bodyPt: 'A Terra fica no centro, com a Lua logo ali do lado. Cada rocha que você vê é um asteroide ou cometa de verdade, passando pela nossa vizinhança agora. As etiquetas com nomes ajudam a saber quem é quem.',
        bodyEn: 'Earth sits at the centre, with the Moon right beside it. Every rock you see is a real asteroid or comet passing through our neighbourhood right now. The name labels help you tell who is who.',
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
        bodyPt: 'Vamos aprender a passear por aqui. Pressione todas as teclas do mini teclado: W, A, S, D e as quatro setas. Elas ficam acesas conforme você usa.',
        bodyEn: 'Let\'s learn to wander around. Press every key on the mini keyboard: W, A, S, D and the four arrows. They light up as you go.',
    },
    {
        id: 'camera-zoom',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'scene-zoom' },
        advanceDelayMs: 1500,
        titlePt: 'Agora, o zoom',
        titleEn: 'Now, zoom',
        bodyPt: 'Use o scroll do mouse sobre a cena: primeiro aproxime bem da Terra, depois afaste para ver o quadro todo. As barrinhas aqui embaixo mostram o seu progresso.',
        bodyEn: 'Scroll over the scene: first zoom in close to Earth, then zoom out to see the whole picture. The little bars below show your progress.',
        bodyMobilePt: 'Use a pinça com dois dedos: primeiro aproxime bem da Terra, depois afaste para ver o quadro todo. As barrinhas aqui embaixo mostram o seu progresso.',
        bodyMobileEn: 'Pinch with two fingers: first zoom in close to Earth, then zoom out to see the whole picture. The little bars below show your progress.',
    },
    {
        id: 'camera-rotate',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'scene-rotate' },
        advanceDelayMs: 1500,
        titlePt: 'E a rotação',
        titleEn: 'And rotation',
        bodyPt: 'Aqui vale prestar atenção, porque é fácil confundir. Para girar ao redor da cena, segure o botão esquerdo do mouse e arraste. O botão direito é outra história: ele desloca a cena para os lados, sem girar. Gire até preencher a barrinha aqui embaixo.',
        bodyEn: 'Pay a little attention here, it is easy to mix up. To spin around the scene, hold the left mouse button and drag. The right button is a different story: it slides the scene sideways without rotating. Spin until the little bar below fills up.',
        bodyMobilePt: 'Arraste com um dedo para girar ao redor da cena. Gire até preencher a barrinha aqui embaixo.',
        bodyMobileEn: 'Drag with one finger to spin around the scene. Spin until the little bar below fills up.',
    },
    {
        id: 'filter-criterion',
        audience: 'all',
        targets: ['[data-tutorial="radar-filter-criterion"]', '[data-tutorial="radar-filters"]'],
        advance: { kind: 'criterion-change' },
        settleWhileAdvancing: true,
        side: 'bottom',
        titlePt: 'Escolha o que você quer ver',
        titleEn: 'Choose what you want to see',
        bodyPt: '[[Mais próximos agora]] é um ranking ao vivo de quem está mais perto da Terra neste momento. [[Próximas aproximações]] mostra quem ainda vai fazer uma passagem importante em breve. Troque o critério para a gente continuar.',
        bodyEn: '[[Closest now]] is a live ranking of what is nearest to Earth right at this moment. [[Upcoming passes]] shows what will still make an important pass soon. Switch the criterion so we can continue.',
        bodyMobilePt: 'Toque para abrir os filtros e troque o critério entre [[Mais próximos agora]] e [[Próximas aproximações]].',
        bodyMobileEn: 'Tap to open the filters and switch between [[Closest now]] and [[Upcoming passes]].',
    },
    {
        id: 'filter-limit',
        audience: 'all',
        targets: ['[data-tutorial="radar-filter-limit"]', '[data-tutorial="radar-filters"]'],
        advance: { kind: 'limit-change' },
        settleWhileAdvancing: true,
        side: 'bottom',
        titlePt: 'Quantos objetos de uma vez?',
        titleEn: 'How many objects at once?',
        bodyPt: 'Aqui você escolhe o tamanho da plateia: [[5]] para uma cena limpinha, [[15]] para o equilíbrio ou [[30]] para ver o céu cheio. Escolha outra quantidade para continuar.',
        bodyEn: 'Here you choose the crowd size: [[5]] for a clean scene, [[15]] for balance or [[30]] for a busy sky. Pick another amount to continue.',
        bodyMobilePt: 'Em Exibir até, escolha [[5]], [[15]] ou [[30]] objetos para continuar.',
        bodyMobileEn: 'Under Show up to, pick [[5]], [[15]] or [[30]] objects to continue.',
    },
    {
        id: 'filter-done',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        titlePt: 'Filtros no seu controle',
        titleEn: 'Filters in your control',
        bodyPt: 'Critério e quantidade ficam disponíveis o tempo todo. Você pode trocar quando quiser, a cena atualiza na hora.',
        bodyEn: 'Criterion and quantity are always available. Switch them whenever you like, the scene updates instantly.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
    },
    {
        id: 'select-object',
        audience: 'all',
        targets: ['[data-tutorial="object-list"]', '[data-tutorial="object-list-toggle"]'],
        advance: { kind: 'selection' },
        resetViewOnEnter: true,
        settleWhileAdvancing: true,
        advanceDelayMs: 2800,
        side: 'right',
        sideMobile: 'bottom',
        titlePt: 'Agora escolha um asteroide',
        titleEn: 'Now pick an asteroid',
        bodyPt: 'Escolha um nome na lista de objetos e clique nele. Cada rocha tem a sua própria história.',
        bodyEn: 'Pick a name from the object list and click it. Each rock has its own story.',
        bodyMobilePt: 'Abra a lista de Objetos e toque em uma rocha. Cada uma tem a sua própria história.',
        bodyMobileEn: 'Open the Objects list and tap a rock. Each one has its own story.',
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
        titlePt: 'O dossiê da sua rocha',
        titleEn: 'Your rock\'s dossier',
        bodyPt: 'Este card resume tudo sobre o objeto escolhido. Comece pela distância da Terra, depois repare na velocidade, no status e no risco.',
        bodyEn: 'This card sums up everything about your chosen object. Start with the distance from Earth, then look at speed, status and risk.',
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
        titlePt: 'O card tem três abas',
        titleEn: 'The card has three tabs',
        bodyPt: 'A aba [[Resumo]] já está aberta. Ela traz o essencial: distância, velocidade, risco e status. Tudo que você precisa em um relance.',
        bodyEn: 'The [[Summary]] tab is already open. It brings the essentials: distance, speed, risk and status. Everything you need at a glance.',
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
        titlePt: 'Agora, o perfil físico',
        titleEn: 'Now, the physical profile',
        bodyPt: 'Clique na aba [[Perfil físico]] para conhecer o objeto por dentro. Tamanho estimado, composição, classe orbital. Uma identidade completa.',
        bodyEn: 'Click the [[Physical profile]] tab to get to know the object up close. Estimated size, composition, orbital class. A full identity.',
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
        titlePt: 'O que há por dentro',
        titleEn: 'What\'s inside',
        bodyPt: 'Viu só? Cada rocha tem características únicas. Algumas são gigantes lentas, outras são minúsculas e velozes. A diversidade aqui é impressionante.',
        bodyEn: 'See? Each rock has unique traits. Some are slow giants, others tiny speedsters. The diversity here is remarkable.',
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
        bodyPt: 'Falta uma. Clique em [[Aproximação]] para ver os detalhes da passagem: data, distância mínima e velocidade relativa no momento do encontro.',
        bodyEn: 'One more. Click [[Approach]] to see the pass details: date, minimum distance and relative speed at the moment of closest encounter.',
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
        bodyPt: 'Esta aba mostra quando e como a rocha passa mais perto. Um encontro marcado no calendário do cosmos. Você já conhece o card por completo.',
        bodyEn: 'This tab shows when and how the rock passes closest. A meeting marked on the cosmos calendar. You now know the card inside out.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
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
        bodyPt: 'Este botão afasta a câmera o suficiente para você ver a trajetória completa da rocha e a direção que ela está seguindo. Clique para experimentar.',
        bodyEn: 'This button pulls the camera back far enough to see the rock\'s full trajectory and the direction it is heading. Click to try it.',
    },
    {
        id: 'trajectory-explain',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        optional: true,
        requiresSelection: true,
        titlePt: 'O que você está vendo',
        titleEn: 'What you are seeing',
        bodyPt: 'A linha é a trajetória estimada da rocha e a seta indica para onde ela está indo. Os marcadores [[−24h]], [[−48h]] e [[−72h]] marcam posições em relação ao momento de maior aproximação, que pode já ter acontecido ou ainda estar por vir. Uma forma de sentir a velocidade do objeto no tempo.',
        bodyEn: 'The line is the rock\'s estimated trajectory and the arrow shows where it is heading. The [[−24h]], [[−48h]] and [[−72h]] markers show positions relative to closest approach, which may have already happened or still be coming. A way to feel the object\'s speed over time.',
        primaryLabelPt: 'Entendi',
        primaryLabelEn: 'Got it',
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
        bodyPt: 'Passeio feito! Clique em Voltar ao asteroide para retomar a visão de aproximação.',
        bodyEn: 'Trip done! Click Back to the asteroid to return to the close-up view.',
    },
    {
        id: 'references-bodies',
        audience: 'all',
        targets: ['[data-tutorial="reference-controls"]', '[data-tutorial="object-list-toggle"]'],
        advance: { kind: 'click', requireSelector: '[data-tutorial="reference-body"]' },
        optional: true,
        settleWhileAdvancing: true,
        advanceDelayMs: 2800,
        skipGroup: 'ref-bodies',
        side: 'right',
        sideMobile: 'bottom',
        titlePt: 'Visite a vizinhança',
        titleEn: 'Visit the neighbourhood',
        bodyPt: 'Nas Referências, um clique te leva direto para perto de quem você quiser. Escolha [[Sol]], [[Terra]] ou [[Lua]] e veja a câmera viajar até lá. Não se preocupe com [[Planetas]] agora.',
        bodyEn: 'In References, one click takes you right next to whoever you like. Pick [[Sun]], [[Earth]] or [[Moon]] and watch the camera travel there. [[Planets]] comes in the next step.',
        bodyMobilePt: 'Abra a lista de Objetos e, nas Referências, toque em [[Sol]], [[Terra]] ou [[Lua]] para ver a câmera viajar até lá. Não se preocupe com [[Planetas]] agora.',
        bodyMobileEn: 'Open the Objects list and, under References, tap [[Sun]], [[Earth]] or [[Moon]] to watch the camera travel there. [[Planets]] comes in the next step.',
    },
    {
        id: 'references-bodies-arrival',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
        optional: true,
        skipGroup: 'ref-bodies',
        side: 'right',
        sideMobile: 'bottom',
        titlePt: 'Chegamos!',
        titleEn: 'We\'re here!',
        bodyPt: 'Estes corpos têm um card próprio com características físicas e história. A navegação pelas abas é a mesma que você já conhece nas rochas, mas as informações são bem diferentes.',
        bodyEn: 'These bodies have their own card with physical traits and history. The tab navigation works just like the one you know from rocks, but the information is quite different.',
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
        advanceDelayMs: 2800,
        skipGroup: 'ref-planets',
        side: 'right',
        sideMobile: 'bottom',
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
        skipGroup: 'ref-planets',
        side: 'right',
        sideMobile: 'bottom',
        titlePt: 'Destino escolhido',
        titleEn: 'Destination chosen',
        bodyPt: 'Os planetas também têm card próprio com dados básicos. Vale dar uma olhada antes de continuar.',
        bodyEn: 'Planets have their own card with basic data too. Worth a look before moving on.',
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
        advanceDelayMs: 1500,
        side: 'bottom',
        titlePt: 'Se perdeu? Sem pânico',
        titleEn: 'Lost? No panic',
        bodyPt: 'Depois de tanto passeio, que tal voltar para casa? Este botão devolve a câmera para uma posição segura, pertinho da Terra. Clique para ver a mágica.',
        bodyEn: 'After all this wandering, how about heading home? This button returns the camera to a safe spot, right by Earth. Click and watch the magic.',
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
        settleWhileAdvancing: true,
        advanceDelayMs: 1500,
        side: 'bottom',
        titlePt: 'Os controles da cena',
        titleEn: 'The scene controls',
        bodyPt: 'Estes botõezinhos no canto ajustam a visualização. Este aqui esconde os nomes e marcações. Clique nele para ver a cena limpa.',
        bodyEn: 'These little buttons in the corner adjust the view. This one hides the names and markers. Click it to see the scene clean.',
    },
    {
        /* Contemplação: o alvo é a cena inteira, então o furo do spotlight deixa o céu visível sem escurecer. */
        id: 'labels-view',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
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
        settleWhileAdvancing: true,
        advanceDelayMs: 1500,
        side: 'bottom',
        titlePt: 'Agora em tela cheia',
        titleEn: 'Now in fullscreen',
        bodyPt: 'Este botão amplia o Radar para a tela inteira. Clique para experimentar.',
        bodyEn: 'This button expands the Radar to the whole screen. Click to try it.',
    },
    {
        /* Contemplação da tela cheia: mesmo truque do furo do spotlight na cena inteira. */
        id: 'fullscreen-view',
        audience: 'all',
        targets: ['[data-tutorial="radar-canvas"]'],
        advance: { kind: 'manual' },
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
        bodyPt: 'O Guia do Radar está aqui sempre que você precisar. Escalas, símbolos, o que significa cada indicador. Tem também um guia específico para o modo órbita, que aparece quando você estiver por lá. Vale ler os dois. Quando terminar o tutorial, o guia vai abrir para você dar uma olhada.',
        bodyEn: 'The Radar Guide is here whenever you need it. Scales, symbols, what each indicator means. There is also a specific guide for orbit mode, which appears when you are there. Both are worth reading. When the tutorial ends, the guide will open for you to take a look.',
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

/** Resolve título, corpo e rótulos do passo para o idioma e viewport atuais. */
export function stepCopy(step: TutorialStep, en: boolean, isMobile: boolean): TutorialStepCopy {
    const body = isMobile
        ? (en ? step.bodyMobileEn ?? step.bodyEn : step.bodyMobilePt ?? step.bodyPt)
        : (en ? step.bodyEn : step.bodyPt);
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
