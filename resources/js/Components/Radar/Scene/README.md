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
- `KnownAsteroidsLayer.tsx` / `KnownCometsLayer.tsx`: fallback Kepler dos objetos famosos (asteroides e cometas) na régua dos planetas, para que nenhum suma quando o Horizons falha. Recebem `skipIds` com os famosos que já têm posição real do feed e os pulam, evitando duplicar o corpo. Os cometas reusam o modelo genérico recolorido (sem GLB próprio ainda).
- `HeliocentricScene.tsx`: cena heliocêntrica do objeto selecionado em modo órbita.
- `KeyboardPan.tsx`: pan da câmera por WASD e setas do teclado, com velocidade proporcional à distância.
- `SceneWarmup.tsx`: pré-compilação assíncrona de shaders (`compileAsync`) e upload escalonado de texturas (`initTexture`) em momentos ociosos, para que revelar objetos novos ao rotacionar a câmera não dispare compilação síncrona no meio do gesto.
- `LabelBackdropGate.tsx`: suspende o backdrop-filter dos labels da cena enquanto a câmera se move (classe `radar-camera-moving`, regra em `resources/css/app.css`), restaurando-o ~250ms após parar. Compor o blur de dezenas de labels em movimento custa vários ms por frame.
- `useBodyFocus.ts`, `useSceneEphemeris.ts`, `useSelectionFocusFraming.ts`, `useLabelNoGoRects.ts`: hooks de apoio da cena.

## Câmera e enquadramento

Constantes de câmera ficam em `cameraConstants.ts`. Cálculos de enquadramento ficam em `cameraFraming.ts`. `CameraRig.tsx` apenas executa transições de câmera a partir de intenções explícitas.

O voo da câmera é **ininterrupto**: enquanto um tween está em andamento, o `CameraRig` desabilita os OrbitControls (`controls.enabled = false`), e as demais camadas de input (`InertialZoom`, `TouchGestures`, `KeyboardPan`) respeitam esse flag. Assim rotação, pan, zoom (roda/pinça) e teclado ficam inertes durante a navegação, que segue até o destino. O controle volta ao usuário automaticamente quando a câmera chega.

O voo em si é o lerp suave original (fator 0,055, com `controls.update()` por frame); ao cruzar o limiar de proximidade o tween termina e os controles são reabilitados. Não há teleporte nem encaixe no fim: o lerp desacelera de forma assintótica e a câmera já está praticamente imóvel quando o controle volta, sem "tranco" perceptível. A única diferença em relação ao comportamento anterior é que a interação não cancela mais o voo no meio, ela só fica inerte até a chegada.

Como o voo desabilita os OrbitControls, é obrigatório garantir a soltura. O foco de asteroide usa `transition: 'preserve_heading'` e mira um alvo distante (a rocha na escala da cena); com damping, o teste de proximidade `1e-4` pode oscilar e nunca cruzar, deixando os controles presos em `disabled` (o usuário não conseguiria mais girar/zoom depois de chegar). Por isso há o teto `MAX_TWEEN_FRAMES`: ao atingi-lo o tween encerra e reabilita os controles **sem mexer na câmera** (não teleporta, o lerp para onde já está, então sem tranco). É só rede de segurança, ~3,3s a 60fps, bem além de qualquer voo real.

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
