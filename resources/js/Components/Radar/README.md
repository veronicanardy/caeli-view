# Radar

Pasta-mãe do radar 3D de aproximações. Os READMEs de cada subpasta (`Overlays/`, `Scene/`,
`Panels/`, `Bodies/`) detalham suas responsabilidades. Este arquivo documenta duas regras
TRANSVERSAIS, que cruzam várias pastas e são fáceis de quebrar sem querer ao mexer numa só.

## Regra de visibilidade dos rótulos (labels)

**Quem decide se um label aparece ou some é o resolvedor puro `resolveRadarLabels`**, não cada
componente. A regra foi decidida pela Verônica e está travada por teste. Princípio geral: **é
aparecer ou sumir na âncora, nunca reposicionar.**

- **Primários nunca somem por colisão.** Sol, planetas e a rocha SELECIONADA (e hover) só somem
  quando um corpo 3D real cobre forte o disco deles (oclusão geométrica de verdade, não encostar
  na borda). Não cedem para label nenhum, nem para UI, nem para cap de zoom.
- **A Terra é a referência soberana.** Quando Sol, Lua ou planeta colidem com a label da Terra já
  aceita, ELES somem e a Terra fica. A **Lua também cede à Terra** (decisão explícita), mesmo
  vivendo colada nela.
- **Rochas comuns somem por densidade local, não por cap global de zoom.** Uma rocha só some
  quando vira parte de uma pilha (vizinhos-rocha sobrepostos acima de `ASTEROID_CROWDING_LIMIT`).
  Rocha isolada continua visível mesmo no zoom out. NÃO reintroduzir um corte global por distância
  (o antigo `useHideAsteroidLabelsMode` foi removido de propósito).
- **Rocha não selecionada cede para qualquer primário na colisão** (`collidesWithAcceptedPrimary`):
  se a label de uma rocha colide com a de um Sol/Terra/Lua/planeta/selecionado já aceito, a rocha
  some e o primário fica. A rocha SELECIONADA não cede (vira `kind: 'selected'`, é primária).
- **Visual de seleção unificado**: o destaque (borda ciano + glow) do `ResolvedScreenLabel` dispara
  com `emphasized || selected || hovered`. Qualquer corpo selecionado (Terra, Sol, Lua, planeta,
  rocha) acende igual. Não voltar a depender de cada componente passar `emphasized`.
- **Z-index por importância** (`labelZIndexRange`), em faixas que não se sobrepõem:
  selecionado/hover > Terra > demais primários (Sol/Lua/planeta) > rochas. Sem isso a ordem de
  empilhamento dependeria da profundidade na cena e uma rocha perto da câmera cobriria a Terra.

Arquivos dessa regra:

| Arquivo | Papel |
|---|---|
| `resources/js/lib/radar/radarLabels.ts` | Núcleo puro: prioridade, colisão, Terra soberana (`yieldsToEarth`, `collidesWithAcceptedEarth`), densidade local (`countCrowdingNeighbors`, `ASTEROID_CROWDING_LIMIT`), z-index (`labelZIndexRange`). Sem React/DOM/three. |
| `tests/js/Radar/radarLabels.test.ts` | Trava todas as regras acima. Editar junto ao núcleo. |
| `Overlays/SceneLabels.tsx` | Camada React: projeta cada label por frame, alimenta `resolveRadarLabels` e aplica o resultado (`ResolvedScreenLabel`, `labelZIndexRange`). Também faz oclusão por foco/zona proibida. |
| `Scene/sceneOcclusion.ts` | Monta os oclusores 3D (discos do Sol/Terra/Lua/planetas) consumidos como `objectBounds`. |
| `Scene/sceneFocus.ts` | `shouldShowLabelForObject`: portão grosso (toggle global + modo órbita). NÃO corta por zoom — o amontoamento é do resolvedor. |
| `Bodies/*/*.tsx` | Cada corpo monta seu `ResolvedScreenLabel` com o `labelKind` certo (`sun`/`earth`/`moon`/`planet`/`asteroid`). |

Afinação rápida: o ponto do "amontoar" das rochas é um número só, `ASTEROID_CROWDING_LIMIT` em
`radarLabels.ts`.

## Layout da página do radar: sem scroll

A tela do radar **nunca rola** (decisão da Verônica). O radar 3D ocupa toda a altura abaixo do
header.

- `AppLayout` tem a prop `hideFooter`. Quando ligada, o container vira `h-[100dvh] overflow-hidden`
  (em vez de `min-h-screen`) e o footer global de transparência some.
- `Pages/Radar/Index.tsx` passa `hideFooter` e organiza a página como coluna flex; o
  `DailyOrbitalRadar3D` preenche o resto via `flex-1 min-h-0` (sem altura fixa por `calc`).
- A **transparência** (afiliação NASA/JPL, fontes, limites) saiu do footer e vive dentro do Guia do
  radar, na aba "Dados e métodos" (`Controls/Manual/TechnicalManual.tsx` → `TransparencyNote`). O
  copy é compartilhado em `resources/js/lib/transparencyCopy.ts` (mesma fonte do footer das demais
  páginas).
- A faixa `RadarDataQualityCard` foi removida; o módulo `lib/radarData.ts` que só a alimentava
  também. Não reintroduzir sem necessidade.
