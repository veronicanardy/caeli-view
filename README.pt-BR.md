# CaeliView (pt-BR)

CaeliView é uma aplicação web construída com Laravel, Inertia.js e React para explorar dados de objetos próximos da Terra e pequenos corpos do Sistema Solar, usando APIs públicas da NASA e do JPL.

## Visão Geral

O projeto centraliza integrações externas no backend Laravel, normaliza respostas heterogêneas e entrega os dados para a interface React via Inertia.js.

Em vez de manter uma API REST interna separada para cada tela, os controllers retornam respostas Inertia com dados já validados e preparados para renderização.

## Funcionalidades Principais

- Home cinematográfica com cena Three.js totalmente customizada da Terra (textura NASA Blue Marble de dia, luzes noturnas Black Marble, mapas de normal e specular reais, atmosfera com twilight, camada de nuvens com projeção de sombras direcionada ao sol, campo de estrelas em múltiplas camadas com cintilação por estrela e renderização com fallback seguro).
- Painel vivo na Home com:
  - Céu local (`Open-Meteo` + `7Timer`) roteado por proxy no backend para evitar requisições cross-origin no frontend.
  - Objetos visíveis hoje (Lua, Vênus, Marte, Júpiter e Saturno) com cálculo local via `astronomy-engine` (carregado como chunk lazy próprio).
  - Destaque espacial (SNAPI) com fallback para APOD.
  - Próxima aproximação relevante de objeto próximo da Terra.
  - Localização legível obtida por reverse geocoding (BigDataCloud) também via proxy no backend.
- Observatório de Aproximações (`/radar`) combinando NASA NeoWs e JPL CAD, com referência visual da Terra via EPIC quando disponível.
- Painel de asteroides (`/asteroides`) e detalhe de asteroide (`/asteroides/{asteroidId}`).
- Galeria EPIC (`/epic`) com busca por data.
- Página APOD (`/apod`) com busca por data e tratamento seguro para imagem/vídeo.
- Módulo de pequenos corpos (`/viajantes`, `/viajantes/{identifier}`) usando CAD e SBDB do JPL.
- Página "Sobre" (`/sobre`) descrevendo o projeto.
- Interface bilíngue (`pt-BR` padrão e `en`) com dicionários centralizados.
- Carregamento progressivo: páginas pesadas renderizam imediatamente e buscam o payload em endpoints JSON dedicados (`/radar/data`, `/epic/data`, `/apod/data`, `/home/astronomy-feed`) com headers `Cache-Control`.
- Validação de entrada, tratamento de exceções, cache stale-while-revalidate (`Cache::flexible()`), fan-out paralelo de chamadas (`Concurrency::run()`) e rate limit.

## Stack Tecnológica

Backend:

- PHP 8.4
- Laravel 13
- Inertia Laravel 2
- Guzzle HTTP

Frontend:

- React 19
- TypeScript
- Inertia React 2
- Tailwind CSS
- Recharts
- `three` (cena cinematográfica customizada da Terra na Home)
- `react-globe.gl` (globo interativo em telas secundárias)
- `astronomy-engine`
- Vite 6 (com chunk manual para o motor de astronomia)

Infra / Ferramentas:

- Docker Compose
- PostgreSQL 17
- Redis 7
- PHPUnit 12
- Laravel Pint

## APIs Externas

- NASA Open APIs: https://api.nasa.gov/
- JPL SSD/CNEOS API Service: https://ssd-api.jpl.nasa.gov/
- JPL CAD docs: https://ssd-api.jpl.nasa.gov/doc/cad.html
- JPL SBDB docs: https://ssd-api.jpl.nasa.gov/doc/sbdb.html
- Spaceflight News API (SNAPI): https://api.spaceflightnewsapi.net/v4/docs/
- Open-Meteo: https://open-meteo.com/
- 7Timer Astro: https://www.7timer.info/doc.php?lang=en
- BigDataCloud reverse geocoding: https://www.bigdatacloud.com/docs/api/free-reverse-geocode-to-city-api

Endpoints usados atualmente:

- NASA NeoWs: `GET /neo/rest/v1/feed`, `GET /neo/rest/v1/neo/{id}`
- NASA EPIC: `GET /EPIC/api/natural`, `GET /EPIC/api/natural/date/{date}`
- NASA APOD: `GET /planetary/apod`
- JPL CAD: `GET /cad.api`
- JPL SBDB: `GET /sbdb.api`
- SNAPI: `GET /v4/articles`
- Open-Meteo Forecast: `GET /v1/forecast`
- 7Timer Astro: `GET /bin/astro.php`
- BigDataCloud reverse geocode (via proxy no backend)

## Arquitetura (Resumo)

```text
APIs Públicas NASA/JPL
        ↓
Services no Laravel
        ↓
Controllers + Form Requests
        ↓
Inertia.js
        ↓
Pages e Components React
```

- Laravel cuida de rotas, validação, integração externa, cache e tradução de erros.
- Inertia entrega os dados do backend diretamente para as páginas React.
- React compõe a interface, gráficos e interações visuais client-side.
- Enriquecimentos da Home são carregados de forma assíncrona por `/home/astronomy-feed`, preservando o primeiro render rápido.

## Decisões de Projeto

- Integrações externas isoladas por provedor: `app/Services/Nasa/*`, `app/Services/Jpl/*` e `app/Services/SpaceNews/*`.
- Agregação de fontes mistas isolada em `app/Services/Approaches/ApproachObservatoryService.php`, que usa `Concurrency::run()` para disparar NeoWs e JPL CAD em paralelo.
- DTOs em `app/DTOs/*` normalizam payloads antes da renderização.
- Páginas pesadas retornam um payload Inertia mínimo e buscam os dados em endpoints JSON dedicados (`/radar/data`, `/epic/data`, `/apod/data`, `/home/astronomy-feed`) com headers `Cache-Control` — elimina chamadas externas bloqueantes no SSR inicial.
- Endpoints de terceiros que o navegador chamaria cross-origin (céu local, reverse geocoding) são roteados por proxies no backend (`/proxy/sky-observation`, `/proxy/reverse-geocode`), centralizando chaves, cache e tratamento de erro.
- Lógica client-side de observação fica em `resources/js/services/*` e `resources/js/hooks/*`, com cache leve e fallback robusto.
- Cache usa `Cache::flexible()` (stale-while-revalidate): endpoints quentes servem dados em cache imediatamente e revalidam em background.
- O projeto não utiliza Repository Pattern no momento, pois a maior parte dos dados vem de APIs externas.

## Estratégia de Erros e Fallback

- Clientes HTTP externos mapeiam falhas para exceções de domínio.
- Controllers tratam exceções e ainda retornam payloads seguros.
- Mensagens de disponibilidade e rate-limit são amigáveis ao usuário.
- Respostas externas usam cache com TTL configurável em `config/services.php`.
- `NASA_API_KEY` fica somente no servidor, não exposta no frontend.
- Home continua funcional sem geolocalização e sem depender de sucesso das APIs externas.

## Instalação

Clone e entre no projeto:

```bash
git clone https://github.com/veronicanardy/caeli-view.git
cd caeli-view
```

Crie o arquivo de ambiente local:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Defina sua chave da NASA:

```env
NASA_API_KEY=DEMO_KEY
```

Instale dependências e prepare a aplicação:

```bash
docker compose build
docker compose run --rm app composer install
docker compose run --rm app npm install
docker compose run --rm app php artisan key:generate
```

Suba os serviços e rode migrations:

```bash
docker compose up -d
docker compose exec app php artisan migrate
```

Rode o frontend em modo dev:

```bash
docker compose exec app npm run dev -- --host=0.0.0.0
```

URL da aplicação:

```text
http://localhost:8000
```

## Variáveis de Ambiente

Integrações lidas de `.env` via `config/services.php`:

- `NASA_API_BASE_URL`
- `NASA_API_KEY`
- `NASA_TIMEOUT_SECONDS`
- `NASA_CACHE_TTL_SECONDS`
- `NASA_EPIC_CACHE_TTL_SECONDS`
- `NASA_APOD_CACHE_TTL_SECONDS`
- `JPL_API_BASE_URL`
- `JPL_TIMEOUT_SECONDS`
- `JPL_CAD_CACHE_TTL_SECONDS`
- `JPL_SBDB_CACHE_TTL_SECONDS`

Também são usadas variáveis de runtime/infra como:

- `APP_*`, `LOG_*`
- `DB_*`
- `CACHE_STORE`, `QUEUE_CONNECTION`, `SESSION_*`
- `REDIS_*`
- `APP_PORT`, `VITE_PORT`, `FORWARD_DB_PORT`, `FORWARD_REDIS_PORT`

Não versionar `.env`.

## Estrutura do Projeto

```text
app/
  DTOs/
    Approaches/
    Jpl/
    Nasa/
  Exceptions/
  Http/
    Controllers/Web/
    Requests/
  Services/
    Approaches/
    Jpl/
    Nasa/
    SpaceNews/
  Support/
resources/
  css/
  js/
    Components/
      Home/
      Nasa/
      ApproachObservatory/
      SmallBodies/
      Charts/
    Pages/
    hooks/
    i18n/
    services/
routes/
tests/
  Feature/
  Unit/
```

## Desenvolvimento

Executar testes:

```bash
docker compose exec app php artisan test
```

Formatar PHP:

```bash
docker compose exec app ./vendor/bin/pint
```

Build frontend:

```bash
docker compose exec app npm run build
```

Modo dev completo (script Composer):

```bash
docker compose exec app composer dev
```

## Notas de Teste

Os testes de feature e unit usam HTTP fakes para integrações externas; por isso não dependem da disponibilidade real de NASA/JPL.

## Status do Projeto

Desenvolvimento ativo.

## Autora

Criado por [Verônica Nardy](https://github.com/veronicanardy).
