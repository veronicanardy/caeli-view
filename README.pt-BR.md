# CaeliView

> Um portal de observação espacial feito com Laravel, Inertia.js, React e Three.js — consumindo dados reais da NASA e do JPL para trazer asteroides, imagens da Terra e pequenos corpos do Sistema Solar à vida.

Versão em inglês: [README.md](README.md)

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

## O que é o CaeliView?

CaeliView é uma aplicação web full-stack para explorar dados astronômicos reais de objetos próximos da Terra e pequenos corpos do Sistema Solar, a partir das APIs públicas da NASA e do JPL. Combina:

- Uma **Terra 3D cinematográfica** renderizada em Three.js com texturas reais da NASA
- Um **radar orbital heliocêntrico em 3D** mostrando posições de asteroides no Sistema Solar
- **Condições do céu local ao vivo** e planetas visíveis usando sua localização real
- Dados em tempo real de asteroides e cometas via NASA NeoWs, JPL CAD e JPL Horizons
- Galeria de imagens EPIC da Terra, visualizador de APOD e destaques de notícias espaciais

Todas as integrações com APIs externas ficam no backend Laravel. As páginas React recebem dados limpos e normalizados via Inertia.js — sem requisições diretas do navegador para a NASA, sem chaves expostas.

---

## Páginas

```
  /                Home cinematográfica com painel de céu ao vivo
  /radar           Observatório de Aproximações (radar 2D + 3D orbital)
  /asteroides      Feed de asteroides com gráficos e filtros
  /asteroides/:id  Detalhe do asteroide com elementos orbitais e histórico
  /epic            Galeria de imagens EPIC da Terra (NASA)
  /apod            Foto Astronômica do Dia
  /viajantes       Pequenos corpos (cometas, sondas) do JPL
  /viajantes/:id   Detalhe do pequeno corpo com linha do tempo de aproximações
  /sobre           Sobre o projeto
```

---

## Destaques de Funcionalidades

### Home Cinematográfica

```
  ┌─────────────────────────────────────────────────────────┐
  │                                                         │
  │         ·  ★        ·   ✦          ·    ★   ·          │
  │   ·                                         ·           │
  │          ★    ╭──────────────╮    ·    ✦               │
  │    ·          │  ( Terra )   │              ·           │
  │         ·     │  ◌ nuvens   │    ★                     │
  │    ✦          │  ● noite   │          ·                 │
  │               ╰──────────────╯                          │
  │                                                         │
  └─────────────────────────────────────────────────────────┘
   Cena Three.js: NASA Blue Marble + Black Marble (luzes noturnas),
   mapas normal/specular, sombras de nuvens, atmosfera, campo de estrelas
```

- Terra customizada em Three.js com textura real **NASA Blue Marble** (dia) e **Black Marble** (noites)
- Shaders vertex/fragment para **camada de nuvens com projeção de sombras direcionada ao sol**
- **Brilho de atmosfera no twilight** e reflexo especular da água
- Campo de estrelas em múltiplas camadas com **animação de cintilação por estrela**
- Pipeline de fallback suave para GPUs mais modestas

### Painel de Céu ao Vivo

```
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  ☁ Céu Agr  │  │ 🌙 Visíveis  │  │ 🚀 Próx NEO  │
  │  Seeing: 3  │  │  Lua    ↑   │  │  2024 YR4    │
  │  Transp: 4  │  │  Vênus  ↗   │  │  em 3 dias   │
  │  Vento: 12  │  │  Marte  →   │  │  0,02 UA     │
  └──────────────┘  └──────────────┘  └──────────────┘
  Open-Meteo + 7Timer          astronomy-engine (chunk lazy)
```

- Qualidade do céu local via **Open-Meteo** e **7Timer** (proxies no backend)
- Objetos visíveis (Lua, Vênus, Marte, Júpiter, Saturno) calculados com **astronomy-engine**
- Prévia da próxima aproximação de objeto próximo da Terra (dados NASA + JPL combinados)
- Nome da localização via **BigDataCloud reverse geocoding** (proxy no backend)
- Todos os cards degradam graciosamente quando a geolocalização é negada ou as APIs falham

### Observatório de Aproximações

```
  Painel 2D                          Radar Heliocêntrico 3D
  ┌─────────────────────────┐        ┌──────────────────────────────┐
  │  OBJETO      DIST MIN   │        │   ♃         ★ 2024 YR4      │
  │  2024 YR4    0,02 UA ●  │        │        ·  ·   ·              │
  │  2020 SW     0,08 UA    │        │   ♂ ·    ⊕    · 2020 SW     │
  │  2019 OK     0,13 UA    │        │        ·   ·                 │
  │  ────────────────────── │        │   ♀    ☿       ♄            │
  │  [Filtro] [Ord] [3D ↗]  │        │              ☀              │
  └─────────────────────────┘        └──────────────────────────────┘
  NASA NeoWs + JPL CAD (mesclados)   Three.js + react-three/fiber
```

- Combina **NASA NeoWs** e **JPL CAD** em paralelo, deduplica e mescla por identidade
- **Cena heliocêntrica 3D** com planetas renderizados proceduralmente (Mercúrio → Netuno), Sol e Lua
- Posições dos asteroides via consultas de efemérides à **API JPL Horizons**
- Linhas de trajetória, escala de distâncias, modo de foco por objeto
- Fallback 2D com filtros completos, ordenação e painéis de análise
- Referência visual da Terra via **NASA EPIC** com fallback CSS

### Painel de Asteroides

```
  ┌───────────────────────────────────────────────────┐
  │  Semana: 14 – 21 abr               [Card|Tabela]  │
  │                                                   │
  │  ╔══════╗  ╔══════╗  ╔══════╗  ╔══════╗          │
  │  ║  42  ║  ║  7 ⚠ ║  ║ 0,3 ║  ║ 12km ║          │
  │  ║total ║  ║perigo║  ║UA mn ║  ║maior ║          │
  │  ╚══════╝  ╚══════╝  ╚══════╝  ╚══════╝          │
  │                                                   │
  │  [Gráfico contagem diária]  [Gráfico por perigo]  │
  └───────────────────────────────────────────────────┘
```

- Feed por intervalo de datas do NASA NeoWs com cards de estatísticas e gráficos (Recharts)
- Classificação de perigo, velocidade, tamanho e distância mínima
- Visualização em card e tabela; página de detalhe com histórico de aproximações

---

## Arquitetura

```
  Navegador
    │
    │ requisição HTTP
    ▼
  Roteador Laravel
    │  (throttle / validação)
    ▼
  Controller
    │
    ├──▶ Camada de Serviços ──▶ Cache (Redis, stale-while-revalidate)
    │         │
    │    ┌────┴──────────────────────────────────────┐
    │    │  Concurrency::run()                       │
    │    │  ├── NasaHttpClient  ──▶ APIs da NASA     │
    │    │  └── JplHttpClient   ──▶ APIs do JPL      │
    │    └───────────────────────────────────────────┘
    │         │
    │       DTOs (normalização dos payloads heterogêneos)
    │
    ├──▶ Resposta Inertia (página + props)
    │         │
    │         ▼
    │       Página React
    │         │
    │         ├── Cenas Three.js (Terra, radar orbital)
    │         ├── Recharts (gráficos de asteroides)
    │         └── astronomy-engine (cálculos do céu)
    │
    └──▶ Endpoint JSON (/radar/data, /epic/data, /apod/data, ...)
              │  ← páginas pesadas buscam o payload após o primeiro render
              ▼
            React (hidratação assíncrona com Cache-Control)
```

### Decisões de Projeto

| Padrão | O que faz |
|---|---|
| `Concurrency::run()` | Fan-out paralelo de NeoWs + JPL CAD no Observatório |
| `Cache::flexible()` | Stale-while-revalidate: serve cache imediatamente e revalida em background |
| Carregamento progressivo | Páginas pesadas renderizam instantaneamente; dados chegam por endpoints JSON dedicados |
| Proxies no backend | `/proxy/sky-observation`, `/proxy/reverse-geocode` mantêm chamadas e chaves no servidor |
| DTOs | Cada fonte de API tem seu próprio pipeline de normalização antes de chegar ao React |
| Sem Repository Pattern | Dados são somente leitura e transientes; Services + DTOs são suficientes |

---

## Stack Tecnológica

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
| Laravel Pint | mais recente |

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

### Infraestrutura

| | |
|---|---|
| Docker Compose | multi-container (app, postgres, redis) |
| Node + npm | roda dentro do container Docker |
| Vite | chunk splitting manual (React, Inertia, astronomy-engine, gráficos) |

---

## APIs Externas

| Provedor | Usado para |
|---|---|
| [NASA NeoWs](https://api.nasa.gov/) | Feed e detalhe de asteroides próximos da Terra |
| [NASA EPIC](https://api.nasa.gov/) | Galeria de imagens da Terra |
| [NASA APOD](https://api.nasa.gov/) | Foto Astronômica do Dia |
| [JPL CAD](https://ssd-api.jpl.nasa.gov/doc/cad.html) | Dados de aproximações |
| [JPL SBDB](https://ssd-api.jpl.nasa.gov/doc/sbdb.html) | Base de dados de pequenos corpos |
| [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) | Efemérides / vetores de estado para o radar orbital |
| [SNAPI](https://api.spaceflightnewsapi.net/v4/docs/) | Destaques de notícias espaciais |
| [Open-Meteo](https://open-meteo.com/) | Condições do céu local (seeing, transparência, vento) |
| [7Timer Astro](https://www.7timer.info/) | Previsão de qualidade astronômica do céu |
| [BigDataCloud](https://www.bigdatacloud.com/) | Geocodificação reversa (nome da localização) |

---

## Estrutura do Projeto

```
app/
├── DTOs/
│   ├── Approaches/        # Modelos unificados de aproximação
│   ├── Jpl/               # Normalização de CAD + SBDB
│   └── Nasa/              # Normalização de NeoWs + EPIC + APOD
├── Exceptions/            # Exceções de domínio (NasaApiException, JplApiException)
├── Http/
│   ├── Controllers/Web/   # Controllers de página e endpoints de dados
│   └── Requests/          # Validação com Form Requests
└── Services/
    ├── Approaches/        # Orquestração do Observatório (fan-out, mesclagem, análise)
    ├── Jpl/               # Clientes CAD, SBDB e Horizons do JPL
    ├── Nasa/              # Clientes NeoWs, EPIC e APOD da NASA
    └── SpaceNews/         # Cliente SNAPI

resources/js/
├── Pages/                 # Componentes de página Inertia de nível superior
├── Components/
│   ├── Home/              # CinematicEarthScene, LiveSkyDashboard
│   ├── ApproachObservatory/ # DailyOrbitalRadar, DailyOrbitalRadar3D, painéis
│   ├── SmallBodies/       # Elementos orbitais, linhas do tempo de aproximação
│   ├── Nasa/              # EarthGlobe, componentes reutilizáveis da NASA
│   └── Charts/            # Wrappers de Recharts
├── hooks/                 # Hooks React customizados
├── lib/
│   └── observatory/       # Matemática de coordenadas, shaders, dados de planetas, órbitas de Kepler
├── services/              # Chamadas de API client-side e lógica de fallback
├── i18n/                  # Dicionários de tradução (pt-BR, en)
└── types/                 # Definições de tipos TypeScript

tests/
├── Feature/               # Testes de integração (HTTP fakes — sem chamadas reais à API)
└── Unit/                  # Testes unitários
```

---

## Instalação

### Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose
- Uma [chave de API da NASA](https://api.nasa.gov/) gratuita (opcional no primeiro uso — `DEMO_KEY` funciona)

### Passo a Passo

Clone o repositório:

```bash
git clone https://github.com/veronicanardy/caeli-view.git
cd caeli-view
```

Crie o arquivo de ambiente local:

```bash
# bash / zsh
cp .env.example .env

# PowerShell
Copy-Item .env.example .env
```

Defina sua chave da NASA no `.env`:

```env
NASA_API_KEY=DEMO_KEY
```

> `DEMO_KEY` funciona para testes rápidos, mas tem limites de taxa muito baixos. Para desenvolvimento ativo, gere uma chave gratuita em [https://api.nasa.gov/](https://api.nasa.gov/).

Faça o build e instale as dependências:

```bash
docker compose build
docker compose run --rm app composer install
docker compose run --rm app npm install
docker compose run --rm app php artisan key:generate
```

Suba os serviços e rode as migrations:

```bash
docker compose up -d
docker compose exec app php artisan migrate
```

Inicie o servidor de desenvolvimento do frontend:

```bash
docker compose exec app npm run dev -- --host=0.0.0.0
```

Acesse [http://localhost:8000](http://localhost:8000).

---

## Comandos de Desenvolvimento

```bash
# Rodar todos os testes
docker compose exec app php artisan test

# Formatar código PHP
docker compose exec app ./vendor/bin/pint

# Build do frontend para produção
docker compose exec app npm run build

# Servidor Laravel + Vite juntos (script Composer)
docker compose exec app composer dev
```

---

## Variáveis de Ambiente

Lidas do `.env` via `config/services.php`:

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

Variáveis padrão do Laravel / infraestrutura: `APP_*`, `DB_*`, `REDIS_*`, `CACHE_STORE`, `SESSION_*`, `APP_PORT`, `VITE_PORT`, `FORWARD_DB_PORT`, `FORWARD_REDIS_PORT`.

> Nunca versione o arquivo `.env`.

---

## Tratamento de Erros

- `NasaHttpClient` e `JplHttpClient` mapeiam falhas HTTP para exceções de domínio tipadas
- Controllers capturam exceções e retornam payloads seguros com mensagens amigáveis ao usuário
- O Observatório cai para uma referência visual CSS da Terra quando as imagens EPIC não estão disponíveis
- Os cards da Home continuam funcionando quando a geolocalização é negada ou qualquer provedor externo falha
- O APOD detecta conteúdo somente de vídeo e renderiza um fallback seguro
- `NASA_API_KEY` fica sempre no servidor e nunca é exposta nas props do React

---

## Testes

Os testes de feature usam o HTTP fake do Laravel para interceptar todas as requisições à NASA e ao JPL. A execução dos testes é completamente offline — nenhuma chamada real à API é feita.

```bash
docker compose exec app php artisan test
```

---

## Status

Desenvolvimento ativo. As funcionalidades principais estão operando. Próximos passos planejados: testes end-to-end (Playwright), workflow de CI/CD, documentação de deploy, bookmarks de usuário.

---

## Autora

Criado por [Verônica Nardy](https://github.com/veronicanardy).
