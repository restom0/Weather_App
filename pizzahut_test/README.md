# Weather App

React + Vite weather app with a Vercel serverless backend that proxies the OpenWeather
API (keeping the API key server-side) and rate-limits requests to **100 per IP**.

See the [repository README](../README.md) for the full overview. Quick start:

```bash
cp .env.example .env      # add your OpenWeather key
npm install
npm run dev               # http://localhost:5173
```

## Scripts

| Command            | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Dev server + serverless functions at `localhost:5173`  |
| `npm run build`    | Production build to `dist/`                             |
| `npm run preview`  | Preview the production build locally                   |
| `npm run lint`     | Run ESLint                                              |
| `npm test`         | Run Vitest in watch mode                                |
| `npm run test:run` | Run the test suite once                                |
| `npm run coverage` | Run tests once with a V8 / LCOV coverage report        |

## Structure

```
api/
  weather.js          GET /api/weather  (?lat=&lon=&units= | ?q=&units=)
  geocode.js          GET /api/geocode  (?q=&limit=)  — search autocomplete
  _lib/
    openweather.js    server-side OpenWeather client (holds the API key)
    rateLimit.js      in-memory per-IP rate limiter (100 req / 15 min)
src/
  App.jsx             app shell, state, geolocation
  components/         SearchBar, WeatherView
  lib/format.js       display + theming helpers
  api.js              client for our own /api endpoints
  test/setup.js       Vitest setup (jest-dom matchers)
*.test.js(x)          co-located unit tests (Vitest + Testing Library)
```

## Testing & code quality

Tests run on [Vitest](https://vitest.dev/) with V8 coverage exported as LCOV
(`coverage/lcov.info`) for SonarCloud. Coverage is ~96% of lines.

```bash
npm run coverage
```

CI ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)) runs the tests and
pushes coverage + analysis to SonarCloud on every push / PR to `master`. Scanner
config is in [`sonar-project.properties`](./sonar-project.properties). See the
[repository README](../README.md#code-quality-sonarcloud) for the one-time SonarCloud
setup (org/project keys, `SONAR_TOKEN` secret, disabling Automatic Analysis).

## Environment variables

| Variable               | Required | Default  |
| ---------------------- | :------: | -------- |
| `OPENWEATHER_API_KEY`  |   yes    | —        |
| `RATE_LIMIT_MAX`       |    no    | `100`    |
| `RATE_LIMIT_WINDOW_MS` |    no    | `900000` |

Deployment instructions are in the [repository README](../README.md#deploy-to-vercel).
