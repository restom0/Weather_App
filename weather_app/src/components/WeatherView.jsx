import {
  unitSymbol,
  formatTemp,
  windLabel,
  windValue,
  iconUrl,
  formatLocalTime,
  placeLabel,
} from "../lib/format";
import { useI18n } from "../i18n";

export default function WeatherView({ weather, units }) {
  const { t, language } = useI18n();
  const condition = weather.weather?.[0] || {};
  const main = weather.main || {};
  const label = placeLabel(weather);
  const tz = weather.timezone || 0;
  const symbol = unitSymbol(units);

  const highlights = [
    { label: t("feelsLike"), value: `${formatTemp(main.feels_like)}${symbol}` },
    { label: t("humidity"), value: main.humidity != null ? `${main.humidity}%` : "--" },
    {
      label: t("wind"),
      value: `${windValue(weather.wind?.speed, units)} ${windLabel(units)}`,
    },
    { label: t("pressure"), value: main.pressure != null ? `${main.pressure} hPa` : "--" },
    {
      label: t("visibility"),
      value: weather.visibility != null ? `${(weather.visibility / 1000).toFixed(1)} km` : "--",
    },
    {
      label: t("cloudiness"),
      value: weather.clouds?.all != null ? `${weather.clouds.all}%` : "--",
    },
  ];

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-white/15 p-6 shadow-xl ring-1 ring-white/20 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-semibold text-white">{label}</h2>
            <p className="mt-1 capitalize text-white/70">{condition.description || ""}</p>
          </div>
          {condition.icon && (
            <img
              src={iconUrl(condition.icon, "@2x")}
              alt={condition.description || "weather"}
              width={80}
              height={80}
              className="-mr-2 -mt-2 shrink-0 drop-shadow"
            />
          )}
        </div>

        <div className="mt-2 flex items-end gap-4">
          <span className="text-7xl font-light leading-none text-white">
            {formatTemp(main.temp)}
            {symbol}
          </span>
          <div className="mb-2 text-sm text-white/70">
            <div>{t("high")}: {formatTemp(main.temp_max)}{symbol}</div>
            <div>{t("low")}: {formatTemp(main.temp_min)}{symbol}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/80">
          <span>🌅 {formatLocalTime(weather.sys?.sunrise, tz, language)}</span>
          <span>🌇 {formatLocalTime(weather.sys?.sunset, tz, language)}</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {highlights.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur"
          >
            <div className="text-xs uppercase tracking-wide text-white/60">{item.label}</div>
            <div className="mt-1 text-lg font-medium text-white">{item.value}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
