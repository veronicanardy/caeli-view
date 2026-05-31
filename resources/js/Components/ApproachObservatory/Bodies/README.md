# Bodies

Esta pasta concentra apenas os corpos visuais da cena 3D do `ApproachObservatory`.

Ela não deve decidir seleção global, modo de câmera, critérios de lista, ranking ou cálculo orbital. Essas decisões ficam nas camadas de cena, trajetória, efemérides e painéis.

## Responsabilidades

* `Earth`, `Moon` e `Sun`: corpos de referência principais da cena.
* `Mercury` a `Neptune`: wrappers dos planetas ambiente focáveis, posicionados por `SceneEphemeris`.
* `PlanetBody`: componente base para a renderização visual comum dos planetas ambiente.
* `MoonOrbit`: guia visual da órbita lunar, centrado na Terra e orientado pelo plano orbital recebido da efeméride.
* `Asteroid`: marcador, seleção de modelo real e fallback procedural para asteroides.
* `bodyRenderConstants.ts`: constantes compartilhadas de renderização dos corpos, como época de rotação visual, segmentos de esfera, parâmetros do guia lunar, hitboxes e opacidades padrão.
* `bodyLighting.ts`: helpers compartilhados de iluminação local dos corpos, como a direção dos planetas até o Sol visual da cena.
* `planetBodyTypes.ts`: contrato comum de props para planetas ambiente focáveis.
* `useBodyTexture.ts`: carregamento imperativo de texturas dos corpos, com fallback seguro enquanto a imagem não carrega.

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

## Texturas e recursos WebGL

`useBodyTexture.ts` é responsável pelo ciclo de vida das texturas carregadas por ele.

Por isso, componentes que usam `useBodyTexture` não devem chamar manualmente:

* `texture?.dispose()`;
* `atmosphere?.dispose()`;
* `ringTexture?.dispose()`.

O componente que cria materiais, geometrias ou recursos WebGL próprios continua responsável por descartá-los.

Exemplos:

* `PlanetBody` descarta o material que cria para o globo.
* `Saturn` descarta `ringMaterial` e `ringGeo`, porque esses recursos são criados no próprio componente.
* Texturas carregadas por `useBodyTexture` devem ser descartadas pelo hook.

## Casos especiais

`Earth`, `Moon`, `Sun`, `Asteroid` e `MoonOrbit` não são obrigados a usar `PlanetBody`, porque têm responsabilidades visuais diferentes.

`Saturn` pode usar `PlanetBody`, mas seus anéis continuam sendo responsabilidade do próprio `Saturn`, por serem um recurso específico do corpo. Quando necessário, recursos acoplados ao eixo visual do planeta devem ser passados para o slot interno inclinado do `PlanetBody`.

`Venus` pode usar textura auxiliar de atmosfera via configuração de textura extra do `PlanetBody`.

## Fora desta pasta

As órbitas planetárias visíveis do radar não vivem em `Bodies`.

Guias orbitais heliocêntricos, trajetórias, linhas futuras/passadas e representações de caminho devem ficar em componentes de trajetória, como `Trajectory/HeliocentricLines.tsx`, ou nas camadas de cena apropriadas.

Não reintroduza componentes `*Orbit` planetários nesta pasta apenas para desenhar anéis baseados na distância instantânea do planeta. Se algum guia de distância for necessário no futuro, ele deve ter nome explícito de guia/anel de distância, não de órbita física.

## Fronteiras

* Posição e efeméride chegam prontas; os corpos apenas renderizam.
* Interação local permitida: hover, hitbox, foco e rótulo.
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