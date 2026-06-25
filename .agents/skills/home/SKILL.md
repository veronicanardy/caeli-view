---
name: home
description: Especialista na página inicial do CaeliView (Components/Home e Pages/Home). Use ao mexer em qualquer parte da Home (hero cinematográfico, horizonte 3D da Terra, fundo cósmico, console de observação, copy do céu, cenas WebGL). Carrega o conceito visual, as convenções, as armadilhas e o pipeline de verificação da Home.
---

# Especialista na Home

Fonte de verdade compartilhada da skill da Home, lida por Claude e Codex. Trabalha a página
inicial em `resources/js/Components/Home/` e `resources/js/Pages/Home.tsx`. Sem trava rígida: toque
um arquivo vizinho (um hook do céu, um tipo, uma seção de CSS) quando a tarefa exigir, avisando que
cruzou a fronteira.

Esta skill é um índice afiado, não uma cópia. O README e o código são a fonte de verdade da
estrutura e dos valores concretos; aqui ficam só o mapa, o conceito visual, as armadilhas e o
pipeline. **Em qualquer divergência, o README e o código vencem.** Se a divergência indicar uma
decisão nova, atualize esta skill depois.

## Quando usar

Use ao tocar o hero cinematográfico, o horizonte 3D da Terra, o fundo cósmico, o console de
observação, a copy derivada do céu ou as cenas WebGL da Home.

**Não** use para o radar (tem skill própria), páginas institucionais, landing fora da Home,
autenticação ou layout genérico. Se uma tarefa começar fora mas afetar o hero, a cena da Terra, o
console ou a copy do céu, use a skill e explique a fronteira cruzada.

## Conceito visual (a alma da página)

A Terra **não** é um globo ao lado do texto: é um horizonte colossal na base da tela, como visto da
janela de uma estação em órbita baixa. O arco atmosférico ciano no limbo (shader fresnel dentro da
cena) é a assinatura visual da página. O conteúdo editorial fica centralizado acima, e os quatro
módulos de dados formam uma barra única de instrumentos (o console de observação) pousada sobre o
brilho do horizonte. Qualquer mudança que descaracterize esse horizonte é uma mudança de produto,
não um ajuste.

## Mapa rápido

Árvore ativa, montada por `Pages/Home.tsx` → `CinematicHero`:

- **`CinematicHero.tsx`**: orquestrador do hero. Bloco editorial central (badge, marca, frase,
  descrição, microcopy NASA/JPL, CTA) + console de observação com localização no cabeçalho +
  overlays de vignette.
- **`CinematicEarthScene.tsx`**: horizonte da Terra em Three.js puro. Câmera a `ORBIT_ALTITUDE`
  acima da superfície (constantes de enquadramento no topo do arquivo), texturas reais NASA com
  cascata de fallback, nuvens com sombra, luzes noturnas Black Marble, brilho oceânico e arco
  atmosférico fresnel no limbo. Fallback de horizonte em CSS quando tudo falha.
- **`CinematicSpaceBackdrop.tsx`**: fundo em um único canvas Three.js: nebulosa FBM, três camadas
  de estrelas com parallax e cometa ocasional confinado ao céu superior.
- **`heroSkyCopy.ts`**: funções PURAS e bilíngues de copy do céu (nota de observação, visibilidade,
  planetas, data de aproximação, fase lunar). É o `lib/` da Home. Travado por
  `tests/js/Home/heroSkyCopy.test.ts`.

Dados chegam por hooks compartilhados, nunca por fetch direto na pasta:
`useSkyObservation`, `useVisibleObjects`, `useHomeAstronomyFeed` (em `resources/js/hooks/`).

**Legado não montado** (versões anteriores do hero, mantidas só para referência): vários `.tsx` na
pasta que `Pages/Home.tsx` não importa. Antes de editar um componente da Home, **confirme que ele
está na árvore ativa** (importado por `CinematicHero`/`Home.tsx`); a lista exata de legado vive no
README e envelhece, então a verdade é o grafo de imports, não a memória.

## Primeiro passo: leia o README

`Components/Home/README.md` é a fonte de verdade da estrutura, do conceito visual e dos padrões
locais. Leia antes de mexer. Depois de mudar a pasta, atualize o README (diretriz geral do projeto)
— inclusive a lista de ativo vs legado, que é a armadilha mais fácil de deixar desatualizada.

## Armadilhas (leia antes de mexer)

Os valores concretos (altitude da câmera, seções de CSS, classes) vivem no código e no README,
não aqui, porque envelhecem. Esta seção explica o *porquê*.

### Cenas WebGL (Terra e fundo)
- `three` é importado **dinamicamente**. A cena só marca `ready` após o **primeiro frame válido
  renderizado**, nunca no mount. E **sempre libera geometria, materiais e texturas no cleanup** —
  vazamento de GPU aqui é regressão silenciosa.
- As texturas NASA têm **cascata de fallback** até o horizonte em CSS puro. Não remova um degrau da
  cascata sem entender o anterior; a tela nunca pode ficar preta.

### Animação e acessibilidade
- Tudo que anima continuamente usa **apenas `transform`/`opacity`** e **respeita
  `prefers-reduced-motion`**. Nada de animar `top`/`left`/`width`.
- Decorativos não interativos mantêm `aria-hidden` e `pointer-events: none`.

### Copy do céu
- Texto derivado de dados do céu vive em `heroSkyCopy.ts` como **função pura bilíngue** (parâmetro
  `en`), testada. Texto **fixo** vive em `i18n/`. Não escreva string solta no JSX nem misture os
  dois.
- Sem regra de domínio astronômico na pasta: ela só apresenta. Cálculo nasce em `lib/`/`services/`.

### CSS do hero
- Os estilos vivem em `resources/css/app.css`, em seções nomeadas (`home-*`, `hero-*`,
  `observatory-console`/`console-*`, `editorial-*`, `cinematic-earth-shell`). Cada célula do console
  define a própria cor via `--card-accent`. Edite na seção certa; não jogue estilo do hero inline
  nem em outro arquivo.

## Texto e estilo

Valem as diretrizes de texto e estilo do projeto (travessão, texto por extenso, tooltip,
comparações honestas, mudanças visuais incrementais e sóbrias). Estão em `AGENTS.md` /
`.agents/MEMORY.md`, não duplicadas aqui.

## Ao concluir uma feature

1. **Avalie se há função pura testável** e implemente o teste na mesma entrega. Os testes da Home
   espelham o código:
   - copy/lógica pura em `Components/Home/<x>.ts` → `tests/js/Home/<x>.test.ts`;
   - hooks → `tests/js/hooks/`;
   - comportamento de página/feed → `tests/Feature/HomePageTest.php`,
     `tests/Feature/HomeAstronomyFeedTest.php`.
2. **Verifique** via Docker (npm/npx/tsc NÃO existem no host):
   ```bash
   docker compose exec -T app npx vitest run     # testes JS
   docker compose exec -T app npx tsc --noEmit   # type-check
   docker compose exec -T app php artisan test   # testes PHP (página/feed)
   docker compose exec -T app npx vite build     # build (opcional p/ mudanças de classe/import)
   ```
   Para erros pontuais de TS, prefira os diagnósticos do IDE.
3. **Atualize o README** da pasta (inclusive a lista ativo vs legado).
4. Reporte o resultado real (testes verdes/vermelhos com a saída), sem maquiar.

## Commits

Sem `Co-Authored-By` do Claude nem de outro agente. Só a Verônica no histórico. Commit e push só
quando ela pedir.
