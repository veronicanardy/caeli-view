# Panels

## Responsabilidade

`Panels` contém painéis, cards, overlays laterais e controles visuais usados pelo `Radar`.

Esta pasta deve renderizar e organizar dados já recebidos pelas camadas de radar 3D, trajetória, seleção e interpretação.

## O Que Pode Conter

- cards de foco e cards informativos de corpos celestes;
- painéis de navegação desktop/mobile;
- mensagens de disponibilidade, qualidade e origem dos dados;
- helpers locais de apresentação, textos, badges e formatação simples.

## O Que Não Deve Conter

- chamadas de API externas;
- cálculo orbital, efemérides ou trajetórias reais;
- ranking global de aproximações;
- fallback Horizons/CAD;
- alteração direta de seleção global, foco global ou modo de câmera;
- conversão de posição simbólica em posição real.

## Estrutura

- `UnifiedFocusCard.tsx`: roteador do card de foco — decide entre asteroide/cometa (`kind: 'asteroid'`), nave (`objectType: 'spacecraft'`) e corpo celeste (`kind: 'body'`) e mantém o estado compartilhado (aba ativa, animação de entrada, fade ao trocar de objeto). As abas de cada objeto vêm do resolvedor puro `tabsForFocusObject` (`lib/radar/focusCardTabs.ts`), para cada tipo só mostrar o que faz sentido: asteroide/cometa têm Resumo · Perfil físico · Aproximação; **nave** tem Resumo · Missão · História (sem Aproximação nem Perfil físico, que ficariam vazios); corpo tem Resumo · Perfil físico · História. A aba História entra ao fim quando há lore.
- `AsteroidFocusCard.tsx`: card de asteroide/cometa (distância viva ou estimada por Kepler, perfil físico por tipo, fatos orbitais, ações de órbita/dossiê).
- `SpacecraftFocusCard.tsx`: card de nave/missão (Resumo · Missão · História, linha do tempo de marcos com selo de previsão).
- `BodyFocusCard.tsx`: card de corpo celeste (imagem real, fatos e narrativa de `bodyData.ts`).
- `FocusCardParts.tsx`: peças compartilhadas dos cards de foco — abas com semântica ARIA (`FocusTabBar`), linha rótulo/valor (`Row`), slot de preview ciente do sheet (`SheetAwarePreview`), classes do trilho desktop e os tipos de props/estado de abas.
- `BodyImagePreview.tsx`: preview de imagem real estática para corpos celestes; ocupa o mesmo espaço visual do `AsteroidModelPreview`. As imagens são servidas localmente (`/images/bodies/`), com `fit` (cover/contain) e `scale` calibrados por hierarquia de tamanho real — não buscam URLs externas.
- `AsteroidModelPreview.tsx`: preview 3D do asteroide em foco.
- `SpacecraftImagePreview.tsx`: preview de foto real da nave no card, no mesmo frame/estilo do `BodyImagePreview` (foto local em `/images/spacecraft/`, crédito NASA/JPL no canto). Foto por id sintético da nave; Voyager 1 e 2 usam artes distintas. Cai no `SpacecraftCardPreview` (ilustração SVG) quando não há foto cadastrada ou o arquivo falha — aprimoramento progressivo.
- `SpacecraftCardPreview.tsx`: ilustração SVG sóbria de uma sonda, usada como fallback do `SpacecraftImagePreview`.
- `bodyData.ts`: fatos científicos, textos de contexto e narrativas históricas dos corpos celestes — unificado a partir dos antigos `bodyInfoContent.ts` e `bodyHistory.ts`, que compartilhavam a mesma chave `BodyId` e eram sempre lidos juntos.
- `focusCardPresentation.ts`: textos, badges e status de apresentação usados pelo `UnifiedFocusCard`. Ícones são retornados como nomes semânticos (`'alert'`, `'zap'`, ...) e mapeados para componentes lucide no card; emojis não devem voltar a ser usados como ícone. `sizeComparison` vai de "uma pessoa" a escala de continente: até ~1 km usa um marco direto, na faixa de km usa múltiplos do Cristo Redentor mostrando o tamanho em km, e acima usa escala geográfica (cidade/país/continente). O Perfil físico do cometa é um bloco PRÓPRIO no `UnifiedFocusCard` (núcleo/órbita/excentricidade), não o de asteroide — vale tanto para o cometa famoso (dados do catálogo) quanto para o cometa comum do feed (núcleo de gelo irregular, sem o "diâmetro" esférico nem o campo de magnitude H de asteroide).
- `famousLore.ts`: texto da aba **História** dos objetos famosos (asteroides + cometas + naves), em PT e EN, indexado pelo id sintético. `famousLoreFor(id, locale)` devolve o parágrafo ou `null`; o card só mostra a aba História quando há lore (objetos comuns do feed seguem sem ela). Para as naves, a História traz fatos curiosos e pouco conhecidos (o que a sonda carrega, detalhes humanos), **sem repetir** o Resumo nem os marcos da Missão.
- `spacecraftData.ts`: conteúdo editorial das naves (Resumo + abertura da Missão + marcos), por id sintético `spacecraft:<horizonsId>`. As três abas da nave dividem o trabalho e **não se repetem**: `spacecraftContext` diz quem é a nave hoje e por que importa (Resumo); `spacecraftMissionIntro` abre a Missão com uma frase que dá sentido à linha do tempo; `spacecraftMilestones` traz os marcos (passado → futuro, `future: true` vira selo "previsão"). A História fica em `famousLore.ts`. Funções puras de consulta; texto curado bilíngue.
- `MobilePanelControls.tsx`: helpers de apresentação compartilhados (título da lista, mensagem de vazio).
- `RadarFloatingOverlays.tsx`: overlays flutuantes da cena 3D.
- `RadarNavigationPanel.tsx`: decide a moldura por viewport — painel lateral + flyout no desktop, bottom sheets (objetos e filtros) no mobile.
- `RadarNavigationMobileContent.tsx`: conteúdo do sheet de objetos mobile (referências, acordeão de planetas e lista).
- `RadarNavigationDesktopContent.tsx`: conteúdo desktop da navegação.
- `RadarNavigationObjectList.tsx`: lista visual de objetos e botão de atualização.
- `radarNavigationTypes.ts`: contratos compartilhados da navegação, incluindo `MobileSheetSection` (sheet mobile aberto: objetos/filtros/null).
- `PanelShell.tsx`: shell visual reutilizável para painéis. No mobile vira bottom sheet com arraste real e três estados (minimizado/meio/expandido); no desktop, card lateral.
- `MobileSheet.tsx`: bottom sheet genérico mobile (handle, arraste, snaps meio/expandido, fechamento por arraste ou X).
- `MobileFiltersSheetContent.tsx`: conteúdo do sheet de filtros mobile, com descrição de cada critério sempre visível.
- `bottomSheetSnap.ts`: geometria pura dos snaps dos sheets (alturas, snap mais próximo, dispensa, ciclo no toque). Testada em `tests/js/Radar/bottomSheetSnap.test.ts`.
- `useBottomSheetDrag.ts`: hook de arraste vertical dos sheets, consumindo `bottomSheetSnap.ts`.
- `SceneLegend.tsx`: legenda da cena (somente desktop; no mobile o guia abre pela `MobileActionBar` e o modal continua montado via portal).
- `panelFormatters.ts`: formatadores locais de datas e unidades exibidas nos painéis. `formatApproachDateTime` formata dia+mês+hora; `formatApproachDate` formata apenas a data.

## Padrão Desktop: Trilho Esquerdo

No desktop (lg:+), painel de navegação e card de foco formam um trilho único na esquerda: o card ancora logo abaixo do painel usando a mesma fórmula de altura (`min(20rem,40vh)`, 16rem em modo órbita) em `top`, com `max-height` até a base da cena e scroll interno quando faltar espaço (ver `desktopRailClasses` em `FocusCardParts.tsx`). Isso elimina a colisão painel/card e o corte do rodapé do card que existiam com posicionamento independente (`top-[30%]`). O painel é recolhível em pill (`PanelLeftClose`) para dar protagonismo total à cena; o estado vive em `DailyOrbitalRadar3D` porque o card precisa subir junto. O enquadramento de foco compensa o trilho via `Scene/usePanelBias` (biasX, união painel+card, aplicado só durante tweens).

Atenção: o shell dos cards não pode usar classes de translate para posicionar no desktop. A animação de entrada aplica `transform` inline, que sobrescreve qualquer `-translate-*` de classe (foi a causa original da colisão).

## Padrão Mobile: Bottom Sheets E Action Bar

No mobile (abaixo de lg:), a navegação abandona painéis flutuantes sobre a cena: a porta de entrada é a `Controls/MobileActionBar.tsx` (Objetos, Filtros, Guia) e cada superfície abre como bottom sheet. O card de foco (`PanelShell`) tem três estados com arraste; os sheets de navegação (`MobileSheet`) têm dois (meio/expandido) e fecham por arraste para baixo. A região de arraste é sempre handle + cabeçalho (com `touch-none`); o conteúdo rola livre, sem disputa entre gesto do sheet e scroll interno. A cena permanece visível e tocável acima do sheet — não há backdrop.

No estado meio aberto o card prioriza dados: o preview decorativo (modelo 3D/imagem) só aparece no estado expandido, via `SheetAwarePreview` (`FocusCardParts.tsx`), que lê o snap atual pelo contexto `usePanelSheetState` do `PanelShell`. Além de devolver as métricas ao primeiro olhar, isso evita um segundo contexto WebGL ativo enquanto o usuário só lê números. O valor do contexto é memoizado para o conteúdo não re-renderizar a cada frame de arraste.

## Remoção Do Caminho 2D E Consolidação De Cards

Os painéis `ObservatoryFocusPanel.tsx`, `ObservatoryDetailOverlay.tsx` e o card legado `MercuryCard.tsx` foram removidos junto com caminhos duplicados de UI. Os cards `BodyInfoCard.tsx` e `FocusCard.tsx` foram consolidados em `UnifiedFocusCard.tsx`, que usa `kind: 'asteroid'` ou `kind: 'body'` para alternar o conteúdo com o mesmo shell visual. Dentro de `kind: 'asteroid'`, a nave (`objectType: 'spacecraft'`) é roteada para o `SpacecraftFocusCard` em vez do `AsteroidFocusCard`, porque herdar as abas de rocha lhe dava Aproximação e Perfil físico vazios. Quando o arquivo unificado passou de mil linhas, os três cards foram extraídos para arquivos irmãos (`AsteroidFocusCard.tsx`, `SpacecraftFocusCard.tsx`, `BodyFocusCard.tsx`) com as peças comuns em `FocusCardParts.tsx`; o `UnifiedFocusCard.tsx` seguiu como roteador e dono do estado compartilhado.

## Card Unificado

O conjunto `UnifiedFocusCard` + cards de foco recebe dados já resolvidos e monta a leitura visual: nome, distância, velocidade, tamanho, risco de monitoramento, ações disponíveis e, para corpos celestes, imagem real, fatos físicos e história. O preview visual é delegado para `AsteroidModelPreview` (asteroides), `SpacecraftImagePreview` (naves) ou `BodyImagePreview` (corpos celestes).

As abas usam semântica ARIA de tablist (`FocusTabBar`): navegação por setas e Home/End, roving tabindex e painel `tabpanel` vinculado por `aria-labelledby`. A distância atual é a métrica principal do card: bloco próprio com rótulo em cima e valor em corpo maior embaixo (lado a lado não cabem na largura do card), arredondado via `approxKm` porque o dado muda ao vivo e precisão de 1 km seria falsa.

Helpers de texto e status devem ficar em arquivos locais de apresentação quando crescerem, sem calcular órbita, ranking ou fallback.

## Navegação

`RadarNavigationPanel.tsx` coordena a moldura visual e delega o conteúdo para componentes mobile, desktop e lista.

Filtros, referências, abertura de planetas, seleção de objetos, modo orbital e colapso devem preservar os contratos recebidos por props.

Os compartimentos de planetas (`planet-flyout`) e naves (`spacecraft-flyout`) só fecham por ação explícita: clicar de novo no botão "Planetas"/"Naves" (que alternam sozinhos) ou no botão de fechar do próprio flyout. Clicar na cena fora deles não os fecha (decisão de produto, revertida em jun/2026).

## Tutorial Interativo

Alguns painéis carregam marcadores `data-tutorial` consumidos pelo tutorial de primeira visita (`../Tutorial/`): `selected-card` (via prop `dataTutorial` do `PanelShell`), `card-tabs` (`FocusCardParts.tsx`), `orbit-button` e `object-list-toggle` (botão "Lista" do eyebrow mobile) nos cards de foco, `object-list` e `planet-flyout` no `RadarNavigationPanel` (desktop e sheet mobile), `radar-filter-criterion`/`radar-filter-limit` no `MobileFiltersSheetContent`, e `radar-guide` no `SceneLegend`. São atributos passivos, sem lógica: ao renomear ou mover esses elementos, atualize o contrato em `../Tutorial/README.md` e `radarTutorialSteps.ts`.

## Padrões Locais

- Todo arquivo de `Panels` deve iniciar com documentação em português explicando responsabilidade e fronteiras.
- Componentes de painel devem receber dados e callbacks por props; não devem acessar seleção global, câmera ou APIs diretamente.
- `radarNavigationTypes.ts` deve evitar contratos largos demais para subcomponentes. Conteúdos mobile/desktop devem receber apenas as props que realmente renderizam.
- Cards de corpos celestes devem passar por `UnifiedFocusCard.tsx` com `kind: 'body'`, usando `bodyData.ts` para os dados estáticos; evitar cards específicos por planeta.
- Helpers de texto, badges e formatação devem ficar em arquivos locais de apresentação, como `focusCardPresentation.ts` e `panelFormatters.ts`.

## Regra Para IA

Ao editar esta pasta, não mova cálculo orbital, ranking de aproximação, chamadas de API, fallback Horizons/CAD ou seleção global para componentes de painel. Painéis devem apenas renderizar e organizar dados já recebidos.
