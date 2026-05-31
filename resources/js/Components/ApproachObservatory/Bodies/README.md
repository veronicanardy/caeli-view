# Bodies

Esta pasta concentra apenas os corpos visuais da cena 3D do `ApproachObservatory`.

Ela não deve decidir seleção global, modo de câmera, critérios de lista, ranking ou cálculo orbital. Essas decisões ficam nas camadas de cena, trajetória, efemérides e painéis.

## Responsabilidades

* `Earth`, `Moon` e `Sun`: corpos de referência principais da cena.
* `Mercury` a `Neptune`: planetas ambiente focáveis, posicionados por `SceneEphemeris`.
* `MoonOrbit`: guia visual da órbita lunar, centrado na Terra e orientado pelo plano orbital recebido da efeméride.
* `Asteroid`: marcador, seleção de modelo real e fallback procedural para asteroides.
* `bodyRenderConstants.ts`: constantes compartilhadas de renderização dos corpos, como rotação visual, parâmetros do guia lunar e opacidades padrão.

## Fora desta pasta

As órbitas planetárias visíveis do radar não vivem em `Bodies`.

Guias orbitais heliocêntricos, trajetórias, linhas futuras/passadas e representações de caminho devem ficar em componentes de trajetória, como `Trajectory/HeliocentricLines.tsx`, ou nas camadas de cena apropriadas.

Não reintroduza componentes `*Orbit` planetários nesta pasta apenas para desenhar anéis baseados na distância instantânea do planeta. Se algum guia de distância for necessário no futuro, ele deve ter nome explícito de guia/anel de distância, não de órbita física.

## Fronteiras

* Posição e efeméride chegam prontas; os corpos apenas renderizam.
* Interação local permitida: hover, hitbox, foco e rótulo.
* Lógica física/orbital deve ficar em `lib/observatory`, `lib/sceneEphemeris` ou componentes de trajetória.
* Constantes repetidas entre planetas devem ficar em `bodyRenderConstants.ts`.
* Valores específicos de um único corpo continuam perto do componente que os usa.
* Materiais, texturas, geometrias e recursos WebGL devem ser descartados no próprio componente que os cria.
