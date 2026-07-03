# Overlays

## Responsabilidade

`Overlays` concentra camadas visuais sobrepostas do `Radar`. Aqui ficam labels HTML da cena 3D, guias visuais 3D e pequenos helpers de apresentação ligados a elementos sobrepostos.

## O Que Pode Conter

- labels HTML sobre a cena 3D;
- guias visuais 3D;
- marcadores visuais;
- tooltips de apresentação;
- helpers pequenos de formatação ligados ao overlay.

## O Que Não Deve Conter

- cálculo orbital real;
- regra científica ou matemática pesada;
- chamadas de API;
- fallback Horizons/CAD;
- ranking global de aproximação;
- seleção global;
- troca de modo de câmera;
- transformação de posição simbólica em posição real.

## Estrutura

```txt
Overlays/
  README.md
  RadarLoadingOverlay.tsx
  SceneLabels.tsx
  SceneRingsLayer.tsx
  StarField.tsx
  useLoadingProgress.ts
```

## Labels De Cena

[`SceneLabels.tsx`](./SceneLabels.tsx) concentra labels HTML sobre a cena 3D, além de regras locais de oclusão visual e proteção contra zonas ocupadas por cards. Ele interpreta posições de cena já fornecidas pelos componentes consumidores.

Por performance, cada label resolve seus três estados de visibilidade (foco, zona proibida, oclusão por corpos) em um único `useFrame` via `useLabelFrameState`, com uma única projeção de posição reaproveitada e buffers `Vector3` reutilizáveis (sem `.clone()` no loop). O tamanho do label é medido por `ResizeObserver`, não por `getBoundingClientRect()` a cada frame, evitando reflow de layout com dezenas de labels visíveis.

Dois cuidados adicionais de performance:

- **Ocultação via CSS, não unmount:** labels ocultos por foco, zona proibida ou oclusão permanecem montados com `visibility: hidden`. Montar/desmontar o portal `<Html>` a cada cruzamento de fronteira força layout e GC exatamente durante o movimento de câmera, que é o gatilho das micro-travadas. A remoção em massa de labels com zoom muito afastado continua sendo por unmount (`DistanceCulledScreenLabel`), pois ali o objetivo é zerar o custo por frame de dezenas de labels.
- **Limiares booleanos com histerese:** `useCompactLabelMode` publica apenas o boolean "abaixo do limiar?" (via `useLunarRadiusBelow`), com histerese de 2px. Publicar o raio numérico re-renderizava todos os consumidores a cada ~4 frames durante qualquer zoom contínuo.

O amontoamento de rochas no zoom out NÃO é mais cortado por um limiar global de distância: quem decide se uma rocha some é o resolvedor central (`resolveRadarLabels`, em `@/lib/radar/radarLabels`), pela densidade local de vizinhos. Rochas isoladas continuam visíveis; só somem quando a vizinhança vira pilha. Por isso Sol, Terra, Lua e planetas nunca somem por colisão de label, só quando um corpo 3D real passa na frente do disco.

## Barra De Carregamento

[`RadarLoadingOverlay.tsx`](./RadarLoadingOverlay.tsx) escurece a cena enquanto o radar carrega e mostra uma barra de 0 a 100%. É usado em dois pontos: na montagem da cena 3D (`RadarSceneCanvas`, até o primeiro frame) e na troca de critério/refresh (`RadarFloatingOverlays`). O z-index é `z-[60]` para superar o maior valor que um rótulo da cena recebe via `zIndexRange` do drei `<Html>` (hoje 48): os rótulos são portados para o mesmo pai `relative`, então sem z alto o "Terra" furava o "Carregando…".

A porcentagem NÃO é progresso real do servidor (o radar carrega por um único `fetch` sem eventos de progresso). Ela é ancorada nas etapas reais que o código conhece (buscar dados → montar cena → primeiro frame) e interpolada de forma suave entre elas. A matemática vive em [`@/lib/radar/loadingProgress`](../../../lib/radar/loadingProgress.ts) (pura e testada, incluindo o texto de cada etapa em `loadingStageLabel`); [`useLoadingProgress.ts`](./useLoadingProgress.ts) roda só o laço de `requestAnimationFrame` e devolve `{ progress, stage }`. Cada etapa tem um teto e a barra desacelera ao se aproximar dele, só batendo 100% quando o marco final acontece, nunca fingindo concluir.

O cabeçalho mostra o texto da etapa atual por extenso ("Buscando os dados", "Montando a cena", "Pronto") em vez de um genérico "Carregando", e um brilho sutil (`animate-loading-shimmer`, keyframe em `tailwind.config.js`) percorre a parte preenchida da barra enquanto carrega.

**Espera pelas texturas e pelo aquecimento da GPU:** a etapa `done` (que conclui a barra) NÃO dispara mais no primeiro frame da cena. O `FirstFrameNotifier` (em `Scene/RadarScene.tsx`) só chama `onFirstFrame` depois de três marcos, todos atrás do overlay:

1. **primeiro frame pintou** (a cena está visível, ainda com materiais de fallback);
2. **texturas dos corpos baixaram** — Terra, Lua, Sol e planetas; sem isso o usuário via as texturas "estalando" depois que a barra sumia. A contagem é do registrador puro `@/lib/radar/bodyTextureRegistry` (conta falhas como resolvidas; timeout de segurança de 8 s);
3. **GPU aquecida** — `warmupSceneOnce` (de `Scene/sceneWarmupGpu.ts`) compila os shaders e sobe as texturas para a GPU; sem isso o primeiro gesto de câmera após entrar congelava por causa do upload/compilação sob demanda. Timeout de segurança próprio (6 s).

Cada marco tem timeout, então nada prende o usuário no carregamento. Enquanto espera, a barra fica na etapa `building` (teto 92%). O custo do passo 3 é justamente por que a barra dura um pouco mais: paga-se o engasgo escondido, em troca de uma cena fluida ao entrar.

**Conclusão até 100% (armadilha):** o chamador zera `active` no MESMO render em que a cena fica pronta. Se o overlay desmontasse ali, a barra nunca pintaria os 100% (sumia no meio do caminho, perto de onde a montagem terminou). Por isso o overlay se mantém montado por conta própria: ao receber `active=false` ele fixa 100%, segura por `HOLD_AT_FULL_MS` e só então sai com fade de opacidade, desmontando depois. Os call-sites continuam passando `active` cru; a lógica de saída é interna ao overlay.

## Guias 3D

[`SceneRingsLayer.tsx`](./SceneRingsLayer.tsx) contém guias visuais 3D da cena `three.js`.

## Campo Estelar

[`StarField.tsx`](./StarField.tsx) desenha ~1400 estrelas procedurais que seguem a câmera, sem afetar cálculos orbitais. A geração é pura e fica em [`lib/radar/starField.ts`](../../../lib/radar/starField.ts) (testada em `tests/js/lib/radar/starField.test.ts`), com RNG de seed fixo (42) para resultado determinístico entre sessões. A profundidade vem das CAMADAS: as estrelas se espalham em faixas de distância e cada camada tem tamanho e brilho próprios (próximas maiores e nítidas, distantes minúsculas e tênues), em vez de uma casca uniforme. Como o `pointsMaterial` não suporta tamanho nem opacidade por estrela, o componente usa um `ShaderMaterial` mínimo (tamanho por vértice com atenuação por distância + disco macio).

## Regra Para IA

Ao editar esta pasta, não mova cálculo orbital, ranking de aproximação, chamadas de API ou fallback Horizons/CAD para componentes de overlay. Se uma regra começar a explicar posição real, efeméride ou seleção global, ela pertence a uma camada de dados/cálculo, não a `Overlays`.
