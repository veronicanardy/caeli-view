# lib

Lógica de negócio e helpers puros compartilhados pela interface do observatório.

## Propósito

Agrupa funções **sem React e sem DOM** (exceto leitura de `localStorage` para locale) que
interpretam, classificam e formatam os dados astronômicos consumidos pelas páginas e componentes.
Tudo aqui deve ser testável em Node puro.

## Estrutura

- `format.ts`: formatadores de números, datas e distâncias respeitando o locale ativo. `compactKm` exibe o valor exato; `approxKm` arredonda para 3 algarismos significativos em leituras que mudam ao vivo, evitando falsa precisão.
- `physicalConstants.ts`: constantes físicas compartilhadas (ex.: distância lunar em km).
- `approachAttention.ts`: classificação de atenção de uma aproximação.
- `approachInterpretation.ts`: interpretação textual de aproximações.
- `asteroidIdentity.ts`: normalização de nomes e identidade de asteroides.
- `sceneEphemeris.ts`: efemérides de alto nível (Sol/Lua/planetas) e compressão logarítmica da cena.
- `keplerOrbit.ts`: propagação orbital de Kepler.
- `radar/`: infraestrutura matemática e gráfica da cena 3D (ver `radar/README.md`).

## O que NÃO fica aqui

- Componentes React ou hooks → ficam em `Components/`
- Helpers de apresentação acoplados a um painel específico → ficam junto do componente (ex.: `focusCardPresentation.ts`)

## Testes

Os testes unitários ficam em `tests/js/lib/` e seguem o padrão Vitest do projeto, espelhando o nome do arquivo fonte (ex.: `format.ts` → `format.test.ts`).
