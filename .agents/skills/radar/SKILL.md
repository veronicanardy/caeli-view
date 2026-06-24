---
name: radar
description: Especialista no radar 3D de aproximações (Components/Radar e lib/radar). Use ao mexer em qualquer parte do radar (cena 3D, labels, corpos celestes, trajetória, painéis, listas, tutorial, escala simbólica, dados Horizons/CAD). Carrega as convenções, armadilhas e o pipeline de verificação do radar.
---

# Especialista no Radar

Fonte de verdade compartilhada da skill do radar, lida por Claude e Codex. Trabalha o radar 3D
de aproximações em `resources/js/Components/Radar/` e `resources/js/lib/radar/`. Sem trava
rígida: toque um arquivo vizinho (ex: um tipo em `types.ts`) quando a tarefa exigir, avisando que
cruzou a fronteira.

Esta skill é um índice afiado, não uma cópia. Os READMEs e o código são a fonte de verdade da
estrutura e dos valores concretos; aqui ficam só o mapa, as armadilhas e o pipeline. **Em qualquer
divergência, o README e o código vencem.** Se a divergência indicar uma decisão nova, atualize esta
skill depois.

## Quando usar

Use ao tocar a cena 3D, labels, corpos celestes, trajetória, painéis, listas, tutorial, escala
simbólica ou os dados (Horizons/CAD/NeoWs) do radar.

**Não** use para páginas fora do radar, backend sem impacto nos dados do radar, textos
institucionais, landing, autenticação ou layout genérico fora de `Components/Radar`. Se uma tarefa
começar fora mas afetar dados, escala, corpos, trajetória, tutorial ou labels do radar, use a skill
e explique a fronteira cruzada.

## Mapa rápido

- **`lib/radar/`**: helpers PUROS, sem React/DOM/three. Lógica testável (escala, coordenadas,
  oclusão, resolvedor de labels, progresso). Toda regra de negócio/matemática testável nasce ou
  migra pra cá.
- **`Components/Radar/Scene/`**: fronteira React↔three, câmera, projeção, oclusão.
- **`Components/Radar/Overlays/`**: camadas sobre a cena (labels HTML, barra de carregamento,
  anéis-guia, campo estelar).
- **`Components/Radar/Bodies/`**: Sol, Terra, Lua, planetas, asteroides, cometas.
- **`Components/Radar/Panels/`**: cards flutuantes, navegação, overlays flutuantes.
- **`Components/Radar/Trajectory/`**: marcadores e amostragem da trajetória.
- **`Components/Radar/Controls/`**: toolbar, barra mobile, Guia/Manual, `Tooltip`.
- **`Components/Radar/Tutorial/`**: passo a passo guiado.
- **`Components/Radar/Lists/`**: listas, cards e tabelas a partir de dados já preparados.
- **`Components/Radar/Charts/`**: gráficos e linha do tempo (só visual, sem cálculo de domínio).
- **`Components/Radar/Presenters/`**: badges, réguas e elementos visuais leves e reutilizáveis.
- **`Components/Radar/Dev/`**: ferramentas de diagnóstico só de desenvolvimento (atrás de flag).

## Primeiro passo: leia o README certo

Cada pasta acima tem um README (14 no total). É a fonte de verdade da estrutura. Não os leia
todos; leia só o necessário:

- **Sempre:** `Components/Radar/README.md` (regras transversais: labels e layout sem scroll).
- **O README da subpasta que você vai tocar.**
- **`lib/radar/README.md`** se a mudança envolver regra pura, escala, labels, coordenadas,
  progresso ou formatação.

Depois de mudar uma pasta, atualize o README dela (diretriz geral do projeto).

## Armadilhas (leia antes de mexer)

Os valores concretos (faixas de z-index, limites, classes) vivem no código e nos READMEs, não
aqui, porque envelhecem. Esta seção explica o *porquê* de cada armadilha e aponta onde ver o valor.

### Labels da cena
- A visibilidade de um label é decidida pelo resolvedor puro `resolveRadarLabels`
  (`lib/radar/radarLabels.ts`), travado por `tests/js/lib/radar/radarLabels.test.ts`. Edite os dois
  juntos. Princípio: **aparecer ou sumir na âncora, nunca reposicionar.**
- **Terra é soberana** em colisões. Primários (Sol/planeta/selecionado/hover) só somem por oclusão
  geométrica real; rochas somem por densidade local (`ASTEROID_CROWDING_LIMIT`), nunca por corte
  global de zoom. Regras completas em `Components/Radar/README.md`.

### Z-index dos labels vs overlays (armadilha recorrente)
- Os labels são drei `<Html>` com `z-index` INLINE via `labelZIndexRange` (`lib/radar/radarLabels.ts`).
  Como são portados pro mesmo pai `relative` dos overlays de UI, **um overlay com z baixo deixa o
  label da Terra furar por cima**.
- Por isso, qualquer overlay que precise cobrir a cena fica acima do teto dos labels (ex:
  `Overlays/RadarLoadingOverlay.tsx`, tutorial e modais). As faixas e tetos exatos estão em
  `labelZIndexRange` e na tabela de `Components/Radar/README.md`. **Confira lá antes de definir um
  z novo**, e atualize a tabela se mexer no teto.

### Página sem scroll
- A tela do radar **nunca rola** (decisão de produto). `AppLayout` usa `hideFooter`; o radar
  preenche via `flex-1 min-h-0`. Não introduza altura por `calc` nem reative o footer.

### Dados: Horizons / CAD / NeoWs
- Há regras finas de merge e corte de distância (na dedup, CAD vence; objeto recém-descoberto
  aparece no Caeli e não no NASA Eyes, é esperado, não é bug). Confira a memória do projeto e os
  READMEs antes de "corrigir" uma divergência com o NASA Eyes.

## Texto e estilo

Valem as diretrizes de texto e estilo do projeto (travessão, texto por extenso, tooltip,
comparações honestas, mudanças visuais incrementais). Estão em `AGENTS.md` / `.agents/MEMORY.md`,
não duplicadas aqui. Uma específica do radar: a barra de carregamento mostra porcentagem ancorada
em etapas reais, nunca um progresso inventado.

## Ao concluir uma feature

1. **Avalie se há função pura testável** e implemente o teste na mesma entrega. Os testes do radar
   **espelham o código-fonte**: o teste mora ao lado do módulo que ele exercita (o "sujeito"), não
   dos que ele só importa de apoio.
   - sujeito em `lib/radar/<x>.ts` → `tests/js/lib/radar/<x>.test.ts`;
   - sujeito em `Components/Radar/<Sub>/<x>.tsx` → `tests/js/Radar/` (espelhando a subpasta quando
     existir, ex: `tests/js/Radar/Scene/`, `tests/js/Radar/Tutorial/`);
   - **invariante transversal** (prova uma propriedade do sistema, não cobre um módulo específico,
     ex: "o planeta cai sobre a elipse", "a régua é fiel à UA") → `tests/js/Radar/Invariants/`.
2. **Verifique** via Docker (npm/npx/tsc NÃO existem no host):
   ```bash
   docker compose exec -T app npx vitest run     # testes JS
   docker compose exec -T app npx tsc --noEmit   # type-check
   docker compose exec -T app npx vite build     # build (opcional p/ mudanças de classe/import)
   ```
   Para erros pontuais de TS, prefira os diagnósticos do IDE.
3. **Atualize o README** da pasta tocada.
4. Reporte o resultado real (testes verdes/vermelhos com a saída), sem maquiar.

## Commits

Sem `Co-Authored-By` do Claude nem de outro agente. Só a Verônica no histórico. Commit e push só
quando ela pedir.
