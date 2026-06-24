# Testes JS

## Responsabilidade

Testes unitários do front-end (Vitest, ambiente `node`). O Vitest descobre os arquivos por glob
recursivo (`tests/js/**/*.test.ts`, ver `vitest.config.ts`), então a **localização de um teste não
afeta a execução**, só a organização. A regra abaixo existe para manter os testes fáceis de achar.

## Convenção: o teste espelha o código-fonte

Um teste mora ao lado do **módulo que ele exercita** (o "sujeito" do teste), não dos módulos que ele
só importa como apoio. O caminho do teste espelha o caminho do código em `resources/js/`:

| Sujeito do teste | Onde fica o teste |
|---|---|
| `resources/js/lib/<x>.ts` | `tests/js/lib/<x>.test.ts` |
| `resources/js/lib/radar/<x>.ts` | `tests/js/lib/radar/<x>.test.ts` |
| `resources/js/Components/Radar/<Sub>/<x>.tsx` | `tests/js/Radar/<Sub>/<x>.test.ts` (espelha a subpasta quando existir) |
| `resources/js/hooks/<x>.ts` | `tests/js/hooks/<x>.test.ts` |

Quando um teste usa vários módulos (ex: um componente que importa helpers de `lib/radar`), o sujeito
é o que está sendo provado, não o apoio. Ex: `symbolicRockScale.test.ts` prova `AsteroidMarker`
(componente), então fica em `tests/js/Radar/`, mesmo importando de `lib/radar`.

## Testes de invariante: `tests/js/Radar/Invariants/`

Alguns testes **não cobrem um módulo específico** — eles travam uma PROPRIEDADE do sistema que deve
valer mesmo se a implementação for reescrita (ex: "o planeta cai exatamente sobre a elipse desenhada",
"a régua linear é fiel à UA", "a projeção heliocêntrica preserva a direção"). Como não têm um único
sujeito para espelhar, ficam agrupados em `tests/js/Radar/Invariants/`. Não force um desses para a
pasta de um módulo só porque ele importa daquele módulo.

## Estrutura

```txt
tests/js/
  README.md
  Components/        testes de componentes compartilhados (fora do radar)
  Home/              testes da Home
  Radar/             testes de Components/Radar (espelha as subpastas: Scene/, Tutorial/, ...)
    Invariants/      invariantes científicas transversais do radar
  hooks/             testes de resources/js/hooks
  lib/               testes de resources/js/lib
    radar/           testes de resources/js/lib/radar (helpers puros)
```

## Rodar

Tudo via Docker (npm/npx não existem no host):

```bash
docker compose exec -T app npx vitest run                       # suíte completa
docker compose exec -T app npx vitest run tests/js/lib/radar    # só uma pasta
```
