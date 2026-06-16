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
Os vetores brutos do Horizons (km, geocêntricos) viram posição heliocêntrica real e são projetados
na cena pela escala linear única (ver "Política de escala" abaixo). A compressão logarítmica antiga
(`compressSceneVector` em `sceneEphemeris.ts`) só é usada na régua de bastidor por trás de `?log`.

## Política de escala (fonte única da verdade)

A cena tem UMA régua de distância e uma política separada de tamanho de corpos. Quem mexer em escala
deve ler isto antes.

- **Distâncias: escala LINEAR única em UA** (`LINEAR_AU_SCALE`, em `sceneEphemeris.ts`). Asteroides,
  Lua, planetas e Sol ficam nas distâncias relativas REAIS, sem compressão. A direção e a inclinação
  são exatas. Como a régua é honesta, uma aproximação é de fato minúscula perto do vão Terra-Sol: a
  proximidade é revelada por ZOOM de câmera na Terra, nunca esticando a régua.
- **Régua log geocêntrica:** legada, só por trás de `?log` (`compressDistanceDl`/`compressSceneVector`).
  Rede de comparação, invisível ao visitante. Não é o caminho padrão.
- **Tamanho dos corpos: exagerado para legibilidade** (`bodyScale.ts`, `planetData.ts`). O diâmetro
  real da Terra nessa escala seria sub-pixel. Os raios visuais preservam a ordem (Terra > Lua;
  Júpiter > Terra) mas NÃO são fiéis à escala de distância.
- **Asteroides do feed: raio SIMBÓLICO em degraus por classe de tamanho**
  (`symbolicRockRadiusForApproach` em `AsteroidMarker.tsx`). Não é proporcional ao diâmetro real;
  apenas pista grosseira de maior/menor, sempre menor que a Terra.
- **Asteroides conhecidos: tamanho PADRONIZADO** no raio visual de Marte
  (`knownAsteroidVisualScale` em `knownAsteroids.ts`). Diâmetro real só no painel de dados.
- **O painel de dados sempre mostra as distâncias e diâmetros REAIS**, sem qualquer escala visual.

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
| _(transversal)_       | `compressRadial.test.ts`                | Firewall científico: compressão radial preserva direção (nunca por eixo), alinhamento relativo no mesmo frame, objeto na região de Júpiter, unidades/eixos aplicados uma vez |

`compressRadial.test.ts` não cobre um arquivo específico: trava INVARIANTES da pipeline de posicionamento (regra de ouro "a compressão mente sobre a escala, nunca sobre a direção") contra regressões, mesmo que a implementação seja reescrita. A independência entre posição científica e modelo 3D vive em `tests/js/Radar/modelPositionIndependence.test.ts`.

Funções que dependem de DOM ou Three.js com contexto WebGL (`buildMoonBump`, shaders) não têm testes unitários — requerem JSDOM ou ambiente de renderização.

## Padrões de nomenclatura

- Funções de transformação de coordenadas: verbo + origem + destino (ex.: `horizonsToScene`)
- Constantes de escala visual: `NOME_RADIUS_DL` ou `NOME_HITBOX_DL`
- Funções de orientação: `orient` + corpo (ex.: `orientEarth`, `orientMoonTidal`)
- Shaders: exportam constantes em SCREAMING_SNAKE com sufixo `_VERT` / `_FRAG`
