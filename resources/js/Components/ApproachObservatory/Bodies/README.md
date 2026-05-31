# Bodies

Esta pasta concentra apenas os corpos visuais da cena 3D do `ApproachObservatory`.
Ela não deve decidir seleção global, modo de câmera, critérios de lista ou cálculo
orbital. Essas decisões ficam nas camadas de cena, trajetória e painéis.

## Responsabilidades

- `Earth`, `Moon` e `Sun`: corpos de referência principais da cena.
- `Mercury` a `Neptune`: planetas ambiente focáveis, posicionados por `SceneEphemeris`.
- `*Orbit`: anéis de referência visual para órbitas ou distâncias aparentes.
- `bodyRenderConstants.ts`: constantes compartilhadas de renderização, como época
  J2000, resolução de anéis orbitais e opacidades padrão.
- `Asteroid`: marcador, seleção de modelo real e fallback procedural para asteroides.

## Fronteiras

- Posição e efeméride chegam prontas; os corpos apenas renderizam.
- Interação local permitida: hover, hitbox, foco e rótulo.
- Lógica física/orbital deve ficar em `lib/observatory`, `lib/sceneEphemeris` ou
  componentes de trajetória.
- Constantes repetidas entre planetas devem ficar em `bodyRenderConstants.ts`;
  valores específicos de um único corpo continuam perto do componente que os usa.
- Materiais, texturas, geometrias e recursos WebGL devem ser descartados no próprio
  componente que os cria.
