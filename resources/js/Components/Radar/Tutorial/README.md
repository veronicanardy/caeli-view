# Tutorial

Tutorial interativo de primeira visita do Radar, em estilo de onboarding de jogo: passos curtos, destaque visual do elemento real e avanço condicionado à ação do usuário.

## Responsabilidade da pasta

`Tutorial` cuida de:

- decidir quando o tutorial abre sozinho (primeira visita, via localStorage versionado);
- manter a máquina de estados dos passos e suas condições de avanço;
- desenhar spotlight, tooltip e mini teclado sobre a interface, sem bloqueá-la;
- detectar as ações esperadas (cliques, troca de filtros, seleção, teclado, gestos).

`Tutorial` não deve cuidar de:

- câmera, seleção global ou qualquer estado da cena 3D (apenas observa);
- dados científicos, ranking ou trajetórias;
- renderização dentro do Canvas (o overlay é DOM puro em portal).

## Arquitetura

Duas fontes de detecção de ação, nenhuma delas invade a cena:

1. **Observação de props**: critério, limite e seleção vivem na página (`Pages/Radar/Index.tsx`), que já passa esses valores ao provider. O provider compara o valor anterior com o atual e avança o passo correspondente.
2. **Listeners DOM**: cliques nos alvos `data-tutorial`, teclas W/A/S/D/setas e gestos (drag, wheel, pinça) sobre o contêiner do canvas são capturados pelo overlay em fase de captura/passiva, sem `preventDefault`, então a interface real continua recebendo tudo.

O overlay inteiro é `pointer-events: none` (exceto o card do tooltip): o tutorial nunca tranca a interface. O escurecimento vem de um único `box-shadow` gigante no spotlight.

**Dados reais (céu de agora)**: a página também passa `liveFacts` ao provider (nome e métrica da rocha no topo da lista, conforme o critério ativo, montados por `tutorialLiveFactsFromTopObject`). Eles preenchem placeholders `{rockName}`/`{rockMetric}` em passos personalizados (hoje, a seleção). Vêm por props, nunca da cena 3D direta: o tutorial segue desacoplado.

## Estrutura

- `radarTutorialSteps.ts`: sequência de passos, textos PT/EN e condições de avanço como dados puros. Helpers `stepsForViewport`, `indexAfterGroup`, `stepCopy` e `stepSide` são funções puras testadas. Também: `fillLiveFacts`/`TutorialLiveFacts` (preenche os placeholders `{rockName}`/`{rockMetric}` com o céu real de agora, com fallback neutro quando o dado falta) e `tutorialChapterLabel` (agrupa os passos em capítulos nomeados, ex.: Câmera, O objeto, A viagem, para o progresso ter sabor em vez de um "N/M" seco).
- `radarTutorialStorage.ts`: persistência versionada em localStorage (`caeliview.radar.tutorial`). `shouldAutoStartTutorial` e `parseStoredTutorialState` são puros e testados. Ao concluir/pular, silencia os toasts legados de boas-vindas.
- `radarTutorialGeometry.ts`: posicionamento puro de tooltip e spotlight (`placeTooltip`, `inflateRect`), testado em Node.
- `radarTutorialDom.ts`: resolução de alvos visíveis (`findVisibleTarget`) e medição de retângulos. Alvos duplicados no DOM (desktop/mobile) são filtrados por visibilidade real. Também expõe `programmaticTutorialClick`/`isProgrammaticTutorialClick`: o único clique que o tutorial sintetiza (resetar a vista ao entrar num passo) é marcado por aqui, e as detecções de avanço (listener do overlay e `completeStep` da página) ignoram esse clique para que ele nunca seja lido como ação do usuário.
- `RadarTutorialContext.ts`: contexto + `useRadarTutorialOptional` (null fora do provider), para consumidores leves como o toast e o modal do guia.
- `RadarTutorialProvider.tsx`: máquina de estados, auto-início, observadores de props, ESC e persistência do desfecho. Expõe `completionNonce`, um pulso que incrementa só quando o tutorial é CONCLUÍDO (não pulado); a cena (`DailyOrbitalRadar3D`) observa para garantir o guia FECHADO no fim, deixando a tela limpa.
- `RadarTutorialOverlay.tsx`: portal com spotlight + tooltip, acompanhamento do retângulo do alvo (resize/scroll com rAF + poll de 400 ms) e hooks de avanço (clique com `requiredClicks`, teclado completo, zoom em duas fases, rotação acumulada, reset de vista ao entrar no passo).
- `TutorialSpotlight.tsx`: moldura iluminada + backdrop para passos centralizados.
- `TutorialTooltip.tsx`: card do passo (capítulo nomeado + barra de progresso fina, título, corpo com chips [[...]] e dados reais via `liveFacts`, ações, extras visuais). Único trecho clicável do overlay.
- `TutorialKeyboardHint.tsx`: mini teclado WASD/setas; teclas pressionadas ficam acesas para sempre, marcando o progresso.
- `TutorialGestureMeters.tsx`: medidor de zoom (duas barrinhas verticais sequenciais) e arco de rotação.
- `TutorialGestureExtras.tsx`: escolhe o apoio visual do passo atual a partir do progresso calculado pelo overlay.

## Contrato `data-tutorial`

Seletores estáveis espalhados pelos componentes do Radar. Se renomear ou mover um destes, atualize `radarTutorialSteps.ts`:

Vários alvos existem em duas versões (desktop e mobile); `findVisibleTarget` resolve pela que está visível.

| Atributo | Onde |
| --- | --- |
| `radar-canvas` | contêiner do canvas (`DailyOrbitalRadar3D`); também expõe `data-fullscreen="true"` em tela cheia |
| `radar-filters` | barra de filtros desktop (`CompactConsoleBar`) e botão Filtros da `MobileActionBar` |
| `radar-filter-criterion` | grupo de critério (`RadarObjectControls` desktop e `MobileFiltersSheetContent` mobile) |
| `radar-filter-limit` | grupo de limite 5/15/30 (`RadarObjectControls` desktop e `MobileFiltersSheetContent` mobile) |
| `reference-controls` | cluster de atalhos Sol/Terra/Lua/Planetas (`ReferenceControls`) |
| `reference-body` | botões Sol, Terra e Lua individualmente (`ReferenceControls`) |
| `reference-planets` | botão Planetas (`ReferenceControls`) |
| `planet-flyout` | flyout desktop ou acordeão mobile com a lista de planetas (`RadarNavigationPanel`/`RadarNavigationMobileContent`) |
| `planet-option` | cada planeta dentro do flyout (`ReferenceControls`/`PlanetFlyout`) |
| `object-list` | painel lateral desktop ou sheet de objetos mobile (`RadarNavigationPanel`) |
| `object-list-toggle` | botão Objetos da `MobileActionBar` e botão "Lista" do eyebrow do card (`UnifiedFocusCard`) |
| `selected-rock-list-item` | item da rocha SELECIONADA na lista (`RadarSceneObjectListItem`); usado no multi-spotlight de "voltar pra perto" |
| `selected-rock-label` | label da rocha SELECIONADA na cena 3D (`AsteroidMarker` → `ResolvedScreenLabel`); usado no mesmo passo |
| `selected-card` | card do objeto selecionado (`UnifiedFocusCard` → `PanelShell`) |
| `card-tabs` | tablist do card (`UnifiedFocusCard`) |
| `orbit-button` | botão Ver órbita / Voltar ao corpo (rótulo "asteroide" ou "cometa" conforme `objectType`) (`UnifiedFocusCard`) |
| `camera-controls` | contêiner da toolbar da cena (`SceneToolbar`), reservado |
| `toggle-labels` | botão de ocultar/mostrar marcações (`SceneToolbar`) |
| `toggle-fullscreen` | botão de tela cheia (`SceneToolbar`) |
| `reset-view` | botão de resetar vista (`SceneToolbar`) |
| `radar-guide` | botão do guia (`SceneLegend` no desktop, `MobileActionBar` no mobile) |

## Fluxo dos passos

1. boas-vindas → 2. cena (Terra, Lua, rochas e etiquetas; tooltip no topo) → 3. teclado (desktop; exige TODAS as teclas WASD + setas, que ficam acesas para sempre; avança logo após a última) → 4. zoom em duas fases (aproximar e depois afastar, gesto longo, com medidor de barrinhas verticais) → 5. rotação (arraste com botão esquerdo ou um dedo, gesto longo, com medidor em arco; o texto também ensina que o botão direito desloca a cena) → 6. critério (chips imitando os botões; ao trocar, o escuro sai e o avanço espera o radar terminar de carregar) → 7. limite (idem) → 8. seleção (ao entrar, o tutorial reseta a vista para o ponto de partida; impõe a PRIMEIRA rocha da lista, a mais próxima: as demais ficam bloqueadas pelo gate, na lista e na cena; espera a câmera chegar no asteroide) → 9. apresentação da rocha na cena (`meet-rock`: a câmera acabou de chegar nela; cena iluminada via `keepSceneBright`, furo do spotlight no canvas, para ver o objeto real grande ANTES de o card escurecer tudo; usa `{rockName}`) → 10. leitura do card e abas (Resumo, Perfil físico e Aproximação, com passos de explicação entre os cliques) → 10. afastar para ver a trajetória (lupa) e explicação do caminho, depois voltar pra perto clicando na rocha/label outra vez (`reselect-object`: re-selecionar reaproxima a câmera, exige o clique; o spotlight destaca o item da rocha na lista de navegação, com a label na cena como fallback) → 11. ver órbita (clique) → 12. explicação da órbita (tooltip no topo; sem mencionar a Terra, que não aparece nesse modo) → 13. voltar ao corpo (clique; o botão diz "asteroide" ou "cometa" conforme o objeto) → 14. referências Sol/Terra/Lua com passo de chegada (ao clicar, o escuro sai e a câmera viaja antes de avançar; a chegada usa `keepSceneBright` para contemplar o corpo na cena, igual ao `meet-rock`) → 15. planetas com passo de chegada (clicar em Planetas e escolher um da lista; chegada também com cena iluminada; o texto da chegada cita as Naves na linha de baixo das Referências, contando que dá para visitar sondas reais do mesmo jeito) → 16. resetar vista (clique; o escuro sai para ver a câmera voltar) → 17. dica de clicar direto na cena (nomes flutuantes e rochas; só "Entendi") → 18. ocultar marcações (clique; escuro sai) → 19. contemplação da cena limpa (alvo é a cena inteira, então o furo do spotlight deixa o céu visível; "Entendi") → 20. trazer os nomes de volta (clique) → 21. entrar em tela cheia (clique; escuro sai) → 22. contemplação da tela cheia (mesmo truque; "Entendi") → 23. sair da tela cheia (clique) → 24. guia (clique; cita o botão Rever tutorial) → 25. convite à leitura do guia → 26. final.

No mobile, os alvos resolvem para a interface de sheets: a lista de objetos, os filtros e o guia abrem pela `MobileActionBar`; com o card aberto, o caminho para a lista é o botão "Lista" do próprio card (mesmo `object-list-toggle`). Os passos com alvo no rodapé usam `sideMobile: 'top'`.

O mapeamento de mouse ensinado segue os OrbitControls reais da cena (padrão three.js, sem remap): esquerdo arrasta = rotacionar, direito arrasta = pan, scroll = zoom.

`settling`: quando a ação do passo já foi feita mas o resultado ainda está acontecendo (câmera viajando, radar carregando), o provider liga `settling` e o overlay remove o escurecimento para o usuário ver a cena. O escuro volta no passo seguinte.

Regras de robustez:

- passos `optional` somem sozinhos quando o alvo não existe (ex.: órbita sem época de periélio pula o grupo `orbit` inteiro);
- passos que dependem do card voltam ao passo de seleção se a seleção sumir;
- todo passo de ação tem o link discreto "Pular passo": o usuário nunca fica preso. "Pular passo" EXECUTA a ação esperada por baixo (clica a aba, abre a órbita) e avança UM passo, via `manualSkipClickSelectors` + clique programático. Assim a imagem que o texto descreve sempre acontece, em vez de a pessoa pular vários passos sem ver nada e perder a conexão imagem-texto. Sem clique determinístico (gestos de câmera, troca de filtro), "Pular passo" só avança um passo. EXCEÇÃO: no passo de SELEÇÃO, "Pular passo" salta o BLOCO do objeto inteiro (card, abas, trajetória, órbita) via `skipUnavailableStep`, em vez de selecionar a rocha; selecionar só prenderia a pessoa no bloco que ela quis pular (e a seleção assíncrona causava loop de volta à seleção). O salto de bloco também cobre o caso automático de alvo indisponível;
- o passo só avança por uma ação NOVA e válida do usuário no passo atual, nunca por estado herdado. As contemplações (`labels-view`, `fullscreen-view`) deixam a cena como está (sem nomes / em tela cheia); religar os nomes e sair da tela cheia são os passos SEGUINTES, feitos pelo usuário. O tutorial não restaura essa cena com um clique sintético, justamente para não satisfazer sozinho a condição do passo de restauração;
- ESC ou "Pular tutorial" encerram e persistem como pulado. ESC não encerra com o guia aberto (lá ESC fecha o guia) nem em tela cheia (lá ESC sai do fullscreen, sinalizado por `data-fullscreen` no contêiner do canvas).

Bloqueio do "usuário curioso": o overlay é `pointer-events: none`, então o clique físico chega na cena. O bloqueio NÃO é por região, é por AÇÃO. Toda ação real do radar (selecionar objeto na lista E na cena 3D, focar Sol/Terra/Lua/planeta, órbita, reset, labels, fullscreen, card, guia, filtros) passa por `runTutorialAction` no orquestrador (`DailyOrbitalRadar3D`), que checa `isActionAllowed(passo, ação)` ANTES de executar: ação não permitida não acontece, não é só "não avança". Os botões fora do passo ainda ficam `disabled`. O invariante `tests/js/Radar/Invariants/tutorialActionGate.test.ts` trava isso lendo o fonte do orquestrador: falha se um handler cru de seleção/foco (`selectObject`/`focusBody`/`focusSun`/`focusPlanet`) vazar direto numa prop de filho sem o wrapper gated. Exceção consciente: os gestos de câmera (rotação, zoom, teclado WASD) ficam sempre livres, porque a câmera nunca trava.

## Persistência e reabertura

- Chave: `caeliview.radar.tutorial` com `{ status, version, updatedAt }`.
- Concluído ou pulado: não abre mais sozinho. Versão antiga no registro: abre de novo uma vez (`RADAR_TUTORIAL_VERSION`).
- Reabertura manual: botão "Rever tutorial" no header do Guia do Radar (`MapManualModal`).
- Testar do zero no console: `localStorage.removeItem('caeliview.radar.tutorial')` e recarregar.

## Performance

- Nada roda por frame; sem Canvas extra, sem blur no overlay.
- Retângulo do alvo: resize/scroll com throttle por rAF + poll leve de 400 ms; setState só em mudança real (tolerância de 1px).
- Tooltip reposiciona apenas em mudança de passo ou de retângulo.

## Regra para IA

Ao editar esta pasta, mantenha toda a lógica de posição testável em `radarTutorialGeometry.ts` (puro), os textos em `radarTutorialSteps.ts` (sem travessão) e não acople o tutorial à cena 3D: detecção é por props da página ou DOM, nunca por hooks da cena.
