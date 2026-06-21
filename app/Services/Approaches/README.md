# Services/Approaches — Orquestração do Radar

Este diretório contém os serviços responsáveis pela lógica de negócio do radar de aproximações. Cada classe tem uma responsabilidade única e bem delimitada; o controller não contém regras de negócio.

## Visão geral do fluxo

```
RadarController
  ├─ index()        → RadarService@observe()         → payload da página do observatório
  ├─ closestNow()   → ClosestNowSelector@select()    → N objetos mais próximos agora
  ├─ trajectory()   → HorizonsTrajectoryService      → trajetória vetorial geocêntrica
  └─ asteroidModel() → AsteroidModelResolverService  → modelo 3D com nível de fidelidade
```

## Responsabilidades por classe

### RadarService

Orquestrador principal da página do observatório.

- Normaliza filtros via `ApproachFilterNormalizer`
- Dispara NeoWs + CAD em paralelo via `Concurrency::run()`
- Delega merge e dedup a `ApproachMerger`
- Delega sumário e gráficos a `ApproachSummarizer`
- Cache com stale-while-revalidate (TTL 6h + margem 1h)

**O que não pertence aqui:** parsing de resposta das APIs, conversão de unidades, lógica de identidade de objetos.

### ClosestNowSelector

Pipeline para determinar quais objetos estão fisicamente mais próximos da Terra *agora*.

O CAD registra a distância no pico de máxima aproximação (um instante fixo). Este serviço corrige isso consultando o JPL Horizons para obter vetores reais e reordena os candidatos pela distância atual real.

**Modos de seleção:**
- `nearest` — top-N por miss_distance nominal + todos os PHAs; janela ±3 dias em torno de agora
- `upcoming` — próximas 30 dias a partir da data âncora; ordenados por proximidade temporal com agora. A busca usa `dist_max=0.1` (mais largo) para que objetos de fronteira também venham do CAD e o merger corrija a distância para a do JPL; o corte de **exibição** é `UPCOMING_DISPLAY_DIST_AU=0.05` (~19,5 distâncias lunares, mesmo critério de close-approach do JPL/Eyes), aplicado sobre a distância já corrigida

**Estratégia lazy-loading do Horizons:**
- Apenas os `limit + HORIZONS_MARGIN` candidatos mais próximos consultam o Horizons
- Demais candidatos usam `nominalDistanceKm` como fallback (`hasRealCurrentDistance: false`)
- Cache individual por objectId no `HorizonsTrajectoryService` é reutilizado entre expansões de limit

**Constantes importantes:**
| Constante | Valor | Significado |
|-----------|-------|-------------|
| `TOP_CANDIDATES` | 45 | Máximo de candidatos buscados no CAD antes de qualquer corte |
| `RESULT_LIMIT_MAX` | 45 | Teto aceito pelo endpoint e usado por "Todos" no front |
| `HORIZONS_MARGIN` | 5 | Extras consultados no Horizons além do limit (reserva de falha) |
| `HORIZONS_BATCH_SIZE` | 8 | Objetos por lote paralelo (acima disso os timeouts explodem) |
| `RESULT_CACHE_TTL_SECONDS` | 900 | TTL do resultado resolvido (15 min) |

### AsteroidModelResolverService

Determina qual modelo 3D usar para representar um asteroide, aplicando uma hierarquia de fidelidade:

| Nível | Tipo | Condição |
|-------|------|----------|
| N1 | `real_shape` | GLB de missão científica disponível (Bennu, Eros, Itokawa, Vesta, Ceres) |
| N2 | `catalog_reference` | Objeto no catálogo, mas sem GLB configurado (ex.: Ryugu) |
| N3 | `procedural` | Diâmetro medido + identidade orbital (SPK-ID ou designação) |
| N4 | `procedural` | Apenas intervalo de diâmetro estimado |
| N5 | `size_placeholder` | Sem dados físicos |

A correspondência com o catálogo (N1/N2) usa o mesmo critério inequívoco do front (`asteroidModelRegistry.ts`): **aliases** batem por palavra inteira (evita "eros" em "Heros") e **números** por igualdade do campo inteiro em designation/detailIdentifier, tolerando "(N)" (evita "433" em "2000433" e números baixos como Ceres=1 em fragmentos como "2001 AB1"; o SPK-ID, que é `2000000 + número`, nunca é usado para casar número). Isso substituiu o `str_contains` anterior, que gerava falsos positivos. Os `modelUrl` apontam para os GLBs em `public/models/asteroids/`, as mesmas URLs que o front usa.

O `shapeSeed` é determinístico por objeto: o mesmo asteroide sempre recebe a mesma semente, garantindo aparência consistente entre sessões.

### ApproachFilterNormalizer

Fonte única de verdade para os filtros padrão do observatório: `date_min/date_max` (hoje), `type=all`, `dist_max=0.2`, `sort=dist`, `distance_unit=km`.

### ApproachMerger

Combina resultados do NeoWs e do CAD em uma coleção única, removendo duplicatas por chave semântica (`designation:data`) e ordenando conforme o critério selecionado.

Em colisão entre fontes (mesmo objeto+data vindo do NeoWs **e** do CAD), o **CAD vence**: é a solução orbital integrada do JPL (alta precisão), a mesma referência do NASA Eyes. NeoWs e CAD reportam distâncias levemente distintas; preferir a do CAD mantém o radar coerente com o JPL, inclusive nos cortes por distância (um objeto na fronteira do corte não entra só porque a distância do NeoWs ficou abaixo enquanto a do JPL não). Dentro da mesma fonte, mantém a primeira ocorrência.

### ApproachSummarizer

Gera projeções estatísticas puras (sem persistência) para o frontend:
- `summary()` — totais, destaques (mais próximo, mais rápido), PHAs
- `charts()` — séries por dia, por tipo, por fonte, top-6 próximos e rápidos

---

## Limites entre camadas

```
Controller        — recebe request, delega, retorna JSON. Sem regras de negócio.
FormRequest       — validação de entrada. Sem transformações de negócio.
Service           — orquestração, cache, regras de negócio.
DTO               — conversão e normalização de dados externos. Imutáveis.
Support           — helpers stateless reutilizáveis (DistancePresenter, AsteroidIdentityNormalizer).
```

O controller não deve:
- Calcular distâncias ou converter unidades
- Montar chaves de cache
- Conter lógica de dedup ou ordenação
- Conhecer o formato interno das APIs externas

---

## Testes

Os testes de feature cobrem o comportamento externo dos endpoints:

| Arquivo | Cobre |
|---------|-------|
| `RadarPageTest` | Renderização Inertia, contrato JSON do observe, validação de formulário, fallback de fontes |
| `RadarClosestNowTest` | Validações, modos nearest/upcoming, force_refresh, fallback nominal do Horizons, fallback total |
| `RadarTrajectoryAndModelTest` | Âncoras, validações, graceful fallback do Horizons, hierarquia N1–N5, seed determinístico |

Os testes de unidade relevantes:

| Arquivo | Cobre |
|---------|-------|
| `UnifiedApproachDataTest` | Normalização NeoWs e CAD para o observatório |
| `CloseApproachDataTest` | Parse de registro CAD e inferência de tipo |
| `AsteroidIdentityNormalizerTest` | Parsing de nomes MPC (formatos variados) |

---

## Cache

| Camada | Chave | TTL |
|--------|-------|-----|
| RadarService@observe | `approach-observatory:{md5(filtros)}` | 6h + 1h stale |
| ClosestNowSelector | `closest-now:v12:{md5(params)}` | 15min + 15min stale |
| HorizonsTrajectoryService (current) | por objectId + bucket de 15min | 15min |
| HorizonsTrajectoryService (around-now) | por objectId + âncora | 30min |
| AsteroidModelResolverService | `asteroid-model:v1:{md5(objeto)}` | 7 dias + 1 dia stale |

Incrementar a versão na chave de cache (`v12`, `v1`) quando o formato de saída mudar.

**Proteção contra cache envenenado:** resultado vazio causado por falha das fontes (CAD/NeoWs indisponíveis) não é persistido. `RadarService@observe` descarta a entrada quando `approaches` está vazio e `errorsBySource` está preenchido; `ClosestNowSelector@select` faz o mesmo quando `objects` está vazio e `sourcesFailed` é `true`. O vazio ainda é retornado para a requisição corrente, mas a próxima tentativa consulta as APIs novamente. Sem isso, uma indisponibilidade transitória (ex: DNS do Docker logo após o container subir) deixaria o radar vazio por até 6 horas. Cobertura: `ClosestNowSelectorTest::test_resultado_vazio_por_falha_das_fontes_nao_fica_preso_no_cache`.
