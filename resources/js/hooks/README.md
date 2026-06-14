# hooks

## Responsabilidade

Hooks React reutilizáveis entre páginas e componentes. Cada arquivo expõe um único hook com responsabilidade clara: busca de dados de uma feature, estado compartilhado de controles ou utilitários de browser.

## O Que Pode Conter

- hooks de busca/polling de dados já expostos pelo backend (fetch + estado de loading/erro);
- hooks de estado de controles compartilhados entre componentes de uma página;
- utilitários de browser (media queries, localização do usuário).

## O Que Não Deve Conter

- componentes ou JSX;
- regras de domínio científico (cálculo orbital, ranking, efemérides) — vivem em `lib/`;
- hooks usados por um único componente — ficam ao lado do componente (ex.: `Components/Radar/Panels/useBottomSheetDrag.ts`).

## Estrutura

- `useClosestNow.ts`: objetos mais próximos da Terra agora (radar), com critério, limite e refresh.
- `useHomeAstronomyFeed.ts`: feed astronômico da home.
- `useMediaQuery.ts`: estado reativo de uma media query CSS (resize/rotação); false em SSR até o primeiro render no browser.
- `useRadarControls.ts`: estado central dos controles do radar (quantidade + critério), com reset para 5 objetos ao trocar critério.
- `useSkyObservation.ts`: dados de observação do céu.
- `useSpaceNewsHighlight.ts`: destaque de notícias espaciais.
- `useUserLocation.ts`: localização do usuário (geolocalização/fallback).
- `useVisibleObjects.ts`: objetos visíveis para observação.

## Regra Para IA

Ao editar esta pasta, mantenha cada hook independente de componentes específicos e sem regra de domínio científico. Hooks de uso local de um único componente não devem ser promovidos para cá sem segundo consumidor.
