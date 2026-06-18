# Comet

Identidade fixa e elementos orbitais dos cometas famosos do radar (Halley, Encke, 67P, NEOWISE). Contraparte cometária de `Bodies/Asteroid/knownAsteroids.ts`.

## Responsabilidades

* `knownComets.ts`: catálogo dos cometas famosos (designação, nome, diâmetro estimado do núcleo, ids sintéticos `comet:<designacao>`) e elementos orbitais osculadores (eclíptico J2000) usados como **posição de fallback** na régua linear dos planetas, via propagador de Kepler. Expõe `knownCometScenePosition`, `knownCometPlacements`, `knownCometId`, `isKnownCometId` e `knownCometById`.

## Fronteiras

* A posição **principal** dos cometas vem do JPL Horizons ao vivo (`/radar/famous`, backend `FamousComets`), igual a qualquer objeto da cena. Os elementos daqui só entram quando o Horizons falha, garantindo que nenhum cometa suma.
* Não decide seleção global, câmera nem ranking. Não calcula Horizons nem SBDB.
* O **desenho** (modelo, hitbox, label) do fallback vive em `Scene/KnownCometsLayer.tsx`, não aqui. Esta pasta só guarda identidade e cálculo de posição.

## Visual

Ainda não há GLB exclusivo de cometa. Todos reusam o modelo genérico de asteroide recolorido com um tint gelado (ver `KnownCometsLayer`). Quando a NASA fornecer modelos 3D reais (67P, Halley têm GLB públicos), basta registrá-los em `Asteroid/asteroidModelRegistry.ts` com `modelKey` próprio e casar a identidade, igual aos 5 asteroides com modelo exclusivo.

## Testes relacionados

`tests/js/Radar/knownComets.test.ts` (posição na faixa periélio–afélio, identidade sintética distinta da de asteroides).
