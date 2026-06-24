# Instruções Do Projeto

Este repositório é compartilhado por agentes (Claude e Codex). As convenções comuns ficam
em `.agents/`, fonte única para todos.

Antes de trabalhar, leia `.agents/MEMORY.md` (preferências e decisões duráveis do projeto).
Esse arquivo não é versionado: peça acesso à mantenedora se ele não estiver presente.

Ao trabalhar no radar, leia também a skill em `.agents/skills/radar/SKILL.md`.

Trate registros com datas, branches, contagens de testes e estados de implementação como
contexto histórico. Confirme o estado atual no código e no Git antes de agir.

## Texto e estilo do produto

Valem em todo texto visível e em toda mudança visual, não só no radar. O detalhamento e o porquê
de cada uma estão em `.agents/MEMORY.md`.

- Nunca usar travessão em texto do produto; reescrever com ponto ou vírgula.
- Texto sempre por extenso e claro: não abreviar "distância", "aproximação", "posição",
  "mínima". `DL` e `UA` são unidades legítimas.
- Comparações concretas, nomeadas e honestas: marco real com medida, sem "quase", "como",
  "maior". Nunca inventar número.
- Dicas sempre pelo componente `Tooltip` do projeto, nunca pelo atributo `title` nativo.
- Visual sóbrio e incremental. Mudança visual não fecha só com build e testes verdes: peça
  screenshot ou inspeção no navegador antes de considerar o ajuste concluído.

## Manutenção

Se uma decisão durável mudar, atualize `.agents/MEMORY.md`. Se a mudança for específica do
radar, atualize a skill em `.agents/skills/radar/SKILL.md`, fonte compartilhada por Claude e
Codex.
