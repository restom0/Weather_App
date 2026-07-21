# Weather App

[![Quality gate status](https://sonarcloud.io/api/project_badges/measure?project=restom0_Weather_App&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=restom0_Weather_App)

### 🔗 Live demo: **https://pizzahuttest.vercel.app**

A React weather app that shows the weather for your **current location** and lets you
**search for any city** in the world, in **7 languages**. The OpenWeather API key stays
server-side behind Vercel serverless functions, which also enforce **per-IP rate limiting**.

> The application lives in [`weather_app/`](./weather_app) — run all commands from there.

## Features

- 🌍 **Current-location weather** via the browser Geolocation API
- 🔎 **City search** with autocomplete and disambiguation (state / country)
- 📊 Temperature, "feels like", humidity, wind, pressure, visibility, cloudiness, sunrise/sunset
- 🌍 **7 languages** — English, Español, Tiếng Việt, Français, Deutsch, Català, Italiano
- 🌗 **°C / °F toggle**, remembered across visits
- 🎨 Background that adapts to the current conditions (day/night, clear, clouds, rain, …)
- 🔒 **API key never exposed to the browser** — every OpenWeather call goes through `/api`
- 🚦 **Rate limited to 100 requests per IP** (configurable)

## Architecture

```
Browser ──►  /api/weather   ─┐
        ──►  /api/geocode    ─┴─►  OpenWeather API   (key added server-side)
```

- **Frontend:** React 18 + Vite + Tailwind CSS (`weather_app/src`)
- **Backend:** Vercel serverless functions (`weather_app/api`)
  - `GET /api/weather?lat=&lon=&units=` or `?q=&units=` → current weather
  - `GET /api/geocode?q=&limit=` → location search (autocomplete)
- **Rate limiting:** in-memory fixed-window limiter shared by both endpoints
  (`api/_lib/rateLimit.js`)

The browser only ever talks to our own `/api` endpoints; those attach the secret
`OPENWEATHER_API_KEY` server-side, so the key is never shipped to the client.

## Local development

Prerequisites: **Node 18+**.

```bash
cd weather_app
cp .env.example .env      # then add your OpenWeather key to .env
npm install
npm run dev               # http://localhost:5173
```

`npm run dev` also runs the serverless functions locally through a small Vite dev
middleware, so the full app (proxy + rate limiting) works without `vercel dev`.

### Environment variables

| Variable               | Required | Default  | Purpose                                        |
| ---------------------- | :------: | -------- | ---------------------------------------------- |
| `OPENWEATHER_API_KEY`  |   yes    | —        | Your OpenWeather API key (**server-side only**) |
| `RATE_LIMIT_MAX`       |    no    | `100`    | Max requests per IP per window                 |
| `RATE_LIMIT_WINDOW_MS` |    no    | `900000` | Window length in ms (15 minutes)               |

`.env` is gitignored — **never commit your real key**. Get a free key at
<https://openweathermap.org/api>.

## Deploy to Vercel

### Option A — GitHub Actions (what this repo uses)

Every push to `master` runs the tests and, only if they pass, deploys to production
via the `deploy` job in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
Pull requests never deploy.

Add these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret              | Where to get it                                        |
| ------------------- | ------------------------------------------------------ |
| `VERCEL_TOKEN`      | <https://vercel.com/account/tokens> — create a token   |
| `VERCEL_ORG_ID`     | `weather_app/.vercel/project.json` → `orgId`           |
| `VERCEL_PROJECT_ID` | `weather_app/.vercel/project.json` → `projectId`       |

> ⚠️ Don't also enable Vercel's Git integration (Option C) for this project — you'd
> get two deployments per push. Use one or the other.

### Option B — Vercel CLI (manual)

```bash
cd weather_app
vercel link --yes                             # create/link the project
echo "<your-key>" | vercel env add OPENWEATHER_API_KEY production
vercel --prod                                 # production deploy
```

### Option C — Vercel Git integration

1. In Vercel: **Add New… → Project** and import the repo.
2. Set **Root Directory** to `weather_app`.
3. Add the environment variable `OPENWEATHER_API_KEY` (and optionally the rate-limit
   ones) under **Project Settings → Environment Variables**.
4. **Deploy.** Vercel auto-detects Vite (build `npm run build`, output `dist`) and
   serves `weather_app/api/*` as serverless functions. If you use this, delete the
   `deploy` job from the workflow to avoid double deploys.

## Internationalisation

The UI ships in **7 languages**: `en`, `es`, `vi`, `fr`, `de`, `ca`, `it`.

- **UI strings** live in [`weather_app/src/i18n/translations.js`](weather_app/src/i18n/translations.js);
  a tiny context + `useI18n()` hook in [`src/i18n/index.jsx`](weather_app/src/i18n/index.jsx)
  provides `t(key)`. No i18n library — the whole thing adds ~2.7 kB gzipped.
- **Weather descriptions are localised by OpenWeather itself**: the active language is
  forwarded as the `lang` parameter through `/api/weather`, so "clear sky" comes back as
  "cielo claro", "bầu trời quang đãng", "ciel dégagé", and so on.
- **Times** are formatted with `toLocaleTimeString(locale)`, so German shows `23:13`
  where English shows `11:13 PM`.
- Language is picked from the stored preference, then the browser's `navigator.languages`,
  then English. The choice persists in `localStorage` and updates `<html lang>`.
- Errors are stored as translation *keys*, so an on-screen message re-translates when the
  language changes rather than freezing in the language it occurred in. (Error text coming
  from the upstream API is passed through as-is and stays in English.)

To add a language: add an entry to `LANGUAGES` and a matching dictionary in
`TRANSLATIONS`. A test asserts every language defines the full English key set, so a
missing string fails the build. Use a code OpenWeather also supports to get localised
descriptions for free.

## Testing

Unit tests use [Vitest](https://vitest.dev/) + Testing Library, with V8 coverage
exported as LCOV for SonarCloud.

```bash
cd weather_app
npm test            # watch mode
npm run test:run    # single run
npm run coverage    # single run + coverage report in coverage/
```

**Coverage is 100%** (statements, branches, functions and lines) across 136 tests,
and `vitest.config.js` enforces a 100% threshold — the run fails if coverage
regresses. Tests cover the formatting/theming helpers, the API client, the
serverless handlers (`/api/weather`, `/api/geocode`), the per-IP rate limiter
(including its bucket-sweep path), and the React components (search debounce and
stale-response handling, weather rendering, geolocation flow, unit toggle).

## Code quality (SonarCloud)

A GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))
runs the tests with coverage and pushes the results to SonarCloud on every push / PR
to `master`. Scanner config lives in
[`weather_app/sonar-project.properties`](weather_app/sonar-project.properties).

The scan runs with `-Dsonar.qualitygate.wait=true`, so **a failing Quality Gate
fails the build** rather than just reporting on the dashboard.

**One-time setup (required — this part needs your Sonar account):**

1. Sign in at <https://sonarcloud.io> with GitHub and **import** the `restom0/Weather_App` repo.
2. Note the **Organization key** and **Project key** and set them in
   `weather_app/sonar-project.properties` (`sonar.organization`, `sonar.projectKey`).
   These are already set to `restom0` / `restom0_Weather_App`.
3. In the SonarCloud project, go to **Administration → Analysis Method** and turn
   **OFF "Automatic Analysis"** — CI-based analysis and Automatic Analysis cannot both run.
4. Create a token under **My Account → Security**, then add it to GitHub as a repo
   secret: **Settings → Secrets and variables → Actions → New repository secret**,
   named `SONAR_TOKEN`.
5. Push to `master`. The workflow runs the tests and the quality gate + coverage
   appear on SonarCloud.

## Rate-limiting notes

The limiter is **in-memory and per-serverless-instance**, so on Vercel the counter can
reset on cold starts and is not shared across concurrent instances. It is a lightweight
guard, well suited to a demo / low-traffic app. For strict, globally-consistent limits,
back it with a shared store such as [Upstash Redis](https://upstash.com/) and swap the
logic in [`weather_app/api/_lib/rateLimit.js`](./weather_app/api/_lib/rateLimit.js).

## Credits

Weather data provided by [OpenWeather](https://openweathermap.org/).
