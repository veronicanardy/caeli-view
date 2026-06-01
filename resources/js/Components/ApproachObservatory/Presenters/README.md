# Presenters

## Responsabilidade

`Presenters` reúne componentes pequenos e reutilizáveis de apresentação visual do
`ApproachObservatory`. Eles recebem dados já resolvidos por outras camadas e os
organizam em marcadores, badges, réguas, cards e prévias ilustrativas.

## O que pode conter

- Badges e labels visuais.
- Marcadores de objetos e formas SVG simples.
- Réguas e legendas de distância.
- Cards de apresentação com dados já calculados.
- Formatação simples para exibição.
- Prévias visuais ilustrativas baseadas em metadados recebidos.

## O que não deve conter

- Chamadas a APIs externas.
- Cálculo orbital real.
- Ranking global de aproximações.
- Seleção global de objetos.
- Controle de câmera ou modo orbital.
- Fallback Horizons/CAD.
- Conversão de posição simbólica em posição real.
- Regra científica ou matemática pesada.

## Estrutura

- `ApproachObjectMarker.tsx`: marcador interativo do objeto no observatório.
- `AsteroidMarkerShape.tsx`: forma SVG ilustrativa para asteroides, cometas e outros corpos.
- `ObjectTypeBadge.tsx`: badge compacto do tipo do pequeno corpo.
- `DistancePresenter.tsx`: apresentação textual de distância.
- `DistanceLegend.tsx`: legenda da escala lunar.
- `EarthMoonRuler.tsx`: régua visual Terra-Lua e posição relativa do objeto.
- `AsteroidFidelityModel.tsx`: card principal de fidelidade do modelo visual.
- `ProceduralAsteroidPreview.tsx`: prévia procedural 3D com Three.js.
- `asteroidFidelityPresentation.ts`: helpers de texto e valores simples do card de fidelidade.

## Marcadores e badges

Marcadores e badges devem continuar leves, estáveis e previsíveis. Eles podem
receber dados de atenção, tipo de objeto e identidade já resolvidos, mas não
devem decidir ranking, seleção global ou relevância científica.

## Réguas e distância

Réguas e legendas podem exibir distâncias, comparações lunares e labels já
calculados. A escala visual pode conter compressões ou escolhas de apresentação,
mas não deve assumir cálculo orbital ou derivar trajetória real.

## Fidelidade/modelo visual

O card de fidelidade apresenta metadados do modelo visual e uma prévia
procedural ilustrativa. A prévia pode usar seed, nível de fidelidade e diâmetro
já recebidos, mas não deve buscar catálogo externo, resolver fallback ou
transformar placeholder em modelo físico real.

## Regras para IA/refatoração

Mantenha refatorações moderadas e próximas dos componentes existentes. Extraia
helpers quando isso reduzir duplicação real ou isolar uma responsabilidade clara,
mas evite criar abstrações genéricas demais para elementos pequenos.

Preserve classes visuais, textos em inglês, comportamento interativo, contratos
públicos e cleanup de efeitos. Ao corrigir textos em português, não renomeie
chaves técnicas, tipos, funções ou imports apenas por causa de acento.

## Regra para IA

Ao editar esta pasta, não mova cálculo orbital, ranking de aproximação,
chamadas de API, fallback Horizons/CAD, seleção global ou controle de câmera
para componentes de apresentação. Presenters devem apenas renderizar e
organizar dados já recebidos.
