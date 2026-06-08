# Trajectory

## Responsabilidade

Renderizar trajetórias visuais, linhas heliocêntricas, marcadores e cone de direção a partir de dados já calculados por outras camadas do `ApproachObservatory`.

## O que pode conter

- Componentes de renderização de linhas de trajetória e órbitas.
- Marcadores temporais e de máxima aproximação.
- Cone de direção com base em vetores já resolvidos.
- Helpers leves de apresentação, opacidade e visibilidade local.

## O que não deve conter

- Chamadas de API externas.
- Busca ou fallback de Horizons/CAD.
- Ranking global de aproximação.
- Seleção global, foco global ou mudança de câmera.
- Cálculo orbital pesado ou lógica científica que pertence a `lib`.

## Estrutura

- `NowTrajectory.tsx`: compositor principal da trajetória geocêntrica atual.
- `GradientTrajectoryLine.tsx`: linha 3D com gradiente de opacidade.
- `DirectionCone.tsx`: cone 3D que aponta a direção de deslocamento.
- `TrajectoryMarkers.tsx`: ticks temporais e marcador de máxima aproximação.
- `trajectoryConstants.ts`: constantes visuais compartilhadas por linhas, cone e marcadores.
- `nowTrajectoryPresentation.ts`: helpers puros de apresentação.
- `useNowTrajectoryPresentation.ts`: hook que deriva a apresentação da trajetória atual para manter `NowTrajectory` como compositor fino.
- `HeliocentricLines.tsx`: órbitas heliocêntricas já amostradas ou geradas por elipse simples.

## Trajetória atual

`NowTrajectory` recebe `pastPoints`, `futurePoints` e `currentPoint` já preparados, recorta o trecho visível, mantém a regra de `coneOnly`, preserva a priorização da direção por velocidade real e só mostra o marcador de máxima aproximação quando o ponto está no trecho desenhado ou quando o objeto está enfatizado.

`NowTrajectory.tsx` deve permanecer como compositor visual. Derivações de vetores, ticks, opacidades e marcador de direção devem ficar em `useNowTrajectoryPresentation.ts` ou helpers puros de `nowTrajectoryPresentation.ts`.

## Linhas heliocêntricas

`HeliocentricLines.tsx` existe para desenhar linhas persistentes no espaço heliocêntrico. Ele não recalcula órbitas reais da aplicação; apenas transforma pontos ou parâmetros orbitais simples em geometria THREE.

## Marcadores e cone de direção

Os marcadores e o cone recebem posições e vetores já resolvidos. Eles não corrigem dados científicos nem reinterpretam o significado orbital dos pontos.

## Regras para IA/refatoração

- Preserve comportamento visual, científico, matemático e interativo.
- Não mova lógica pesada de `@/lib/observatory/trajectorySampling` para esta pasta.
- Evite abstrações genéricas demais; prefira helpers pequenos e locais.
- Todo arquivo de `Trajectory` deve iniciar com documentação em português explicando responsabilidade e fronteiras.
- Constantes visuais compartilhadas devem ficar em `trajectoryConstants.ts`.
- Use esta pasta para renderização e adaptação visual, não para decidir a verdade dos dados.

## Regra para IA

Ao editar esta pasta, não mova chamadas de API, ranking de aproximação, fallback Horizons/CAD, seleção global ou cálculo orbital pesado para componentes de trajetória. `Trajectory` deve renderizar caminhos e marcadores a partir de dados já recebidos, não decidir a verdade científica dos dados.
