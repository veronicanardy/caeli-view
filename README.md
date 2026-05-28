# CaeliView

CaeliView is a web application built with Laravel, Inertia.js, and React to explore near-Earth and small-body data from NASA and JPL public APIs.

Portuguese version: see [README.pt-BR.md](README.pt-BR.md).

## Overview

The project is designed to centralize external API integrations in the Laravel backend, normalize heterogeneous payloads, and deliver page data to React through Inertia.js.

Instead of maintaining a separate internal REST API for each screen, controllers return Inertia responses with validated and prepared data models for the UI.

## Main Features

- Cinematic Home with a fully custom Three.js Earth scene (real NASA Blue Marble daytime texture, Black Marble night lights, normal and specular maps, atmosphere/twilight shading, cloud layer with sun-driven shadow projection, multi-tier starfield with per-star twinkle, and a fallback-safe rendering pipeline).
- Live Home dashboard with:
  - Local sky conditions (`Open-Meteo` + `7Timer`) routed through a backend proxy to avoid cross-origin frontend requests.
  - Visible objects today (Moon, Venus, Mars, Jupiter, Saturn) using local calculations via `astronomy-engine` (loaded as a separate lazy chunk).
  - Space news highlight (SNAPI) with APOD fallback.
  - Next relevant near-Earth approach summary.
  - Human-readable location via reverse geocoding (BigDataCloud) proxied through the backend.
- Approach Observatory (`/radar`) combining NASA NeoWs and JPL CAD data, with Earth reference imagery from EPIC when available.
- Asteroids dashboard (`/asteroides`) and asteroid detail page (`/asteroides/{asteroidId}`).
- EPIC gallery (`/epic`) with date-based query.
- APOD page (`/apod`) with date-based query and safe image/video rendering.
- Small Bodies module (`/viajantes`, `/viajantes/{identifier}`) using JPL CAD and SBDB.
- About page (`/sobre`) describing the project.
- Bilingual UI support (`pt-BR` default, `en`) with centralized translation dictionaries and a language toggle.
- Progressive data loading: heavy pages render immediately and fetch their payloads from dedicated JSON endpoints (`/radar/data`, `/epic/data`, `/apod/data`, `/home/astronomy-feed`) with `Cache-Control` headers.
- Input validation with Form Requests, API exception handling, stale-while-revalidate response caching (`Cache::flexible()`), parallel upstream fan-out (`Concurrency::run()`), and rate limiting.

## Tech Stack

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
- `three` (custom cinematic Earth scene on the Home)
- `react-globe.gl` (interactive globe on secondary views)
- `astronomy-engine`
- Vite 6 (with manual chunk splitting for the astronomy engine)

Infrastructure / Tooling:

- Docker Compose
- PostgreSQL 17
- Redis 7
- PHPUnit 12
- Laravel Pint

## External APIs

- NASA Open APIs: https://api.nasa.gov/
- JPL SSD/CNEOS API Service: https://ssd-api.jpl.nasa.gov/
- JPL CAD API docs: https://ssd-api.jpl.nasa.gov/doc/cad.html
- JPL SBDB API docs: https://ssd-api.jpl.nasa.gov/doc/sbdb.html
- Spaceflight News API (SNAPI): https://api.spaceflightnewsapi.net/v4/docs/
- Open-Meteo API docs: https://open-meteo.com/
- 7Timer Astro API: https://www.7timer.info/doc.php?lang=en
- BigDataCloud reverse geocoding: https://www.bigdatacloud.com/docs/api/free-reverse-geocode-to-city-api

Endpoints currently used by the application:

- NASA NeoWs: `GET /neo/rest/v1/feed`, `GET /neo/rest/v1/neo/{id}`
- NASA EPIC: `GET /EPIC/api/natural`, `GET /EPIC/api/natural/date/{date}`
- NASA APOD: `GET /planetary/apod`
- JPL CAD: `GET /cad.api`
- JPL SBDB: `GET /sbdb.api`
- SNAPI: `GET /v4/articles`
- Open-Meteo Forecast: `GET /v1/forecast`
- 7Timer Astro: `GET /bin/astro.php`
- BigDataCloud reverse geocode (via backend proxy)

## Architecture Overview

```text
NASA/JPL Public APIs
        ↓
Laravel Services
        ↓
Controllers + Form Requests
        ↓
Inertia.js
        ↓
React Pages and Components
```

- Laravel handles routing, controllers, validation, external API services, cache, and error translation.
- Inertia.js connects Laravel responses directly to React pages.
- React handles interface composition, charts, and client-side visual interactions.

References:

- Laravel docs: https://laravel.com/docs
- Inertia.js docs: https://inertiajs.com/
- React docs: https://react.dev/

## Architecture Decisions

- External integrations are isolated by provider: `app/Services/Nasa/*`, `app/Services/Jpl/*`, and `app/Services/SpaceNews/*`.
- Aggregation logic for mixed data sources is isolated in `app/Services/Approaches/ApproachObservatoryService.php`, which uses `Concurrency::run()` to fan out NeoWs + JPL CAD requests in parallel.
- DTOs in `app/DTOs/*` normalize API responses before rendering.
- Heavy pages return immediately with a lightweight Inertia payload and fetch their data from a separate JSON endpoint (`/radar/data`, `/epic/data`, `/apod/data`, `/home/astronomy-feed`) with `Cache-Control` headers — this removes blocking external calls from the initial SSR render.
- Third-party endpoints that the browser would otherwise hit cross-origin (sky observation, reverse geocoding) are routed through dedicated backend proxies (`/proxy/sky-observation`, `/proxy/reverse-geocode`) to centralize keys, caching, and error handling.
- Client-side observation helpers live in `resources/js/services/*` and `resources/js/hooks/*`, with lightweight caching and resilient fallbacks.
- Cache strategy uses `Cache::flexible()` (stale-while-revalidate) so hot endpoints serve cached data immediately while refreshing in the background.
- The project does not currently use Repository Pattern because it does not have complex domain persistence. Most data comes from external APIs and is normalized before being sent to the interface. API integration lives in Services, and response normalization lives in DTOs. This keeps the architecture clean without adding unnecessary layers.

## Error Handling and Fallback Strategy

- External HTTP clients (`NasaHttpClient`, `JplHttpClient`) map failures to domain exceptions.
- Controllers catch exceptions and still render safe page payloads.
- Rate-limit and availability errors use user-friendly messages.
- API responses are cached with dedicated TTL values from `config/services.php`.
- `NASA_API_KEY` remains server-side and is never exposed to React props.
- Observatory Earth reference uses EPIC when available and a CSS fallback when EPIC is unavailable.
- Home cards keep working when location is denied, browser geolocation is unavailable, or external providers fail.
- APOD media handling falls back safely when content is not directly renderable (for example, video-only cases).

## Installation

Clone and enter the repository:

```bash
git clone https://github.com/veronicanardy/caeli-view.git
cd caeli-view
```

Create your local environment file:

```bash
cp .env.example .env
```

On PowerShell:

```powershell
Copy-Item .env.example .env
```

Set your NASA API key:

```env
NASA_API_KEY=DEMO_KEY
```

`DEMO_KEY` is useful for quick local tests but has low rate limits. For continuous development, generate a free key at https://api.nasa.gov/.

Install dependencies and prepare the app:

```bash
docker compose build
docker compose run --rm app composer install
docker compose run --rm app npm install
docker compose run --rm app php artisan key:generate
```

Start services and run migrations:

```bash
docker compose up -d
docker compose exec app php artisan migrate
```

Run frontend dev server:

```bash
docker compose exec app npm run dev -- --host=0.0.0.0
```

Application URL:

```text
http://localhost:8000
```

## Environment Variables

The application reads these integration keys from `.env` through `config/services.php`:

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

It also uses runtime and infra keys such as:

- `APP_*`, `LOG_*`
- `DB_*`
- `CACHE_STORE`, `QUEUE_CONNECTION`, `SESSION_*`
- `REDIS_*`
- `APP_PORT`, `VITE_PORT`, `FORWARD_DB_PORT`, `FORWARD_REDIS_PORT`

Do not commit your `.env` file.

## Project Structure

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
config/
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

## Development

Run tests:

```bash
docker compose exec app php artisan test
```

Format PHP:

```bash
docker compose exec app ./vendor/bin/pint
```

Build frontend:

```bash
docker compose exec app npm run build
```

Run full dev mode via Composer script:

```bash
docker compose exec app composer dev
```

## Testing Notes

Feature and unit tests rely on HTTP fakes for external API interactions, so test runs do not depend on live NASA/JPL availability.

## Future Improvements

- End-to-end tests (Playwright).
- CI workflow for test/build validation.
- Deployment instructions.
- Changelog and release/versioning workflow.
- Additional visual refinements and screenshots.
- User-level features such as favorites/bookmarks.

## Project Status

Active development.

## Author

Created by [Verônica Nardy](https://github.com/veronicanardy).
