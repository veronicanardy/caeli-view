# lib/radar

Infraestrutura matemática e gráfica da cena 3D do radar de aproximações.

## Propósito

Agrupa helpers **puros e sem React** que sustentam o motor de renderização 3D. O radar de
aproximações (`Components/Radar/`) consome essa pasta diretamente, mas o conteúdo aqui não depende
de nenhum componente específico — é uma biblioteca de baixo nível reutilizável por qualquer cena
que precise do mesmo pipeline gráfico.

## O que fica aqui

- Transformações de coordenadas (geocêntrico eclíptico ↔ cena Three.js)
- Orientação de corpos celestes (Terra tidal-lock, Lua lock face)
- Shaders GLSL dos planetas, Sol e Lua (`shaders/`)
- Amostragem e recorte de trajetórias geocêntricas
- Escala visual dos corpos (`bodyScale.ts`)
- Constantes físicas e visuais dos planetas ambientes (`planetData.ts`)
- Paleta de cores dos objetos rastreados (`palette.ts`)
- Gerenciamento do cursor da cena 3D (`cursor.ts`)
- Formatadores específicos da cena (timestamp UTC, distância em UA, rótulo relativo de dias)
- Geração procedural da bump map da Lua (`moonTextures.ts`)

## O que NÃO fica aqui

- Lógica de negócio do radar (classificação de distância, atenção, interpretação) → fica em `lib/`
- Componentes React ou hooks → ficam em `Components/Radar/`
- Efemérides de alto nível (Sol/Lua/planetas) → ficam em `lib/sceneEphemeris.ts`
- Propagação orbital de Kepler → fica em `lib/keplerOrbit.ts`

## Convenção de coordenadas

O sistema de eixos adotado em toda a pasta segue o contrato de `coordinates.ts`:

```
Eclíptico J2000 (JPL Horizons)  →  Cena Three.js
        X_ecl                   →        X_scene
        Z_ecl                   →        Y_scene
       −Y_ecl                   →        Z_scene
```

O plano eclíptico fica em XZ da cena; o norte eclíptico aponta para +Y.

## Relação com o radar 3D

Os componentes de `Components/Radar/Bodies/`, `Scene/` e `Trajectory/` importam diretamente daqui.
A escala logarítmica de distância (`compressSceneVector` em `sceneEphemeris.ts`) é o elo entre os
vetores brutos do Horizons (km) e as posições na cena — toda distância passa por ela antes de chegar
aqui.

## Testes

Os testes unitários ficam em `tests/js/lib/radar/` e seguem o padrão Vitest do projeto.

| Arquivo fonte         | Arquivo de teste                        | O que é coberto                                        |
|-----------------------|-----------------------------------------|--------------------------------------------------------|
| `coordinates.ts`      | `coordinates.test.ts`                   | Convenção de eixos, compressão logarítmica, normalize3 |
| `earthOrientation.ts` | `earthOrientation.test.ts`              | Orientação da Terra, tidal lock da Lua, degenerados    |
| `trajectorySampling.ts` | `trajectorySampling.test.ts`          | clipPolyline, findClosest, toVec3, collectTimeTicks    |
| `moonTextures.ts`     | `moonTextures.test.ts`                  | PRNG mulberry32 (buildMoonBump requer DOM)              |
| `format.ts`           | `format.test.ts`                        | Dígitos dinâmicos, locales, fallbacks nulos, dias relativos |
| `cursor.ts`           | `cursor.test.ts`                        | Contagem de referência, reset, leaves extras           |
| `bodyScale.ts`        | `bodyScale.test.ts`                     | Invariantes hitbox > raio visual                       |

Funções que dependem de DOM ou Three.js com contexto WebGL (`buildMoonBump`, shaders) não têm testes unitários — requerem JSDOM ou ambiente de renderização.

## Padrões de nomenclatura

- Funções de transformação de coordenadas: verbo + origem + destino (ex.: `horizonsToScene`)
- Constantes de escala visual: `NOME_RADIUS_DL` ou `NOME_HITBOX_DL`
- Funções de orientação: `orient` + corpo (ex.: `orientEarth`, `orientMoonTidal`)
- Shaders: exportam constantes em SCREAMING_SNAKE com sufixo `_VERT` / `_FRAG`
