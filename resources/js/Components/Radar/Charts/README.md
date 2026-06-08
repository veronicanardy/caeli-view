# Charts

Esta pasta concentra apenas os componentes visuais de gráficos e linha do tempo do `Radar`.

Ela não deve calcular efemérides, ranking global, seleção de objetos, reconciliação de dados de CAD/SBDB/Horizons nem lógica pesada de domínio. Essas decisões e transformações devem continuar nas camadas de `lib`, formatadores e helpers específicos do observatório.

## Responsabilidades

* `ApproachCharts`: painel estatístico com gráficos de barras e rosca para leitura rápida do período atual.
* `ApproachTimeline`: linha do tempo interativa das aproximações por dia, com expansão local, resumo diário e destaque para próxima aproximação, hoje e pico do período.
* `VelocityIndicator`: barra visual simples para velocidade relativa, com regra defensiva de percentual e piso visual mínimo para velocidades positivas.

## Fronteiras de dados

Os componentes desta pasta devem receber dados já preparados para apresentação.

Exemplos:

* agrupamento por dia, resumo diário e recortes temporais devem vir de helpers como `groupApproachesByDay` e `buildDailySummary`;
* identidade do objeto deve vir de helpers como `resolveApproachIdentity`;
* formatação de quilômetros, distâncias lunares e números deve continuar em `lib/format`;
* listas como `charts.byDay`, `charts.byType`, `charts.closest` e `charts.fastest` devem chegar prontas para consumo do Recharts.

Se uma transformação começar a representar regra de domínio, interpretação de aproximação ou consolidação reutilizável, ela não deve nascer aqui.

## O que pode ficar aqui

Pode ficar nesta pasta:

* composição visual de gráficos com `Recharts`;
* estados locais de interface, como expandir/recolher dias da timeline;
* pequenos cálculos puramente visuais e defensivos, como `velocityPercent`;
* helpers internos de leitura local do componente, desde que não virem regra de domínio;
* marcações semânticas e detalhes de acessibilidade ligados à apresentação.

## O que não deve ficar aqui

Não deve ficar nesta pasta:

* cálculo orbital, efemérides ou geometria astronômica;
* ranking global ou seleção centralizada de objeto;
* busca, reconciliação ou priorização de dados de Horizons, SBDB ou CAD;
* parsing pesado de datasets;
* decisões compartilhadas de negócio que outras telas também usem.

## Convenções

* Mudanças devem ser cirúrgicas: priorizar legibilidade, segurança e manutenção local.
* Não trocar a biblioteca de gráficos sem uma decisão arquitetural explícita.
* Não redesenhar a UI desta pasta em refatorações pequenas.
* Comentários e documentação devem permanecer em português.
* Identificadores técnicos podem permanecer em inglês.

## Recharts

`ApproachCharts` usa `Recharts` apenas como camada de apresentação.

Por isso, esta pasta não deve acoplar regras de negócio à configuração de `BarChart`, `PieChart`, `Tooltip`, eixos ou células de cor. Quando um dado precisar de validação, ordenação, agregação ou normalização reutilizável, isso deve acontecer antes de chegar ao componente.

## Timeline

`ApproachTimeline` pode manter estado local de expansão porque isso é comportamento estritamente visual da própria lista.

Mesmo assim, o agrupamento, a sumarização diária e a interpretação da aproximação não devem ser reimplementados ali. A timeline deve consumir essas estruturas já prontas e apenas decidir como exibi-las.

## Indicador de velocidade

`VelocityIndicator` é um componente visual pequeno, mas tem uma regra defensiva importante: evitar `NaN`, `Infinity`, percentuais negativos e barras invisíveis para valores positivos muito baixos.

Essa regra fica encapsulada em `velocityPercent`, porque ela é pura, pequena e vale teste unitário direto sem montar React.

## Testes relacionados

Os testes desta pasta devem continuar enxutos e focados em comportamento puro.

Hoje, o principal contrato unitário associado a `Charts` é:

* `tests/js/Radar/velocityIndicator.test.ts`: protege o helper `velocityPercent` contra entradas inválidas e regressões no percentual visual.

Não é objetivo desta pasta testar visual de `Recharts`, SVG, tooltip, snapshot, canvas ou montagem completa dos componentes para validar regras simples de apresentação.