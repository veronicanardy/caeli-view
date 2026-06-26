# Spacecraft

Identidade fixa e posição das naves e missões interplanetárias famosas do radar (Voyager 1, Voyager 2, Pioneer 10, New Horizons, Juno). Terceira contraparte de `Bodies/Asteroid/knownAsteroids.ts` e `Bodies/Comet/knownComets.ts`, agora para objetos **artificiais**.

## Por que as naves são diferentes de asteroides e cometas

* **Vivem na cena como os planetas, não como os famosos.** Estão SEMPRE presentes (qualquer modo de lista), não entram no feed `/radar/famous` nem competem por proximidade. O foco é feito pelo flyout "Naves" nas Referências, igual ao de planetas.
* **Não seguem Kepler.** Os Voyager e o Pioneer estão em trajetória HIPERBÓLICA de escape (já deixaram o Sistema Solar planetário); a Juno orbita Júpiter. Propagar elementos osculadores daria posição errada. A posição PRINCIPAL vem do JPL Horizons AO VIVO (endpoint `/radar/spacecraft` → `SpacecraftPositionSelector`, vetor heliocêntrico em UA), e o **vetor fixo** local (`helioAU`, instantâneo de meados de 2026) é o FALLBACK quando o Horizons falha. Assim a nave nunca some e, quando há rede, a posição é a real do dia.
* **Não têm diâmetro nem aproximação.** São estruturas de poucos metros, sub-pixel em qualquer escala. O card mostra os campos físicos como null (como os cometas sem aproximação) e o corpo na cena não é escalado por tamanho real, é o modelo 3D real da NASA numa escala simbólica de legibilidade.

## Responsabilidades

* `knownSpacecraft.ts`: catálogo das naves (id do Horizons `horizonsId` = SPK negativo, nome, agência/ano `operator`, vetor heliocêntrico fixo `helioAU` de fallback, ids sintéticos `spacecraft:<horizonsId>`). `resolveSpacecraftHelioAU(craft, live)` é a fonte única da posição EFETIVA: a posição ao vivo (mapa `LiveSpacecraftPositions` do endpoint) quando há, senão o vetor fixo, com um flag `live`. Layer, foco de câmera e card todos passam por ela. Expõe `knownSpacecraftScenePosition`, `knownSpacecraftPlacements`, `knownSpacecraftId`, `isKnownSpacecraftId`, `knownSpacecraftById`, `knownSpacecraftHeliocentricDistanceKm` e os builders do card local `knownSpacecraftToApproach` / `knownSpacecraftToClosestNowObject` (que monta um `ClosestNowObject` sintético para reaproveitar TODA a máquina do `UnifiedFocusCard`: kind="asteroid", aba História pelo id `spacecraft:<id>`; `hasRealCurrentDistance` segue o flag live).
* `SpacecraftModel.tsx`: carrega o GLB REAL da nave (NASA), centraliza e normaliza (maior eixo = 2), preservando os materiais originais da NASA (a nave já vem texturizada/colorida, ao contrário dos shape models "pelados" de asteroide, então NÃO recolore nem força flatShading). Aplica opacidade e contorno de seleção. É um componente separado do RealAsteroidModel de propósito.
* `spacecraftModelRegistry.ts`: mapeia cada nave (por `horizonsId`) ao seu GLB e expõe `spacecraftModelAsset` e `preloadSpacecraftModels`. Voyager 1 (-31) e Voyager 2 (-32) compartilham o mesmo GLB (gêmeas). Os GLBs vivem em `public/models/spacecraft/` (ver CREDITS.md).
* `SpacecraftMarker.tsx`: forma 3D SIMBÓLICA e sóbria de sonda (corpo, painéis, antena), sem GLB. Hoje é só o FALLBACK enquanto o GLB carrega (Suspense) ou se ele falhar. Os modelos reais da NASA são o caminho principal.

## Fronteiras

* A posição ao vivo vem do backend (`app/Services/Approaches/SpacecraftPositionSelector.php` → endpoint `/radar/spacecraft`), buscada por `hooks/useSpacecraftPositions.ts` no load e repassada como `LiveSpacecraftPositions`. O vetor fixo daqui é só o fallback.
* O **desenho** (marcador, hitbox, label) vive em `Scene/KnownSpacecraftLayer.tsx`. Esta pasta só guarda identidade, posição (fixa + resolução com a ao vivo) e o objeto sintético do card.
* O **flyout "Naves"** e o foco de câmera vivem em `Controls/ReferenceControls.tsx` (`SpacecraftFlyout`) e `useRadar3DFocusActions.ts` (`focusSpacecraft`).
* Não decide seleção global, câmera nem ranking.

## Satélites de órbita terrestre (decisão: fora)

Satélites como ISS, Hubble e geoestacionários **não cabem** na régua heliocêntrica linear. A ~420 km a ~36.000 km da Terra, todos caem DENTRO do disco visual exagerado da Terra (raio 0,11 un. de cena, ~8,6× a Terra real na régua): até o geoestacionário fica a ~65% do raio do disco. Não é questão de zoom, o satélite estaria embutido na geometria da esfera. Mostrá-los exigiria uma cena geocêntrica separada (a `?log` removida de propósito) ou mentir na posição (contra a régua honesta). Por isso só naves interplanetárias entram aqui.

## Testes relacionados

* `tests/js/Radar/knownSpacecraft.test.ts` (posição fixa na régua, Voyager além de Netuno e Juno na faixa de Júpiter, identidade sintética distinta de asteroides e cometas, objeto de card honesto sem diâmetro).
* `tests/js/Radar/famousLore.test.ts` (história PT/EN de cada nave, sem travessão).
