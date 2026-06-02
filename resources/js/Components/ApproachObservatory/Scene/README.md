# Scene

## Responsabilidade

`Scene` compõe a visualização 3D do `ApproachObservatory`. Esta camada recebe dados já calculados, adapta posições para coordenadas de cena e monta Canvas, câmera, corpos, planetas, trajetórias, labels e controles.

## O que pode conter

- Composição do Canvas e da cena Three.js.
- Camadas visuais de Sol, Terra, Lua, planetas, órbitas e asteroides.
- Adaptação leve de posições já resolvidas para coordenadas de cena.
- Foco visual, intenção de câmera, enquadramento e oclusão de labels.
- Arbitragem local entre cena radar/geocêntrica e cena heliocêntrica quando os dados necessários já existem.

## O que não deve conter

- Chamadas de API externas.
- Busca Horizons/CAD.
- Ranking global de aproximação.
- Criação de fallback Horizons/CAD.
- Cálculo orbital pesado que pertence a `lib`.
- Transformação de posição simbólica em verdade científica nova.
- Controle de UI de painéis fora da cena.

## Estrutura

- `RadarSceneCanvas.tsx`: fronteira entre React UI e o Canvas Three.js.
- `RadarScene.tsx`: compositor principal da cena.
- `CameraRig.tsx`: transições explícitas de câmera.
- `InertialZoom.tsx`: zoom inercial e extensão preservada de drift do alvo orbital.
- `sceneBodyConstants.ts`: constantes visuais compartilhadas de corpos principais da cena.
- `sceneOcclusion.ts`: montagem dos oclusores geométricos usados por labels 3D.
- `cameraConstants.ts`: FOV, distância máxima e visões predefinidas.
- `cameraFraming.ts`: helpers de enquadramento de corpos e asteroides.
- `scenePositions.ts`: adaptação leve de posições da efeméride para a cena.
- `sceneFocus.ts`: foco, labels, oclusores e decisão local de cena heliocêntrica.
- `PlanetLayer.tsx`: renderização dos planetas.
- `PlanetOrbitLayer.tsx`: renderização declarativa das elipses orbitais planetárias a partir de uma lista local de configuração.
- `AsteroidSceneLayer.tsx`: renderização de asteroides e trajetórias atuais.
- `HeliocentricScene.tsx`: cena heliocêntrica do objeto selecionado em modo órbita.
- `useBodyFocus.ts`, `useSceneEphemeris.ts`, `useSelectionFocusFraming.ts`, `useLabelNoGoRects.ts`: hooks de apoio da cena.

## Câmera e enquadramento

Constantes de câmera ficam em `cameraConstants.ts`. Cálculos de enquadramento ficam em `cameraFraming.ts`. `CameraRig.tsx` apenas executa transições de câmera a partir de intenções explícitas e devolve o controle ao usuário quando há interação.

## Cena radar/geocêntrica

A cena radar mantém asteroides e trajetórias em posições geocêntricas log-comprimidas, offsetadas pela posição atual da Terra. Terra, Lua, Sol e planetas usam posições já resolvidas pela efeméride ou fallbacks locais já definidos.

## Cena heliocêntrica

A cena heliocêntrica aparece somente quando o modo órbita está ativo, há objeto selecionado com elementos orbitais e a época de periélio é utilizável. Ela não recalcula ranking nem cria fallback de dados.

## Foco, labels e oclusão

`sceneFocus.ts` concentra regras locais de label e oclusão. O oclusor da Lua usa a posição absoluta `moonPos`, porque `moonPos` já inclui `earthPos + moonGeoPos`.

## Padrões locais

- Todo arquivo de `Scene` deve iniciar com documentação em português explicando responsabilidade e fronteiras.
- `RadarScene.tsx` deve funcionar como compositor fino: montar providers/camadas e delegar regras derivadas para hooks/helpers locais.
- Camadas com listas estáveis de objetos visuais devem preferir configuração declarativa a JSX repetido, como em `PlanetOrbitLayer.tsx`.
- Foco local de corpos deve ficar em `useBodyFocus.ts`; oclusores geométricos devem ficar em `sceneOcclusion.ts`.
- Preparação de dados visuais para `Bodies` pode acontecer em `Scene`, desde que use dados já recebidos e não crie nova verdade orbital.

## Regras para IA/refatoração

- Preserve escala, posições, orbit mode, seleção, foco, labels, controles e damping salvo pedido explícito.
- Prefira extrair helpers pequenos em vez de reescrever a cena inteira.
- Use `import type` para símbolos usados apenas como tipo.
- Documente decisões de cena em português e UTF-8, sem comentários linha a linha óbvios.

## Regra para IA

Ao editar esta pasta, não mova chamadas de API, ranking de aproximação,
fallback Horizons/CAD ou cálculo orbital pesado para componentes de cena.
`Scene` deve compor a visualização 3D e adaptar dados já recebidos, não decidir
a verdade científica dos dados.
