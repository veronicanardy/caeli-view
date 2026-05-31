# Bodies

Esta pasta concentra apenas os corpos visuais da cena 3D do `ApproachObservatory`.
Ela nao deve decidir selecao global, modo de camera, criterios de lista ou calculo
orbital. Essas decisoes ficam nas camadas de cena, trajetoria e paineis.

## Responsabilidades

- `Earth`, `Moon` e `Sun`: corpos de referencia principais da cena.
- `Mercury` a `Neptune`: planetas ambiente focaveis, posicionados por `SceneEphemeris`.
- `MoonOrbit`: guia visual da orbita lunar, centrado na Terra e orientado pelo plano
  orbital recebido da efemeride.
- `bodyRenderConstants.ts`: constantes compartilhadas de renderizacao, como rotacao
  visual dos corpos e parametros do guia orbital da Lua.
- `Asteroid`: marcador, selecao de modelo real e fallback procedural para asteroides.

## Orbitas e guias

As orbitas planetarias nao vivem nesta pasta. O radar atual desenha os guias
heliocentricos dos planetas em `Trajectory/HeliocentricLines.tsx`, usando
`PlanetOrbitEllipseHelio`.

Esse desenho e intencionalmente simplificado, mas honesto para contexto espacial:

- o Sol fica no foco da elipse, na origem da cena;
- o tamanho vem do semieixo maior em AU;
- a excentricidade do planeta e aplicada no plano ecliptico;
- a inclinacao orbital 3D dos planetas nao e modelada nesses guias.

Nao reintroduza componentes `*Orbit` planetarios nesta pasta que usem apenas a
distancia atual do planeta. Se um anel usa distancia Terra-planeta ou Sol-planeta
instantanea, ele deve ser nomeado como guia/anel de distancia, nao como orbita fisica.

## Fronteiras

- Posicao e efemeride chegam prontas; os corpos apenas renderizam.
- Interacao local permitida: hover, hitbox, foco e rotulo.
- Logica fisica/orbital deve ficar em `lib/observatory`, `lib/sceneEphemeris` ou
  componentes de trajetoria.
- Constantes repetidas entre planetas devem ficar em `bodyRenderConstants.ts`;
  valores especificos de um unico corpo continuam perto do componente que os usa.
- Materiais, texturas, geometrias e recursos WebGL devem ser descartados no proprio
  componente que os cria.
