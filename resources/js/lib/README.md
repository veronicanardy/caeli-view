# lib

Lógica de negócio e helpers puros compartilhados pela interface do observatório.

## Propósito

Agrupa funções **sem React e sem DOM** (exceto leitura de `localStorage` para locale) que
interpretam, classificam e formatam os dados astronômicos consumidos pelas páginas e componentes.
Tudo aqui deve ser testável em Node puro.

## Estrutura

- `format.ts`: formatadores de números, datas e distâncias respeitando o locale ativo. `compactKm` exibe o valor exato; `approxKm` arredonda para 3 algarismos significativos em leituras que mudam ao vivo, evitando falsa precisão.
- `physicalConstants.ts`: constantes físicas compartilhadas (ex.: distância lunar em km).
- `asteroidIdentity.ts`: normalização de nomes e identidade de asteroides.
- `sceneEphemeris.ts`: efemérides de alto nível (Sol/Lua/planetas) e projeção heliocêntrica na régua linear única em UA (`LINEAR_AU_SCALE`).
- `keplerOrbit.ts`: propagação orbital de Kepler.
- `routeProgressForce.ts`: força a barra de progresso de rota na próxima navegação (usada nos atalhos da Home para o radar).
- `transparencyCopy.ts`: copy compartilhado de transparência (afiliação NASA/JPL, fontes e limites), usado pelo footer e pelo guia do radar.
- `radar/`: infraestrutura matemática e gráfica da cena 3D (ver `radar/README.md`).

`approachAttention.ts` e `approachInterpretation.ts` (classificação de atenção e interpretação textual de aproximações) só serviam à tabela e à timeline do radar 2D antigo e foram removidos junto com elas.

## O que NÃO fica aqui

- Componentes React ou hooks → ficam em `Components/`
- Helpers de apresentação acoplados a um painel específico → ficam junto do componente (ex.: `focusCardPresentation.ts`)

## Testes

Os testes unitários ficam em `tests/js/lib/` e seguem o padrão Vitest do projeto, espelhando o nome do arquivo fonte (ex.: `format.ts` → `format.test.ts`).
