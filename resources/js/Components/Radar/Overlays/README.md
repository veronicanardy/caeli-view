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
  SceneLabels.tsx
  SceneRingsLayer.tsx
  StarField.tsx
```

## Labels De Cena

[`SceneLabels.tsx`](./SceneLabels.tsx) concentra labels HTML sobre a cena 3D, além de regras locais de oclusão visual e proteção contra zonas ocupadas por cards. Ele interpreta posições de cena já fornecidas pelos componentes consumidores.

## Guias 3D

[`SceneRingsLayer.tsx`](./SceneRingsLayer.tsx) contém guias visuais 3D da cena `three.js`.

## Campo Estelar

[`StarField.tsx`](./StarField.tsx) gera ~1800 partículas procedurais que seguem a câmera, criando profundidade visual sem afetar cálculos orbitais. O RNG usa seed fixo (42) para resultado determinístico entre sessões.

## Regra Para IA

Ao editar esta pasta, não mova cálculo orbital, ranking de aproximação, chamadas de API ou fallback Horizons/CAD para componentes de overlay. Se uma regra começar a explicar posição real, efeméride ou seleção global, ela pertence a uma camada de dados/cálculo, não a `Overlays`.
