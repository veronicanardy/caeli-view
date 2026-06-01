# Panels

## Responsabilidade

`Panels` contém painéis, cards, overlays laterais e controles visuais usados pelo `ApproachObservatory`.

Esta pasta deve renderizar e organizar dados já recebidos pelas camadas de radar, trajetória, seleção e interpretação.

## O que pode conter

- Cards de foco e cards informativos de corpos celestes.
- Painéis de navegação desktop/mobile.
- Overlays laterais de detalhe, escala e trajetória.
- Mensagens de disponibilidade, qualidade e origem dos dados.
- Helpers locais de apresentação, textos, badges e formatação simples.

## O que não deve conter

- Chamadas de API externas.
- Cálculo orbital, efemérides ou trajetórias reais.
- Ranking global de aproximações.
- Fallback Horizons/CAD.
- Alteração direta de seleção global, foco global ou modo de câmera.
- Conversão de posição simbólica em posição real.

## Estrutura

- `BodyInfoCard.tsx`: renderiza o card informativo de Sol, Terra, Lua e planetas.
- `bodyInfoContent.ts`: textos e fatos estáticos exibidos pelo `BodyInfoCard`.
- `FocusCard.tsx`: card compacto do objeto em foco no radar.
- `focusCardPresentation.ts`: textos, badges e status de apresentação do `FocusCard`.
- `RadarNavigationPanel.tsx`: moldura, colapso e flyout lateral da navegação do radar.
- `RadarNavigationMobileContent.tsx`: conteúdo mobile da navegação.
- `RadarNavigationDesktopContent.tsx`: conteúdo desktop da navegação.
- `RadarNavigationObjectList.tsx`: lista visual de objetos e botão de atualização.
- `radarNavigationTypes.ts`: contratos compartilhados pelos subcomponentes de navegação.
- `panelFormatters.ts`: formatadores locais de datas e unidades exibidas nos painéis.

## Cards de foco

`FocusCard.tsx` e `FocusObject.tsx` recebem dados já resolvidos e apenas montam a leitura visual: nome, distância, velocidade, tamanho, risco de monitoramento e ações disponíveis.

Helpers de texto e status devem ficar em arquivos locais de apresentação quando crescerem, sem calcular órbita, ranking ou fallback.

## Navegação

`RadarNavigationPanel.tsx` coordena a moldura visual e delega o conteúdo para componentes mobile, desktop e lista.

Filtros, referências, abertura de planetas, seleção de objetos, modo orbital e colapso devem preservar os contratos recebidos por props.

## Dados técnicos e qualidade

`TechnicalDataPanel.tsx`, `RadarDataQualityCard.tsx`, `ObservatoryDetailOverlay.tsx` e `ObservatoryFocusPanel.tsx` exibem dados técnicos, qualidade de fonte, escala e trajetória quando esses dados já foram preparados fora da pasta.

Formatadores simples podem ficar em `panelFormatters.ts` quando forem estritamente de apresentação.

## Regras para IA/refatoração

- Refatore de forma moderada e local.
- Preserve textos exibidos, classes visuais e comportamento interativo sempre que possível.
- Use `import type` para símbolos usados apenas como tipo.
- Prefira arquivos auxiliares pequenos e claros quando um componente acumular helpers de apresentação.
- Não crie abstrações genéricas sem necessidade real.
- Não adicione dependências novas para resolver problemas de organização.

## Regra para IA

Ao editar esta pasta, não mova cálculo orbital, ranking de aproximação,
chamadas de API, fallback Horizons/CAD ou seleção global para componentes
de painel. Painéis devem apenas renderizar e organizar dados já recebidos.
