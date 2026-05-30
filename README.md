# CaeliView

> A space observation portal built with Laravel, Inertia.js, React, and Three.js — pulling real data from NASA and JPL to bring near-Earth objects, Earth imagery, and small bodies to life.

Portuguese version: [README.pt-BR.md](README.pt-BR.md)

---

```
  ██████╗ █████╗ ███████╗██╗     ██╗    ██╗   ██╗██╗███████╗██╗    ██╗
 ██╔════╝██╔══██╗██╔════╝██║     ██║    ██║   ██║██║██╔════╝██║    ██║
 ██║     ███████║█████╗  ██║     ██║    ██║   ██║██║█████╗  ██║ █╗ ██║
 ██║     ██╔══██║██╔══╝  ██║     ██║    ╚██╗ ██╔╝██║██╔══╝  ██║███╗██║
 ╚██████╗██║  ██║███████╗███████╗██║     ╚████╔╝ ██║███████╗╚███╔███╔╝
  ╚═════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝      ╚═══╝  ╚═╝╚══════╝ ╚══╝╚══╝
```

---

## What is CaeliView?

CaeliView is a full-stack web application for exploring near-Earth and small-body astronomical data from NASA and JPL public APIs. It combines:

- A **cinematic 3D Earth** rendered in Three.js with real NASA textures
- A **3D heliocentric orbital radar** showing asteroid positions in the Solar System
- **Live sky conditions** and visible planets using your actual location
- Real-time asteroid and comet data from NASA NeoWs, JPL CAD, and JPL Horizons
- An APOD viewer, EPIC Earth gallery, and space news highlights

All external API integrations live in the Laravel backend. React pages receive clean, normalized data through Inertia.js — no browser-to-NASA requests, no exposed API keys.

---

## Pages

```
  /                Cinematic home with live sky dashboard
  /radar           Approach Observatory (2D + 3D orbital radar)
  /asteroides      Asteroid feed with charts and filters
  /asteroides/:id  Asteroid detail with orbital elements and history
  /epic            NASA EPIC Earth imagery gallery
  /apod            Astronomy Picture of the Day
  /viajantes       Small bodies (comets, probes) from JPL
  /viajantes/:id   Small body detail with approach timeline
  /sobre           About the project
```

---

## Feature Highlights

### Cinematic Home

```
  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │         ·  ★        ·   ✦          ·    ★   ·          │
  │   ·                                         ·           │
  │          ★    ╭──────────────╮    ·    ✦               │
  │    ·          │  ( Earth )   │              ·           │
  │         ·     │  ◌ clouds   │    ★                     │
  │    ✦          │  ● night   │          ·                 │
  │               ╰──────────────╯                          │
  │                                                         │
  └─────────────────────────────────────────────────────────┘
   Three.js scene: NASA Blue Marble + Black Marble night lights,
   normal/specular maps, cloud shadows, atmosphere glow, starfield
```

- Custom Three.js Earth with **real NASA Blue Marble** (daytime) and **Black Marble** (night lights) textures
- Vertex/fragment shaders for **cloud layer with sun-driven shadow projection**
- **Atmosphere twilight glow** and specular water highlights
- Multi-tier starfield with **per-star twinkle animation**
- Soft fallback pipeline for lower-end GPUs

### Live Sky Dashboard

```
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  ☁ Sky Now  │  │  🌙 Visible  │  │ 🚀 Next NEO  │
  │  Seeing: 3  │  │   Moon  ↑    │  │  2024 YR4    │
  │  Transp: 4  │  │   Venus ↗    │  │  in 3 days   │
  │  Wind: 12   │  │   Mars  →    │  │  0.02 AU     │
  └──────────────┘  └──────────────┘  └──────────────┘
  Open-Meteo + 7Timer            astronomy-engine (lazy chunk)
```

- Local sky quality via **Open-Meteo** and **7Timer** (proxied through backend)
- Visible objects (Moon, Venus, Mars, Jupiter, Saturn) computed with **astronomy-engine**
- Next near-Earth approach preview from combined NASA + JPL data
- Location name via **BigDataCloud reverse geocoding** (backend proxy)
- All cards degrade gracefully when location is denied or APIs fail

### Approach Observatory

```
  2D Panel                         3D Heliocentric Radar
  ┌─────────────────────────┐      ┌──────────────────────────────┐
  │  OBJECT      MISS DIST  │      │   ♃         ★ 2024 YR4      │
  │  2024 YR4    0.02 AU ●  │      │        ·  ·   ·              │
  │  2020 SW     0.08 AU    │      │   ♂ ·    ⊕    · 2020 SW     │
  │  2019 OK     0.13 AU    │      │        ·   ·                 │
  │  ────────────────────── │      │   ♀    ☿       ♄            │
  │  [Filter] [Sort] [3D ↗] │      │              ☀              │
  └─────────────────────────┘      └──────────────────────────────┘
  NASA NeoWs + JPL CAD (merged)    Three.js + react-three/fiber
```

- Combines **NASA NeoWs** and **JPL CAD** in parallel, deduplicates and merges by identity
- **3D heliocentric scene** with procedurally rendered planets (Mercury → Neptune), Sun, Moon
- Asteroid positions from **JPL Horizons API** ephemeris queries
- Trajectory lines, distance scaling, focus mode for individual objects
- 2D fallback with full filtering, sorting, and analytics panels
- Earth reference imagery from **NASA EPIC** with CSS fallback

### Asteroid Dashboard

```
  ┌───────────────────────────────────────────────────┐
  │  Week: Apr 14 – Apr 21                [Card|Table]│
  │                                                   │
  │  ╔══════╗  ╔══════╗  ╔══════╗  ╔══════╗          │
  │  ║  42  ║  ║  7 ⚠ ║  ║ 0.3 ║  ║ 12km ║          │
  │  ║total ║  ║hazard║  ║AU mn║  ║lrgst ║          │
  │  ╚══════╝  ╚══════╝  ╚══════╝  ╚══════╝          │
  │                                                   │
  │  [Daily count chart]  [Hazard breakdown chart]    │
  └───────────────────────────────────────────────────┘
```

- Date-range feed from NASA NeoWs with stats cards and Recharts visualizations
- Hazard classification, velocity, size, and miss-distance breakdowns
- Card and table views; asteroid detail page with close approach history

---

## Architecture

```
  Browser
    │
    │ HTTP request
    ▼
  Laravel Router
    │  (throttle / validation)
    ▼
  Controller
    │
    ├──▶ Service Layer ──▶ Cache (Redis, stale-while-revalidate)
    │         │
    │    ┌────┴─────────────────────────────────┐
    │    │  Concurrency::run()                  │
    │    │  ├── NasaHttpClient  ──▶ NASA APIs   │
    │    │  └── JplHttpClient   ──▶ JPL APIs    │
    │    └──────────────────────────────────────┘
    │         │
    │       DTOs (normalize heterogeneous payloads)
    │
    ├──▶ Inertia response (page + props)
    │         │
    │         ▼
    │       React Page
    │         │
    │         ├── Three.js scenes (Earth, orbital radar)
    │         ├── Recharts (asteroid charts)
    │         └── astronomy-engine (sky calculations)
    │
    └──▶ JSON endpoint (/radar/data, /epic/data, /apod/data, ...)
              │  ← heavy pages fetch their payload after first render
              ▼
            React (async hydration with Cache-Control)
```

### Key Decisions

| Pattern | What it does |
|---|---|
| `Concurrency::run()` | Fans out NeoWs + JPL CAD in parallel for the Observatory |
| `Cache::flexible()` | Stale-while-revalidate: serves cached data immediately, refreshes in background |
| Progressive loading | Heavy pages render instantly; data arrives from dedicated JSON endpoints |
| Backend proxies | `/proxy/sky-observation`, `/proxy/reverse-geocode` keep third-party calls and keys server-side |
| DTOs | Every API source has its own normalization pipeline before data reaches React |
| No Repository Pattern | All data is read-only and transient; Services + DTOs are sufficient |

---

## Tech Stack

### Backend

| | |
|---|---|
| PHP | 8.4 |
| Laravel | 13 |
| Inertia Laravel | 2 |
| Guzzle HTTP | 7 |
| PostgreSQL | 17 |
| Redis | 7 |
| PHPUnit | 12 |
| Laravel Pint | latest |

### Frontend

| | |
|---|---|
| React | 19 |
| TypeScript | 5 |
| Inertia React | 2 |
| Tailwind CSS | 3.4 |
| Three.js | 0.184 |
| react-three/fiber | 9.6 |
| react-three/drei | 10.7 |
| react-globe.gl | 2.35 |
| astronomy-engine | 2.1 |
| Recharts | 2.15 |
| Vite | 6 |

### Infrastructure

| | |
|---|---|
| Docker Compose | multi-container (app, postgres, redis) |
| Node + npm | runs inside the Docker container |
| Vite | manual chunk splitting (React, Inertia, astronomy-engine, charts) |

---

## External APIs

| Provider | Used for |
|---|---|
| [NASA NeoWs](https://api.nasa.gov/) | Near-Earth asteroid feed and detail |
| [NASA EPIC](https://api.nasa.gov/) | Earth Polychromatic Imaging gallery |
| [NASA APOD](https://api.nasa.gov/) | Astronomy Picture of the Day |
| [JPL CAD](https://ssd-api.jpl.nasa.gov/doc/cad.html) | Close approach data |
| [JPL SBDB](https://ssd-api.jpl.nasa.gov/doc/sbdb.html) | Small-body database |
| [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Ephemeris / state vectors for orbital radar |
| [SNAPI](https://api.spaceflightnewsapi.net/v4/docs/) | Space news highlights |
| [Open-Meteo](https://open-meteo.com/) | Local sky conditions (seeing, transparency, wind) |
| [7Timer Astro](https://www.7timer.info/) | Astronomical sky quality forecast |
| [BigDataCloud](https://www.bigdatacloud.com/) | Reverse geocoding (location name) |

---

## Project Structure

```
app/
├── DTOs/
│   ├── Approaches/        # Unified approach data models
│   ├── Jpl/               # CAD + SBDB response normalization
│   └── Nasa/              # NeoWs + EPIC + APOD normalization
├── Exceptions/            # Domain exceptions (NasaApiException, JplApiException)
├── Http/
│   ├── Controllers/Web/   # Page + data-endpoint controllers
│   └── Requests/          # Form Request validation
└── Services/
    ├── Approaches/        # Observatory orchestration (fan-out, merge, summarize)
    ├── Jpl/               # JPL CAD, SBDB, Horizons clients
    ├── Nasa/              # NASA NeoWs, EPIC, APOD clients
    └── SpaceNews/         # SNAPI client

resources/js/
├── Pages/                 # Top-level Inertia page components
├── Components/
│   ├── Home/              # CinematicEarthScene, LiveSkyDashboard
│   ├── ApproachObservatory/ # DailyOrbitalRadar, DailyOrbitalRadar3D, panels
│   ├── SmallBodies/       # Orbital elements, approach timelines
│   ├── Nasa/              # EarthGlobe, reusable NASA components
│   └── Charts/            # Recharts wrappers
├── hooks/                 # Custom React hooks
├── lib/
│   └── observatory/       # Coordinate math, shaders, planet data, Kepler orbits
├── services/              # Client-side API calls and fallback logic
├── i18n/                  # Translation dictionaries (pt-BR, en)
└── types/                 # TypeScript type definitions

tests/
├── Feature/               # Integration tests (HTTP fakes — no live API calls)
└── Unit/                  # Unit tests
```

---

## Installation

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A free [NASA API key](https://api.nasa.gov/) (optional for first run — `DEMO_KEY` works)

### Steps

Clone the repository:

```bash
git clone https://github.com/veronicanardy/caeli-view.git
cd caeli-view
```

Create your local environment file:

```bash
# bash / zsh
cp .env.example .env

# PowerShell
Copy-Item .env.example .env
```

Set your NASA API key in `.env`:

```env
NASA_API_KEY=DEMO_KEY
```

> `DEMO_KEY` works for quick tests but hits NASA's lowest rate limits. For active development, generate a free key at [https://api.nasa.gov/](https://api.nasa.gov/).

Build and install dependencies:

```bash
docker compose build
docker compose run --rm app composer install
docker compose run --rm app npm install
docker compose run --rm app php artisan key:generate
```

Start services and migrate:

```bash
docker compose up -d
docker compose exec app php artisan migrate
```

Start the frontend dev server:

```bash
docker compose exec app npm run dev -- --host=0.0.0.0
```

Open [http://localhost:8000](http://localhost:8000).

---

## Development Commands

```bash
# Run all tests
docker compose exec app php artisan test

# Format PHP code
docker compose exec app ./vendor/bin/pint

# Build frontend for production
docker compose exec app npm run build

# Run Laravel server + Vite together (Composer script)
docker compose exec app composer dev
```

---

## Environment Variables

Read from `.env` through `config/services.php`:

```env
# NASA
NASA_API_BASE_URL=
NASA_API_KEY=
NASA_TIMEOUT_SECONDS=
NASA_CACHE_TTL_SECONDS=
NASA_EPIC_CACHE_TTL_SECONDS=
NASA_APOD_CACHE_TTL_SECONDS=

# JPL
JPL_API_BASE_URL=
JPL_TIMEOUT_SECONDS=
JPL_CAD_CACHE_TTL_SECONDS=
JPL_SBDB_CACHE_TTL_SECONDS=
```

Standard Laravel / infrastructure variables: `APP_*`, `DB_*`, `REDIS_*`, `CACHE_STORE`, `SESSION_*`, `APP_PORT`, `VITE_PORT`, `FORWARD_DB_PORT`, `FORWARD_REDIS_PORT`.

> Never commit your `.env` file.

---

## Error Handling

- `NasaHttpClient` and `JplHttpClient` map HTTP failures to typed domain exceptions
- Controllers catch exceptions and return safe page payloads with user-friendly messages
- Observatory falls back to a CSS Earth reference when EPIC imagery is unavailable
- Home cards stay functional when geolocation is denied or any external provider fails
- APOD media handling detects video-only content and renders a safe fallback
- `NASA_API_KEY` is always server-side and never exposed in React props

---

## Testing

Feature tests use Laravel's HTTP fake to intercept all NASA and JPL requests. Test runs are fully offline — no live API calls required.

```bash
docker compose exec app php artisan test
```

---

## Status

Active development. Core features are working. Planned next steps: end-to-end tests (Playwright), CI/CD workflow, deployment documentation, user bookmarks.

---

## Author

Created by [Verônica Nardy](https://github.com/veronicanardy).
