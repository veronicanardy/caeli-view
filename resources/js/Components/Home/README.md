# Home

Componentes da página inicial do CaeliView: o hero "horizonte orbital", com a Terra vista de órbita baixa, fundo cósmico e console de observação.

## Responsabilidade

Esta pasta monta a experiência visual da Home: bloco editorial centralizado, horizonte 3D do planeta, fundo cósmico e o console com leituras do céu local. Ela recebe dados por props ou hooks compartilhados (`useSkyObservation`, `useVisibleObjects`, `useHomeAstronomyFeed`) e não deve buscar APIs diretamente nem conter regra de domínio astronômico, que pertence a `lib/` e `services/`.

## Conceito visual

A Terra não é um globo ao lado do texto: é um horizonte colossal na base da tela, como visto da janela de uma estação em órbita baixa. O arco atmosférico ciano no limbo (shader fresnel dentro da cena) é a assinatura visual da página. O conteúdo fica centralizado acima e os quatro módulos de dados formam uma barra única de instrumentos (console) pousada sobre o brilho do horizonte.

## Arquivos

Árvore ativa (montada por `Pages/Home.tsx`):

- `CinematicHero.tsx`: orquestrador do hero. Bloco editorial central (badge, marca, frase-promessa, descrição de apoio, microcopy NASA/JPL, CTA com cena de opções), console de observação com localização integrada no cabeçalho e overlays de vignette.
- `CinematicEarthScene.tsx`: horizonte da Terra em Three.js puro. Câmera a `ORBIT_ALTITUDE` acima da superfície (constantes de enquadramento no topo do arquivo), texturas reais NASA com cascata de fallback, nuvens com sombra projetada, luzes noturnas Black Marble, brilho oceânico e arco atmosférico fresnel no limbo. Fallback de horizonte em CSS quando tudo falha.
- `CinematicSpaceBackdrop.tsx`: fundo em um único canvas Three.js: nebulosa FBM, três camadas de estrelas estáticas com parallax e cometa ocasional confinado ao céu superior.
- `heroSkyCopy.ts`: funções puras de copy do céu (nota de observação, visibilidade, lista de planetas, data de aproximação, fase lunar). Testadas em `tests/js/Home/heroSkyCopy.test.ts`.

Legado não montado atualmente (versões anteriores do hero, mantidas para referência): `InteractiveHero.tsx`, `EarthStage.tsx`, `LiveSkyDashboard.tsx`, `SpaceBackground.tsx`, `StarField.tsx`, `StarfieldParallax.tsx`, `HomeBackgroundEffects.tsx`, `AtmosphereGlow.tsx`, `FloatingMissionCard.tsx`, `MissionMetricCard.tsx`, `NasaHighlightCard.tsx`, `OrbitalFeatureCard.tsx`.

## Padrões Locais

- Todo arquivo deve começar com documentação em português explicando sua responsabilidade.
- Cenas WebGL importam `three` dinamicamente, marcam `ready` apenas após o primeiro frame válido renderizado e sempre liberam geometria, materiais e texturas no cleanup.
- Tudo que anima continuamente deve usar apenas `transform`/`opacity` e respeitar `prefers-reduced-motion`.
- Copy derivada de dados do céu vive em `heroSkyCopy.ts` como função pura bilíngue (parâmetro `en`); textos fixos vivem em `i18n/`.
- Estilos do hero vivem em `resources/css/app.css` (seções `home-*`, `hero-*`, `observatory-console`/`console-*`, `editorial-*`, `cinematic-earth-shell`). Cada célula do console define a própria cor via `--card-accent`.
- Decorativos não interativos devem manter `aria-hidden` e `pointer-events: none`.
