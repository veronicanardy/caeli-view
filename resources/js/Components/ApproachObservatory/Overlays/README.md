# Overlays

## Responsabilidade

`Overlays` concentra camadas visuais sobrepostas do `ApproachObservatory`. Aqui ficam renderizadores e helpers de apresentacao para o radar SVG 2D, labels HTML da cena 3D e guias visuais 3D que interpretam dados ja preparados por camadas de layout, cena ou dominio.

## O que pode conter

- overlays SVG 2D do radar
- labels HTML sobre a cena 3D
- guias visuais 3D
- marcadores visuais
- tooltips de apresentacao
- helpers pequenos de formatacao ligados ao overlay

## O que nao deve conter

- calculo orbital real
- regra cientifica ou matematica pesada
- chamadas de API
- fallback Horizons/CAD
- ranking global de aproximacao
- selecao global
- troca de modo de camera
- transformacao de posicao simbolica em posicao real

## Estrutura

```txt
Overlays/
  README.md
  RadarSvg/
    RadarSvgBodiesLayer.tsx
    RadarSvgLabelsLayer.tsx
    RadarSvgLayers.tsx
    RadarSvgObjectsLayer.tsx
    RadarSvgRingsLayer.tsx
    RadarSvgTooltip.tsx
    RadarSvgTrajectoriesLayer.tsx
    RadarSvgVectorsLayer.tsx
    radarSvgPresentation.ts
    radarSvgTypes.ts
  SceneLabels.tsx
  SceneRingsLayer.tsx
```

## RadarSvg

`RadarSvg/` agrupa overlays SVG 2D do radar. O arquivo [`RadarSvg/RadarSvgLayers.tsx`](./RadarSvg/RadarSvgLayers.tsx) deve permanecer pequeno e orquestrador, apenas compondo as subcamadas de aneis, corpos, vetores, trajetorias, marcadores, labels e tooltip.

Esses arquivos recebem coordenadas, opacidades, labels e estados ja resolvidos. Eles nao calculam orbitas, nao chamam APIs, nao decidem ranking global e nao criam fallback Horizons/CAD.

## Labels de cena

[`SceneLabels.tsx`](./SceneLabels.tsx) concentra labels HTML sobre a cena 3D, alem de regras locais de oclusao visual e protecao contra zonas ocupadas por cards. Ele interpreta posicoes de cena ja fornecidas pelos componentes consumidores.

## Guias 3D

[`SceneRingsLayer.tsx`](./SceneRingsLayer.tsx) contem guias visuais 3D. O nome explicita que esta camada pertence a cena `three.js`, evitando confusao com os aneis SVG do radar.

## Regras para IA/refatoracao

- Preserve a separacao entre visualizacao e calculo.
- Se um componente de overlay estiver precisando explicar posicao real, efemeride ou selecao global, a regra provavelmente pertence a outra camada.
- Prefira helpers pequenos e especificos a abstracoes genericas que escondam a ordem visual das camadas.
- Ao reorganizar `RadarSvg`, mantenha o arquivo principal como compositor e deixe detalhes de renderizacao nas subcamadas.

## Regra para IA

Ao editar esta pasta, nao mova calculo orbital, ranking de aproximacao, chamadas de API ou fallback Horizons/CAD para componentes de overlay. Se uma regra comecar a explicar posicao real, efemeride ou selecao global, ela pertence a uma camada de dados/calculo, nao a `Overlays`.
