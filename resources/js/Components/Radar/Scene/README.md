# Scene

## Responsabilidade

`Scene` compõe a visualização 3D do `Radar`. Esta camada recebe dados já calculados, adapta posições para coordenadas de cena e monta Canvas, câmera, corpos, planetas, trajetórias, labels e controles.

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
- `usePanelBias.ts`: hook que mede a fração do canvas coberta pela UI. biasX (desktop) usa a união do trilho esquerdo (painel de navegação + card visível); biasY (mobile) usa o card inferior. O `CameraRig` aplica esses valores como deslocamento de projeção (`setViewOffset`), nunca movendo o alvo dos OrbitControls — assim o objeto focado continua sendo o centro real de rotação/zoom com cards abertos. Medições só em resize/mudança de card (com epsilon de 1%), nunca por frame.
- `sceneOcclusion.ts`: montagem dos oclusores geométricos usados por labels 3D.
- `cameraConstants.ts`: FOV, distância máxima e visões predefinidas.
- `cameraFraming.ts`: helpers de enquadramento de corpos e asteroides.
- `scenePositions.ts`: adaptação leve de posições da efeméride para a cena.
- `sceneFocus.ts`: foco, labels, oclusores e decisão local de cena heliocêntrica.
- `PlanetLayer.tsx`: renderização dos planetas.
- `PlanetOrbitLayer.tsx`: renderização declarativa das elipses orbitais planetárias a partir de uma lista local de configuração.
- `AsteroidSceneLayer.tsx`: renderização de asteroides e trajetórias atuais.
- `KnownAsteroidsLayer.tsx` / `KnownCometsLayer.tsx`: fallback Kepler dos objetos famosos (asteroides e cometas) na régua dos planetas, para que nenhum suma quando o Horizons falha. Recebem `skipIds` com os famosos que já têm posição real do feed e os pulam, evitando duplicar o corpo. Os cometas usam o núcleo 3D do `Bodies/Comet/cometModelRegistry` (67P real; demais reusam o mesmo GLB genérico texturizado dos asteroides).
- `KnownSpacecraftLayer.tsx`: naves interplanetárias famosas (Voyager 1/2, Pioneer 10, New Horizons, Juno) com marcador estilizado (`Bodies/Spacecraft/SpacecraftMarker`). Diferente das camadas acima, é montada SEMPRE (como os planetas, fora do modo famosos) e não recebe `skipIds`: as naves não estão no feed, então o `AsteroidMarker` as pintaria como rocha. Usa a posição heliocêntrica FIXA de `knownSpacecraft` (não Kepler). O clique chama `onFocusSpacecraft`, que foca a câmera e abre o card sintético da nave.
- `HeliocentricScene.tsx`: cena heliocêntrica do objeto selecionado em modo órbita.
- `KeyboardPan.tsx`: pan da câmera por WASD e setas do teclado, com velocidade proporcional à distância.
- `SceneWarmup.tsx`: pré-compilação assíncrona de shaders (`compileAsync`) e upload escalonado de texturas (`initTexture`) em momentos ociosos, para que revelar objetos novos ao rotacionar a câmera não dispare compilação síncrona no meio do gesto.
- `LabelBackdropGate.tsx`: suspende o backdrop-filter dos labels da cena enquanto a câmera se move (classe `radar-camera-moving`, regra em `resources/css/app.css`), restaurando-o ~250ms após parar. Compor o blur de dezenas de labels em movimento custa vários ms por frame.
- `useBodyFocus.ts`, `useSceneEphemeris.ts`, `useSelectionFocusFraming.ts`, `useLabelNoGoRects.ts`: hooks de apoio da cena.

## Câmera e enquadramento

Constantes de câmera ficam em `cameraConstants.ts`. Cálculos de enquadramento ficam em `cameraFraming.ts`. `CameraRig.tsx` apenas executa transições de câmera a partir de intenções explícitas.

O **piso de zoom é dinâmico** (`minDistance` dos OrbitControls/`InertialZoom`/`TouchGestures`): ao navegar o sistema ou focar a Terra usa `EARTH_MIN_DISTANCE` (não mergulha na Terra); com uma rocha selecionada em close-up (fora do modo órbita) cai para `ROCK_MIN_DISTANCE`, logo acima do `CAMERA_NEAR`, para a câmera colar nos corpos minúsculos. Ambos em `cameraConstants.ts`. O close-up em si (`closeUpDistance` em `cameraFraming.ts`) mantém raio/distância constante para TODA rocha ocupar a mesma fração da tela: como o near plane impede colar mais a menor rocha (presa no piso), os corpos grandes (Ceres) ficam mais longe em vez de encherem mais. A faixa da lupa de trajetória (`ZoomHint.tsx`) precisa cobrir do piso ao teto desse close-up.

O voo da câmera é **ininterrupto**: enquanto um tween está em andamento, o `CameraRig` desabilita os OrbitControls (`controls.enabled = false`), e as demais camadas de input (`InertialZoom`, `TouchGestures`, `KeyboardPan`) respeitam esse flag. Assim rotação, pan, zoom (roda/pinça) e teclado ficam inertes durante a navegação, que segue até o destino. O controle volta ao usuário automaticamente quando a câmera chega.

O foco do Sol usa uma chegada mais recuada que o enquadramento padrão dos corpos. O multiplicador é `24` no desktop e `34` no mobile, preservando espaço para o disco e a corona sem perder a sensação de aproximação. Esse voo dura `1` segundo; os demais continuam com `1,7` segundo.

Júpiter, Saturno, Urano e Netuno usam multiplicador de foco `10`, em vez do padrão `20`, para chegarem 50% mais perto. Os planetas rochosos preservam o enquadramento padrão. Os anéis de Saturno continuam inteiros no campo de visão.

Quando Urano ou Netuno estão focados, o zoom manual respeita distância mínima de `0,65` unidade. A chegada automática permanece em aproximadamente `1,3` e `1,2` unidades, mas a câmera não entra na faixa muito próxima que causa tremor visual.

O voo usa duração fixa de `1,7` segundo e interpolação absoluta com `ease-out` cúbico. No fim, câmera e alvo chegam exatamente ao destino e os controles são reabilitados, sem cauda assintótica nem teste de proximidade. O relógio acompanha o tempo real mesmo abaixo de 30 quadros por segundo, importante perto do Sol, onde a renderização pode ser mais pesada. Apenas pausas anormais acima de `0,1` segundo por frame são limitadas para evitar saltos ao retornar de uma aba em segundo plano.

## Régua única heliocêntrica

A cena tem UMA régua: asteroides, trajetórias, Lua, Sol e planetas caem na escala linear heliocêntrica em UA (Sol na origem), nas distâncias relativas reais, sem compressão. Os NEOs do feed são projetados por `currentPositionInHelioScene` / `makeHelioLinearProjector` (posição absoluta, sem offset da Terra). Terra, Lua, Sol e planetas usam posições já resolvidas pela efeméride ou fallbacks locais já definidos. A régua log geocêntrica antiga (`?log`) foi removida.

O modo órbita NÃO troca de cena: ele apenas REVELA a elipse Kepleriana completa do objeto selecionado, sobreposta à mesma régua única (sob demanda, no botão "Ver a órbita ao redor do Sol").

## Foco, labels e oclusão

`sceneFocus.ts` concentra regras locais de label e oclusão. O oclusor da Lua usa a posição absoluta `moonPos`, porque `moonPos` já inclui `earthPos + moonGeoPos`. O oclusor do objeto focado usa `focusedObjectScenePosition`, que devolve a posição heliocêntrica ABSOLUTA da rocha (a mesma régua em que ela é desenhada), e não uma posição relativa à Terra.

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
