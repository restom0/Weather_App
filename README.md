# Weather App

A React weather app that shows the weather for your **current location** and lets you
**search for any city** in the world. The OpenWeather API key stays server-side behind
Vercel serverless functions, which also enforce **per-IP rate limiting**.

> The application lives in [`pizzahut_test/`](./pizzahut_test) — run all commands from there.

## Features

- 🌍 **Current-location weather** via the browser Geolocation API
- 🔎 **City search** with autocomplete and disambiguation (state / country)
- 📊 Temperature, "feels like", humidity, wind, pressure, visibility, cloudiness, sunrise/sunset
- 🌗 **°C / °F toggle**, remembered across visits
- 🎨 Background that adapts to the current conditions (day/night, clear, clouds, rain, …)
- 🔒 **API key never exposed to the browser** — every OpenWeather call goes through `/api`
- 🚦 **Rate limited to 100 requests per IP** (configurable)

## Architecture

```
Browser ──►  /api/weather   ─┐
        ──►  /api/geocode    ─┴─►  OpenWeather API   (key added server-side)
```

- **Frontend:** React 18 + Vite + Tailwind CSS (`pizzahut_test/src`)
- **Backend:** Vercel serverless functions (`pizzahut_test/api`)
  - `GET /api/weather?lat=&lon=&units=` or `?q=&units=` → current weather
  - `GET /api/geocode?q=&limit=` → location search (autocomplete)
- **Rate limiting:** in-memory fixed-window limiter shared by both endpoints
  (`api/_lib/rateLimit.js`)

The browser only ever talks to our own `/api` endpoints; those attach the secret
`OPENWEATHER_API_KEY` server-side, so the key is never shipped to the client.

## Local development

Prerequisites: **Node 18+**.

```bash
cd pizzahut_test
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

### Option A — Git integration (recommended)

1. Push this repo to GitHub.
2. In Vercel: **Add New… → Project** and import the repo.
3. Set **Root Directory** to `pizzahut_test`.
4. Add the environment variable `OPENWEATHER_API_KEY` (and optionally the rate-limit
   ones) under **Project Settings → Environment Variables**.
5. **Deploy.** Vercel auto-detects Vite (build `npm run build`, output `dist`) and
   serves `pizzahut_test/api/*` as serverless functions.

### Option B — Vercel CLI

```bash
cd pizzahut_test
vercel link --yes                             # create/link the project
echo "<your-key>" | vercel env add OPENWEATHER_API_KEY production
vercel --prod                                 # production deploy
```

## Testing

Unit tests use [Vitest](https://vitest.dev/) + Testing Library, with V8 coverage
exported as LCOV for SonarCloud.

```bash
cd pizzahut_test
npm test            # watch mode
npm run test:run    # single run
npm run coverage    # single run + coverage report in coverage/
```

Coverage is ~96% of lines. Tests cover the formatting/theming helpers, the API
client, the serverless handlers (`/api/weather`, `/api/geocode`), the per-IP rate
limiter, and the React components (search, weather view, geolocation flow).

## Code quality (SonarCloud)

A GitHub Actions workflow ([`.github/workflows/ci.yml`](.github/workflows/ci.yml))
runs the tests with coverage and pushes the results to SonarCloud on every push / PR
to `master`. Scanner config lives in
[`pizzahut_test/sonar-project.properties`](pizzahut_test/sonar-project.properties).

**One-time setup (required — this part needs your Sonar account):**

1. Sign in at <https://sonarcloud.io> with GitHub and **import** the `restom0/Pizzahut` repo.
2. Note the **Organization key** and **Project key** and set them in
   `pizzahut_test/sonar-project.properties` (`sonar.organization`, `sonar.projectKey`).
   The committed defaults assume `restom0` / `restom0_Pizzahut`.
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
logic in [`pizzahut_test/api/_lib/rateLimit.js`](./pizzahut_test/api/_lib/rateLimit.js).

## Credits

Weather data provided by [OpenWeather](https://openweathermap.org/).
