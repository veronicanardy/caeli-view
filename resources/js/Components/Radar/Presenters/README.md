# Presenters

## Responsabilidade

`Presenters` reúne componentes pequenos e reutilizáveis de apresentação visual do `Radar`. Eles recebem dados já resolvidos por outras camadas e os organizam em badges, réguas e elementos visuais leves.

## O Que Pode Conter

- badges e labels visuais;
- réguas e comparações de distância;
- formatação simples para exibição;
- elementos visuais pequenos que não controlam estado global.

## O Que Não Deve Conter

- chamadas a APIs externas;
- cálculo orbital real;
- ranking global de aproximações;
- seleção global de objetos;
- controle de câmera ou modo orbital;
- fallback Horizons/CAD;
- conversão de posição simbólica em posição real;
- regra científica ou matemática pesada.

## Estrutura

- `ObjectTypeBadge.tsx`: badge compacto do tipo do pequeno corpo.
- `EarthMoonRuler.tsx`: régua visual Terra-Lua e posição relativa do objeto.

## Remoção Do Caminho 2D

Os presenters usados apenas pelo radar 2D/SVG e pelo painel lateral antigo foram removidos: marcador SVG de aproximação, legenda de distância, card de fidelidade visual e prévia procedural embutida. A cena 3D usa seus próprios corpos, trajetórias e painéis.

## Regra Para IA

Ao editar esta pasta, não mova cálculo orbital, ranking de aproximação, chamadas de API, fallback Horizons/CAD, seleção global ou controle de câmera para componentes de apresentação. Presenters devem apenas renderizar e organizar dados já recebidos.
