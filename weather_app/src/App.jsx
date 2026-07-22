import { useCallback, useEffect, useMemo, useState } from "react";
import SearchBar from "./components/SearchBar";
import WeatherView from "./components/WeatherView";
import { getWeatherByCoords } from "./api";
import { themeFor } from "./lib/format";
import { useI18n } from "./i18n";

export default function App() {
  const { t, language, languages, setLanguage } = useI18n();
  const [units, setUnits] = useState(() => localStorage.getItem("units") || "metric");
  const [weather, setWeather] = useState(null);
  // status: locating | loading | ready | error | idle
  const [status, setStatus] = useState("locating");
  // Errors are held as a translation key (for messages we own) or as raw text
  // (for messages the API returned), so they re-translate when the language
  // changes instead of freezing the wording chosen when the error occurred.
  const [error, setError] = useState(null);

  const errorMessage = useMemo(() => {
    if (!error) return "";
    return error.key ? t(error.key) : error.text;
  }, [error, t]);

  const loadByCoords = useCallback(
    async (lat, lon, activeUnits, activeLanguage) => {
      setStatus("loading");
      setError(null);
      try {
        const data = await getWeatherByCoords(lat, lon, {
          units: activeUnits,
          lang: activeLanguage,
        });
        setWeather(data);
        setStatus("ready");
      } catch (err) {
        setError(err.message ? { text: err.message } : { key: "couldNotLoad" });
        setStatus("error");
      }
    },
    []
  );

  const requestMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("idle");
      setError({ key: "geolocationUnsupported" });
      return;
    }
    setStatus("locating");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => loadByCoords(pos.coords.latitude, pos.coords.longitude, units, language),
      (geoErr) => {
        setStatus("idle");
        setError({
          key:
            geoErr.code === geoErr.PERMISSION_DENIED
              ? "locationDenied"
              : "locationUnavailable",
        });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 }
    );
  }, [loadByCoords, units, language]);

  // Try to show the current location's weather on first load.
  useEffect(() => {
    requestMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectLocation(place) {
    loadByCoords(place.lat, place.lon, units, language);
  }

  function changeUnits(nextUnits) {
    if (nextUnits === units) return;
    setUnits(nextUnits);
    localStorage.setItem("units", nextUnits);
    if (weather?.coord) {
      loadByCoords(weather.coord.lat, weather.coord.lon, nextUnits, language);
    }
  }

  // Refetch so the weather description comes back in the new language too.
  function changeLanguage(nextLanguage) {
    if (nextLanguage === language) return;
    setLanguage(nextLanguage);
    if (weather?.coord) {
      loadByCoords(weather.coord.lat, weather.coord.lon, units, nextLanguage);
    }
  }

  const theme = themeFor(weather);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${theme} transition-colors duration-700`}>
      <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-5 px-4 py-8 sm:py-12">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-white">
            ⛅ {t("appTitle")}
          </h1>
          <div className="flex items-center gap-2">
            <LanguageSelect
              language={language}
              languages={languages}
              label={t("language")}
              onChange={changeLanguage}
            />
            <UnitToggle units={units} onChange={changeUnits} />
          </div>
        </header>

        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <SearchBar onSelect={handleSelectLocation} />
          </div>
          <button
            type="button"
            onClick={requestMyLocation}
            title={t("useMyLocation")}
            aria-label={t("useMyLocation")}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 transition hover:bg-white/25"
          >
            <LocationIcon />
          </button>
        </div>

        <main className="flex-1">
          {status === "locating" && <StatusCard>{t("findingLocation")}</StatusCard>}
          {status === "loading" && <SkeletonCard />}
          {status === "error" && (
            <ErrorCard
              title={t("errorTitle")}
              retryLabel={t("tryAgain")}
              message={errorMessage}
              onRetry={requestMyLocation}
            />
          )}
          {status === "idle" && <EmptyState title={t("emptyTitle")} message={errorMessage} />}
          {status === "ready" && weather && <WeatherView weather={weather} units={units} />}
        </main>

        <footer className="text-center text-xs text-white/60">
          {t("dataBy")}{" "}
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

function LanguageSelect({ language, languages, label, onChange }) {
  return (
    <select
      value={language}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
      title={label}
      className="rounded-full bg-white/15 px-3 py-1.5 text-sm text-white outline-none ring-1 ring-white/20 [&>option]:text-slate-900"
    >
      {languages.map((item) => (
        <option key={item.code} value={item.code}>
          {item.label}
        </option>
      ))}
    </select>
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
function EmptyState({ title, message }) {
  return (
    <Panel>
      <p className="text-lg font-medium text-white">{title}</p>
      <p className="mt-2 text-sm text-white/70">{message}</p>
    </Panel>
  );
}

function ErrorCard({ title, message, retryLabel, onRetry }) {
  return (
    <Panel>
      <p className="text-lg font-medium text-white">{title}</p>
      <p className="mt-2 text-sm text-white/70">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/25 transition hover:bg-white/30"
      >
        {retryLabel}
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
