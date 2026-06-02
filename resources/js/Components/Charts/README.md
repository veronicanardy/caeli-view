# Charts

Componentes de gráficos usados nas páginas principais do projeto.

## Responsabilidade

Esta pasta concentra visualizações pequenas baseadas em `recharts`. Os componentes recebem dados já agregados das páginas e apenas cuidam de apresentação.

## Arquivos

- `AsteroidsByDayChart.tsx`: gráfico de barras com a quantidade de asteroides por dia.
- `HazardChart.tsx`: gráfico de pizza com a distribuição de risco.
- `TopAsteroidsChart.tsx`: gráfico de barras com os maiores asteroides estimados.
- `chartTheme.ts`: constantes visuais compartilhadas entre cards, tooltips, eixos e cores.

## Padrões Locais

- Todo arquivo deve começar com documentação em português explicando a responsabilidade.
- Dados devem chegar prontos por props; esta pasta não deve buscar API nem calcular estatísticas globais.
- Estilos repetidos de Recharts devem ficar em `chartTheme.ts`.
- Transformações pequenas e locais para rótulo visual podem ficar dentro do componente, como encurtar nomes longos no eixo X.
- Se um gráfico começar a precisar de regra de domínio mais pesada, essa regra deve sair do componente e ficar na página ou em um presenter/helper dedicado.
