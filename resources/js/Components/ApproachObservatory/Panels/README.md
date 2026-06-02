# Panels

## Responsabilidade

`Panels` contém painéis, cards, overlays laterais e controles visuais usados pelo `ApproachObservatory`.

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

- `BodyInfoCard.tsx`: renderiza o card informativo de Sol, Terra, Lua e planetas.
- `bodyInfoContent.ts`: textos e fatos estáticos exibidos pelo `BodyInfoCard`.
- `FocusCard.tsx`: card compacto do objeto em foco no radar 3D.
- `FocusObject.tsx`: conteúdo principal do objeto selecionado.
- `focusCardPresentation.ts`: textos, badges e status de apresentação do `FocusCard`.
- `MobilePanelControls.tsx`: controles de navegação mobile.
- `RadarDataQualityCard.tsx`: resumo visual de qualidade dos dados.
- `RadarFloatingOverlays.tsx`: overlays flutuantes da cena 3D.
- `RadarNavigationPanel.tsx`: moldura, colapso e flyout lateral da navegação do radar 3D.
- `RadarNavigationMobileContent.tsx`: conteúdo mobile da navegação.
- `RadarNavigationDesktopContent.tsx`: conteúdo desktop da navegação.
- `RadarNavigationObjectList.tsx`: lista visual de objetos e botão de atualização.
- `radarNavigationTypes.ts`: contratos compartilhados da navegação, separando props do painel principal das props realmente usadas por conteúdos mobile/desktop.
- `PanelShell.tsx`: shell visual reutilizável para painéis.
- `SceneLegend.tsx`: legenda da cena.
- `TechnicalDataPanel.tsx`: painel técnico expansível.
- `panelFormatters.ts`: formatadores locais de datas e unidades exibidas nos painéis.

## Remoção Do Caminho 2D

Os painéis `ObservatoryFocusPanel.tsx`, `ObservatoryDetailOverlay.tsx` e o card legado `MercuryCard.tsx` foram removidos junto com caminhos duplicados de UI. O foco visual agora passa pelo `FocusCard`, `FocusObject`, `BodyInfoCard`, `RadarFloatingOverlays` e pela navegação do radar 3D.

## Cards De Foco

`FocusCard.tsx` e `FocusObject.tsx` recebem dados já resolvidos e apenas montam a leitura visual: nome, distância, velocidade, tamanho, risco de monitoramento e ações disponíveis.

Helpers de texto e status devem ficar em arquivos locais de apresentação quando crescerem, sem calcular órbita, ranking ou fallback.

## Navegação

`RadarNavigationPanel.tsx` coordena a moldura visual e delega o conteúdo para componentes mobile, desktop e lista.

Filtros, referências, abertura de planetas, seleção de objetos, modo orbital e colapso devem preservar os contratos recebidos por props.

## Padrões Locais

- Todo arquivo de `Panels` deve iniciar com documentação em português explicando responsabilidade e fronteiras.
- Componentes de painel devem receber dados e callbacks por props; não devem acessar seleção global, câmera ou APIs diretamente.
- `radarNavigationTypes.ts` deve evitar contratos largos demais para subcomponentes. Conteúdos mobile/desktop devem receber apenas as props que realmente renderizam.
- Cards de corpos celestes devem passar por `BodyInfoCard.tsx` e `bodyInfoContent.ts`, evitando cards específicos duplicados por planeta.
- Helpers de texto, badges e formatação devem ficar em arquivos locais de apresentação, como `focusCardPresentation.ts` e `panelFormatters.ts`.

## Regra Para IA

Ao editar esta pasta, não mova cálculo orbital, ranking de aproximação, chamadas de API, fallback Horizons/CAD ou seleção global para componentes de painel. Painéis devem apenas renderizar e organizar dados já recebidos.
