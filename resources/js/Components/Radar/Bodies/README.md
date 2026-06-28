# Bodies

Esta pasta concentra apenas os corpos visuais da cena 3D do `Radar`.

Ela não deve decidir seleção global, modo de câmera, critérios de lista, ranking ou cálculo orbital. Essas decisões ficam nas camadas de cena, trajetória, efemérides e painéis.

## Responsabilidades

* `Earth`, `Moon` e `Sun`: corpos de referência principais da cena.
* `Mercury` a `Neptune`: wrappers dos planetas ambiente focáveis, posicionados por `SceneEphemeris`.
* `PlanetBody`: componente base para a renderização visual comum dos planetas ambiente.
* `BodyHitbox`: hitbox invisível compartilhada para interação local dos corpos. Centraliza `stopPropagation`, cursor pointer aplicado diretamente ao canvas, clique, hover opcional e limpeza do cursor ao desmontar. Aplicar o cursor no canvas é necessário porque a cena possui cursor de arrastar explícito no contêiner. Corpos já focados não mantêm hitbox nem cursor clicável. No Sol, a área interativa coincide com o raio do disco, sem incluir a corona.
* `MoonOrbit`: guia visual lunar mantido em `Bodies/Moon` por proximidade com a Lua. Ele ajuda a leitura visual da referência Terra-Lua, mas não calcula efeméride, trajetória nem órbita física. Se surgirem novos guias orbitais, eles devem ir para uma pasta explícita, como `OrbitalGuides`.
* `Asteroid`: marcador visual de objetos próximos. Recebe posição e estados de proximidade já preparados pela camada de cena/trajetória, escolhe o modelo real via `asteroidModelRegistry`, aplica rotação visual, hitbox, hover/seleção e rótulo. Não calcula órbita, ranking, Horizons, SBDB nem efemérides. `RealAsteroidModel` aceita `tint` e `fallbackColor` opcionais para recolorir a superfície (usado pelos cometas).
* `Comet`: identidade, elementos orbitais e modelos GLB dos cometas famosos (`knownComets.ts`, `cometModelRegistry.ts`). Contraparte cometária de `Asteroid/`. O 67P tem shape model real de missão (Rosetta); Halley/Encke reusam o MESMO GLB genérico texturizado dos asteroides, por não terem modelo próprio (mesma cor/textura da rocha). A cauda é desenhada à parte (fora do GLB).
* `Spacecraft`: identidade e posição fixa das naves interplanetárias famosas (Voyager 1/2, Pioneer 10, New Horizons, Juno), com marcador 3D estilizado (`knownSpacecraft.ts`, `SpacecraftMarker.tsx`). Diferente de asteroides/cometas, as naves vivem na cena como os planetas (sempre presentes, fora do feed) e usam posição heliocêntrica FIXA, não Kepler (estão em escape hiperbólico ou orbitando um planeta). Ver `Spacecraft/README.md`. Satélites de órbita terrestre ficam de fora (não cabem na régua heliocêntrica).
* `bodyRenderConstants.ts`: constantes compartilhadas de renderização dos corpos, como época de rotação visual, segmentos de esfera, parâmetros do guia lunar, hitboxes e opacidades padrão.
* `bodyLighting.ts`: helpers compartilhados de iluminação local dos corpos, como a direção dos planetas até o Sol visual da cena.
* `planetBodyTypes.ts`: contrato comum de props para planetas ambiente focáveis.
* `useBodyTexture.ts`: carregamento imperativo de texturas dos corpos, com fallback seguro enquanto a imagem não carrega.
* `useProgressiveBodyTexture.ts`: LOD de textura para corpos grandes e visíveis ao entrar (Lua). Carrega uma versão leve (2k) primeiro, e a nítida (8k) em segundo plano; só troca depois que a 8k está na GPU, devolvendo `{ texture, highReady }`. O consumidor mantém o material estável e troca o uniform in-place quando `highReady` (sem recriar o material). A decisão pura "qual textura expor" vive em `@/lib/radar/progressiveTexture` (testada).

## Planetas ambiente

Os planetas de `Mercury` a `Neptune` são corpos de contexto visual do radar. Eles são focáveis, possuem rótulo, hitbox local, rotação visual, inclinação axial aproximada, textura, shader próprio e brilho de borda.

A lógica comum desses planetas deve ficar em `PlanetBody`.

Os arquivos individuais dos planetas devem permanecer pequenos, contendo principalmente:

* comentário de documentação do corpo;
* imports específicos;
* taxa de rotação visual;
* quaternion de inclinação axial;
* configuração visual do planeta;
* wrapper que chama `PlanetBody`.

Não coloque lógica orbital, cálculo de posição, seleção global, câmera ou ranking dentro dos componentes planetários.

## Convenção de iluminação

No radar heliocêntrico, o `Sun` visual é renderizado na origem da cena.

Por isso, os planetas ambiente (`Mercury` a `Neptune`) não recebem `sunDirection`. Eles recebem apenas sua posição heliocêntrica já calculada e usam `bodyLighting.ts` para derivar o vetor local de iluminação até o Sol da cena.

`Earth` e `Moon` são exceções intencionais:

* `Earth` usa `sunDirection`, `subsolarLatDeg` e `subsolarLonDeg` para orientar o globo e manter o terminador dia/noite coerente.
* `Moon` usa `sunDirection` e posição geocêntrica para fase, orientação visual e relação com a Terra.

## Resolução de textura (política)

O peso das texturas domina o tempo de carregamento do radar (o usuário baixa cada uma). A política, por tamanho do corpo na cena:

* **Corpo pequeno na cena** (Mercúrio, Vênus, Mars, Júpiter, Saturno, Urano, Netuno): usa **2k seco** (`*-2k.jpg`). Ocupam poucos pixels; 8k seria desperdício de download sem diferença visível. Os paths ficam em `lib/radar/planetData.ts`.
* **Corpo grande e visível ao entrar** (Lua): usa **LOD progressivo** via `useProgressiveBodyTexture` (2k → 8k ao aproximar). A 2k entra rápido (e é o que a barra de carregamento espera); a 8k carrega em segundo plano e troca **in-place no uniform**, nunca recriando o material — é o que garante que a aproximação não trave.
* **Terra**: dia já é 2k (`blue-marble-...-2048`); nuvens e luzes noturnas usam as 2k (`earth-clouds-2048`, `earth-night-lights-2048`), não as 8k.
* **Sol**: mantém 8k (decisão de produto); a granulação do shader por cima esconde o ganho de uma 2k.

Ao adicionar um corpo: escolha 2k seco por padrão; só use LOD se ele for grande na tela ao entrar. **Toda textura por `useBodyTexture` ou `useProgressiveBodyTexture`, nunca um `TextureLoader` solto** (senão não entra na conta da barra nem no aquecimento da GPU).

## Texturas e recursos WebGL

`useBodyTexture.ts` é responsável pelo ciclo de vida das texturas carregadas por ele.

Por isso, componentes que usam `useBodyTexture` não devem chamar manualmente `dispose()` em texturas vindas do hook. Texturas carregadas por `useBodyTexture` continuam sendo responsabilidade do próprio hook.

Recursos criados localmente pelo componente continuam sendo responsabilidade do próprio componente ou hook que os criou.

Por isso, componentes que usam `useBodyTexture` não devem chamar manualmente:

* `texture?.dispose()`;
* `atmosphere?.dispose()`;
* `ringTexture?.dispose()`.

Exemplos:

* `PlanetBody` descarta o material que cria para o globo.
* `Saturn` descarta `ringMaterial` e `ringGeo`, porque esses recursos são criados no próprio componente.
* `Moon` descarta o bump procedural criado localmente.
* `RealAsteroidModel` descarta apenas os materiais clonados pelo próprio componente, sem descartar geometrias ou texturas compartilhadas do GLTF.
* Texturas carregadas por `useBodyTexture` devem ser descartadas pelo hook.

## Performance por frame

Os corpos só devem manter em `useFrame` o que realmente muda a cada frame (ex: o spin visual dos planetas em `PlanetBody`). Tudo que deriva apenas da efeméride (posição, vetor Terra→Lua, fase, direção do Sol) muda por tick de dados e deve ser atualizado em `useEffect`, in-place, sobre uniforms/orientação existentes:

* `Moon` mantém o `ShaderMaterial` estável por textura e atualiza `sunDir`/`earthDir`/`phaseFraction` e a orientação tidal por efeito. Antes, `orientMoonTidal` + `directionFromBodyToSceneSun` em `useFrame` alocavam ~12 `Vector3`/`Matrix4` por frame.
* `PlanetBody` atualiza `sunDir` por efeito; apenas o spin roda por frame.
* `RealAsteroidModel` clona os materiais do GLB uma única vez (`prepareMaterials`) e aplica dimming in-place (`applyDimming`), sem re-clonar materiais nem marcar `needsUpdate` a cada mudança de opacidade.

Helpers chamados por frame não devem alocar objetos Three; use buffers módulo-escopo ou refs (ver `InertialZoom`/`TouchGestures` em `Scene/`).

## Casos especiais

`Earth`, `Moon`, `Sun`, `Asteroid` e `MoonOrbit` não são obrigados a usar `PlanetBody`, porque têm responsabilidades visuais diferentes.

`Saturn` pode usar `PlanetBody`, mas seus anéis continuam sendo responsabilidade do próprio `Saturn`, por serem um recurso específico do corpo. Quando necessário, recursos acoplados ao eixo visual do planeta devem ser passados para o slot interno inclinado do `PlanetBody`.

`Venus` pode usar textura auxiliar de atmosfera via configuração de textura extra do `PlanetBody`.

## Fora desta pasta

As órbitas planetárias visíveis do radar, trajetórias e linhas futuras/passadas não vivem em `Bodies`.

Guias orbitais heliocêntricos, trajetórias e representações de caminho devem ficar em componentes de trajetória, como `Trajectory/HeliocentricLines.tsx`, ou nas camadas de cena apropriadas.

`MoonOrbit` é uma exceção local e temporária: ele continua em `Bodies/Moon` por estar acoplado à leitura visual da Lua como referência de distância, não por representar um motor orbital. Se novos guias orbitais surgirem, ou se essa camada crescer, eles devem migrar para uma pasta explícita, como `OrbitalGuides`.

Não reintroduza componentes `*Orbit` planetários nesta pasta apenas para desenhar anéis baseados na distância instantânea do planeta. Se algum guia de distância for necessário no futuro, ele deve ter nome explícito de guia/anel de distância, não de órbita física.

## Fronteiras

* Posição e efeméride chegam prontas; os corpos apenas renderizam.
* Interação local permitida: hover, hitbox, foco e rótulo.
* Hitboxes invisíveis compartilhadas devem usar `BodyHitbox`, salvo quando houver uma necessidade visual/interativa muito específica.
* Lógica física/orbital deve ficar em `lib/observatory`, `lib/sceneEphemeris` ou componentes de trajetória.
* Constantes repetidas entre corpos devem ficar em `bodyRenderConstants.ts`.
* Helpers compartilhados de iluminação local devem ficar em `bodyLighting.ts`.
* Tipos comuns dos planetas ambiente devem ficar em `planetBodyTypes.ts`.
* Texturas compartilhadas entre corpos devem ser carregadas por `useBodyTexture.ts`.
* Valores específicos de um único corpo continuam perto do componente que os usa.
* Materiais, texturas, geometrias e recursos WebGL devem ser descartados pelo componente ou hook responsável por criá-los.
* Recursos visuais específicos de um corpo, como os anéis de Saturno, devem permanecer no componente daquele corpo.

## Observação científica

As inclinações axiais aplicadas nos planetas são aproximações visuais de obliquidade para legibilidade da cena. Elas não representam, sozinhas, uma orientação IAU completa do polo no sistema de referência celeste.

Sempre que a cena precisar de orientação física mais rigorosa, o cálculo deve ser introduzido fora de `Bodies`, nas camadas de efeméride, geometria orbital ou transformação de cena.

## Testes relacionados

Os contratos matemáticos e geométricos que sustentam `Bodies` e seus helpers são protegidos principalmente pela suíte em `tests/js/Radar/`.
