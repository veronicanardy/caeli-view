# Dossie

Componentes de interface para listagens, dossiês e visualizações de pequenos corpos do Sistema Solar.

## Responsabilidade

Esta pasta transforma dados já carregados de pequenos corpos em UI: cards, tabelas, gráficos, diagramas, comparação de escala e estados vazios. Ela não deve buscar APIs, persistir filtros globais nem recalcular estatísticas de domínio que pertencem à página, ao backend ou a helpers dedicados.

## Arquivos

- `CloseApproachCard.tsx` e `CloseApproachTable.tsx`: visualizações de aproximações próximas.
- `SmallBodySummaryCards.tsx`, `AsteroidUsefulSummary.tsx`, `PhysicalDataVisualCards.tsx` e `OrbitalElementsVisualGrid.tsx`: leitura resumida e científica do dossiê.
- `ApproachOverviewCharts.tsx`, `ApproachVisualMap.tsx`, `SimplifiedApproachDiagram.tsx` e `InteractiveApproachTimeline.tsx`: visualizações agregadas ou didáticas de aproximações.
- `AsteroidScaleComparison.tsx`, `Asteroid3DPrototype.tsx`, `comparisonObjects.ts` e `scaleUtils.ts`: comparação visual de escala e protótipos didáticos.
- `ApproachDistanceScale.tsx`, `LunarDistanceCard.tsx`, `ObjectDistanceComparison.tsx`, `VelocityIndicator.tsx`, `ObjectTypeBadge.tsx`, `ScientificTooltip.tsx` e `EmptyScientificData.tsx`: componentes auxiliares reutilizáveis da pasta.

## Padrões Locais

- Todo arquivo deve começar com documentação em português explicando sua responsabilidade.
- Componentes recebem dados por props e não fazem chamadas HTTP.
- Dados científicos ausentes devem usar `EmptyScientificData.tsx` ou fallback textual claro.
- Comparações de escala devem manter cálculo auxiliar em `scaleUtils.ts` e dados estáticos em `comparisonObjects.ts`.
- Visualizações 3D/procedurais devem continuar isoladas nos seus componentes e sempre limpar recursos de WebGL no `cleanup`.
- Quando um componente começar a acumular regra de domínio, mova a regra para helper local antes de expandir JSX.
