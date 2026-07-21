import { useCallback, useEffect, useState } from "react";
import SearchBar from "./components/SearchBar";
import WeatherView from "./components/WeatherView";
import { getWeatherByCoords } from "./api";
import { themeFor } from "./lib/format";

export default function App() {
  const [units, setUnits] = useState(() => localStorage.getItem("units") || "metric");
  const [weather, setWeather] = useState(null);
  // status: locating | loading | ready | error | idle
  const [status, setStatus] = useState("locating");
  const [error, setError] = useState("");

  const loadByCoords = useCallback(
    async (lat, lon, activeUnits) => {
      setStatus("loading");
      setError("");
      try {
        const data = await getWeatherByCoords(lat, lon, activeUnits);
        setWeather(data);
        setStatus("ready");
      } catch (err) {
        setError(err.message || "Could not load weather.");
        setStatus("error");
      }
    },
    []
  );

  const requestMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("idle");
      setError("Geolocation isn't supported by your browser. Search for a city instead.");
      return;
    }
    setStatus("locating");
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => loadByCoords(pos.coords.latitude, pos.coords.longitude, units),
      (geoErr) => {
        setStatus("idle");
        setError(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? "Location access denied. Search for a city to see its weather."
            : "Couldn't determine your location. Search for a city instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }, [loadByCoords, units]);

  // Try to show the current location's weather on first load.
  useEffect(() => {
    requestMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectLocation(place) {
    loadByCoords(place.lat, place.lon, units);
  }

  function changeUnits(nextUnits) {
    if (nextUnits === units) return;
    setUnits(nextUnits);
    localStorage.setItem("units", nextUnits);
    if (weather?.coord) {
      loadByCoords(weather.coord.lat, weather.coord.lon, nextUnits);
    }
  }

  const theme = themeFor(weather);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${theme} transition-colors duration-700`}>
      <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-5 px-4 py-8 sm:py-12">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-white">⛅ Weather</h1>
          <UnitToggle units={units} onChange={changeUnits} />
        </header>

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SearchBar onSelect={handleSelectLocation} />
          </div>
          <button
            type="button"
            onClick={requestMyLocation}
            title="Use my location"
            aria-label="Use my location"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25"
          >
            <LocationIcon />
          </button>
        </div>

        <main className="flex-1">
          {status === "locating" && <StatusCard>Finding your location…</StatusCard>}
          {status === "loading" && <SkeletonCard />}
          {status === "error" && <ErrorCard message={error} onRetry={requestMyLocation} />}
          {status === "idle" && <EmptyState message={error} />}
          {status === "ready" && weather && <WeatherView weather={weather} units={units} />}
        </main>

        <footer className="text-center text-xs text-white/60">
          Data by{" "}
          <a
            className="underline hover:text-white/80"
            href="https://openweathermap.org/"
            target="_blank"
            rel="noreferrer"
          >
            OpenWeather
          </a>
        </footer>
      </div>
    </div>
  );
}

function UnitToggle({ units, onChange }) {
  return (
    <div className="flex rounded-full bg-white/15 p-1 text-sm ring-1 ring-white/20">
      {[
        ["metric", "°C"],
        ["imperial", "°F"],
      ].map(([value, symbol]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-full px-3 py-1 transition ${
            units === value ? "bg-white font-medium text-slate-900" : "text-white/80"
          }`}
        >
          {symbol}
        </button>
      ))}
    </div>
  );
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl bg-white/10 p-8 text-center text-white/80 ring-1 ring-white/15 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function StatusCard({ children }) {
  return (
    <Panel>
      <div className="flex flex-col items-center gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <p>{children}</p>
      </div>
    </Panel>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-4">
      <div className="h-52 animate-pulse rounded-3xl bg-white/10 ring-1 ring-white/15" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/10 ring-1 ring-white/10" />
        ))}
      </div>
    </div>
  );
}

// `message` always explains why we fell back to the empty state (permission
// denied, unsupported browser, …), so it is rendered as-is.
function EmptyState({ message }) {
  return (
    <Panel>
      <p className="text-lg font-medium text-white">Search for a city to get started</p>
      <p className="mt-2 text-sm text-white/70">{message}</p>
    </Panel>
  );
}

function ErrorCard({ message, onRetry }) {
  return (
    <Panel>
      <p className="text-lg font-medium text-white">Something went wrong</p>
      <p className="mt-2 text-sm text-white/70">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/25 transition hover:bg-white/30"
      >
        Try again
      </button>
    </Panel>
  );
}

function LocationIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
