// Display helpers for weather data.
//
// The formatters always return a string so callers get a consistent type,
// falling back to "--" when a value is missing.

const PLACEHOLDER = "--";

export function unitSymbol(units) {
  return units === "imperial" ? "°F" : "°C";
}

export function formatTemp(value) {
  if (value === undefined || value === null || Number.isNaN(value)) return PLACEHOLDER;
  return String(Math.round(value));
}

export function windLabel(units) {
  return units === "imperial" ? "mph" : "km/h";
}

export function windValue(speed, units) {
  if (speed === undefined || speed === null) return PLACEHOLDER;
  // OpenWeather returns m/s for metric and mph for imperial.
  if (units === "imperial") return String(Math.round(speed));
  return String(Math.round(speed * 3.6)); // m/s -> km/h
}

export function iconUrl(icon, size = "@2x") {
  if (!icon) return "";
  return `https://openweathermap.org/img/wn/${icon}${size}.png`;
}

// Renders a UNIX timestamp in the observed location's local time. OpenWeather
// gives timestamps in UTC plus a `timezone` offset (seconds) for the location.
// The locale decides 12- vs 24-hour presentation, so no explicit hour12 here.
export function formatLocalTime(unixSeconds, timezoneOffsetSeconds, locale = "en") {
  if (unixSeconds === undefined || unixSeconds === null) return PLACEHOLDER;
  const offset = timezoneOffsetSeconds ?? 0;
  const date = new Date((unixSeconds + offset) * 1000);
  return date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function placeLabel(weather) {
  if (!weather) return "";
  const name = weather.name || "";
  const country = weather.sys?.country || "";
  return [name, country].filter(Boolean).join(", ");
}

export function formatLocationOption(place) {
  // From /geo/1.0/direct: { name, state, country, lat, lon }
  return [place.name, place.state, place.country].filter(Boolean).join(", ");
}

// Full, literal Tailwind gradient class strings (kept whole so the JIT compiler
// includes them) mapped from the current weather condition + day/night.
const THEMES = {
  clearDay: "from-sky-400 via-sky-500 to-blue-600",
  clearNight: "from-slate-900 via-indigo-950 to-slate-900",
  clouds: "from-slate-500 via-slate-600 to-slate-700",
  cloudsNight: "from-slate-700 via-slate-800 to-slate-900",
  rain: "from-slate-600 via-slate-700 to-blue-900",
  thunder: "from-slate-800 via-slate-900 to-black",
  snow: "from-sky-300 via-slate-300 to-slate-500",
  mist: "from-slate-400 via-slate-500 to-slate-600",
  default: "from-sky-500 via-blue-600 to-indigo-700",
};

export function themeFor(weather) {
  const condition = weather?.weather?.[0];
  if (!condition) return THEMES.default;
  const isNight = (condition.icon || "").endsWith("n");
  switch (condition.main) {
    case "Clear":
      return isNight ? THEMES.clearNight : THEMES.clearDay;
    case "Clouds":
      return isNight ? THEMES.cloudsNight : THEMES.clouds;
    case "Rain":
    case "Drizzle":
      return THEMES.rain;
    case "Thunderstorm":
      return THEMES.thunder;
    case "Snow":
      return THEMES.snow;
    case "Mist":
    case "Smoke":
    case "Haze":
    case "Dust":
    case "Fog":
    case "Sand":
    case "Ash":
    case "Squall":
    case "Tornado":
      return THEMES.mist;
    default:
      return THEMES.default;
  }
}
