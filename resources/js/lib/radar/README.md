# lib/radar

Infraestrutura matemática e gráfica da cena 3D do radar de aproximações.

## Propósito

Agrupa helpers **puros e sem React** que sustentam o motor de renderização 3D. O radar de
aproximações (`Components/Radar/`) consome essa pasta diretamente, mas o conteúdo aqui não depende
de nenhum componente específico — é uma biblioteca de baixo nível reutilizável por qualquer cena
que precise do mesmo pipeline gráfico.

## O que fica aqui

- Transformações de coordenadas (direção solar e eixos eclíptico ↔ cena Three.js)
- Orientação de corpos celestes (Terra tidal-lock, Lua lock face)
- Shaders GLSL dos planetas, Sol e Lua (`shaders/`)
- Amostragem e recorte de trajetórias geocêntricas
- Escala visual da Terra e da Lua (`bodyScale.ts`)
- Constantes físicas e visuais dos planetas ambientes (`planetData.ts`)
- Política ÚNICA de tamanho visual dos asteroides (`asteroidScale.ts`)
- Paleta de cores dos objetos rastreados (`palette.ts`)
- Gerenciamento do cursor da cena 3D por alvo, incluindo o canvas e labels (`cursor.ts`)
- Formatadores específicos da cena (timestamp UTC, distância em UA, rótulo relativo de dias)
- Geração procedural da bump map da Lua (`moonTextures.ts`)
- Resolvedor puro de visibilidade dos rótulos (`radarLabels.ts`): quem aparece e quem some, sem React
- Progresso puro da barra de carregamento (`loadingProgress.ts`): etapas reais → porcentagem suave, sem React
- Registrador de texturas dos corpos (`bodyTextureRegistry.ts`): conta texturas que começaram a carregar e que já resolveram, para a barra só concluir com a cena vestida, não no primeiro frame com materiais de fallback
- Decisão pura do LOD de textura (`progressiveTexture.ts`): dada a textura leve, a nítida e se a nítida já subiu à GPU, decide qual expor e se já pode trocar (`useProgressiveBodyTexture` consome)

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
na cena pela escala linear única (ver "Política de escala" abaixo), via `makeHelioLinearProjector` /
`helioAUToSunCenteredScene`. A régua log geocêntrica antiga (`?log`) foi removida.

## Política de escala (fonte única da verdade)

A cena tem UMA régua de distância e uma política separada de tamanho de corpos. Quem mexer em escala
deve ler isto antes.

- **Distâncias: escala LINEAR única em UA** (`LINEAR_AU_SCALE`, em `sceneEphemeris.ts`). Asteroides,
  Lua, planetas e Sol ficam nas distâncias relativas REAIS, sem compressão. A direção e a inclinação
  são exatas. Como a régua é honesta, uma aproximação é de fato minúscula perto do vão Terra-Sol: a
  proximidade é revelada por ZOOM de câmera na Terra, nunca esticando a régua. A régua log
  geocêntrica antiga (`?log`, `compressSceneVector`) foi removida: a linear é a única régua.
- **Planetas: exagero CALIBRADO por planeta** (`planetData.ts`). O diâmetro real seria sub-pixel.
  Os gigantes (Júpiter, Saturno) ficam quase no raio físico (~1×); os rochosos pequenos recebem
  exagero maior para serem visíveis. A hierarquia é preservada e travada por teste
  (`bodyScaleHierarchy.test.ts`): Júpiter > Saturno > Urano ≥ Netuno > Terra > Vênus > Marte > Mercúrio.
- **Terra e Lua: raio exagerado fixo** (`bodyScale.ts`). Lua sempre menor que a Terra; no modo
  linear a Lua usa `radiusScale 0,54` (tamanho aparente do Sol visto da Terra, a coincidência dos
  eclipses) e continua menor que Mercúrio.
- **Sol: ÚNICO corpo no raio físico (1×, sem exagero)** (`bodyRenderConstants.ts`,
  `SUN_PHYSICAL_RADIUS_DL`/`SUN_VISUAL_RADIUS_DL`). Já é gigante o bastante para dominar (~9,5× o
  raio visual de Júpiter); exagerar seria absurdo, reduzir o faria competir com planetas.
- **Asteroides (feed E conhecidos): UMA política simbólica logarítmica contínua por diâmetro real**
  (`asteroidScale.ts` → `symbolicRockRadiusFromDiameter`). Não é proporcional ao diâmetro (seria
  sub-pixel) nem em degraus (achatava vizinhos); a curva log dá "maior parece maior, menor parece
  menor" de forma monotônica. Apenas pista de maior/menor. Piso `MIN_ROCK_RADIUS_DL` (visibilidade) e teto
  `MAX_ROCK_RADIUS_DL` ABAIXO de Mercúrio (nenhuma rocha compete com planeta). Os conhecidos usam
  a MESMA função a partir do seu diâmetro real (`knownAsteroidVisualScale`), então Ceres > Bennu e
  o mesmo corpo tem o mesmo tamanho venha ele do Horizons ou do fallback Kepler.
- **O painel de dados sempre mostra as distâncias e diâmetros REAIS**, sem qualquer escala visual.

## Testes

Os testes unitários ficam em `tests/js/lib/radar/` e seguem o padrão Vitest do projeto.

| Arquivo fonte         | Arquivo de teste                        | O que é coberto                                        |
|-----------------------|-----------------------------------------|--------------------------------------------------------|
| `coordinates.ts`      | `coordinates.test.ts`                   | Convenção de eixos, normalize3, direção solar          |
| `earthOrientation.ts` | `earthOrientation.test.ts`              | Orientação da Terra, tidal lock da Lua, degenerados    |
| `trajectorySampling.ts` | `trajectorySampling.test.ts`          | clipPolyline, findClosest, collectTimeTicks, frame points, limite renderável por tipo, guarda de periélio do botão "Ver a órbita" |
| `moonTextures.ts`     | `moonTextures.test.ts`                  | PRNG mulberry32 (buildMoonBump requer DOM)              |
| `format.ts`           | `format.test.ts`                        | Dígitos dinâmicos, locales, fallbacks nulos, dias relativos |
| `cursor.ts`           | `cursor.test.ts`                        | Contagem de referência, reset, leaves extras           |
| `bodyScale.ts`        | `bodyScale.test.ts`                     | Invariantes hitbox > raio visual                       |
| `radarLabels.ts`      | `../../Radar/radarLabels.test.ts`       | Prioridade, primários nunca somem por colisão, densidade local das rochas, oclusão 3D forte |
| `bodyTextureRegistry.ts` | `bodyTextureRegistry.test.ts`        | Decisão pura "todas resolveram", incremento de registrados/resolvidos, idempotência do settle |
| `progressiveTexture.ts` | `progressiveTexture.test.ts`          | Decisão LOD: expõe 2k até a 8k subir à GPU, troca para 8k quando pronta, nunca marca pronta sem textura |
| _(transversal)_       | `helioSceneProjection.test.ts`          | Firewall científico: a projeção heliocêntrica preserva direção, alinhamento relativo no mesmo frame, objeto na região de Júpiter, unidades/eixos aplicados uma vez |

`helioSceneProjection.test.ts` não cobre um arquivo específico: trava INVARIANTES da pipeline de posicionamento (a régua é fiel à direção e à UA) contra regressões, mesmo que a implementação seja reescrita. A independência entre posição científica e modelo 3D vive em `tests/js/Radar/modelPositionIndependence.test.ts`.

Funções que dependem de DOM ou Three.js com contexto WebGL (`buildMoonBump`, shaders) não têm testes unitários — requerem JSDOM ou ambiente de renderização.

## Padrões de nomenclatura

- Funções de transformação de coordenadas: verbo + origem + destino (ex.: `helioAUToSunCenteredScene`)
- Constantes de escala visual: `NOME_RADIUS_DL` ou `NOME_HITBOX_DL`
- Funções de orientação: `orient` + corpo (ex.: `orientEarth`, `orientMoonTidal`)
- Shaders: exportam constantes em SCREAMING_SNAKE com sufixo `_VERT` / `_FRAG`
