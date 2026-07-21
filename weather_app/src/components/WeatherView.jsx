import {
  unitSymbol,
  formatTemp,
  windLabel,
  windValue,
  iconUrl,
  formatLocalTime,
  placeLabel,
} from "../lib/format";

export default function WeatherView({ weather, units }) {
  const condition = (weather.weather && weather.weather[0]) || {};
  const main = weather.main || {};
  const label = placeLabel(weather);
  const tz = weather.timezone || 0;
  const symbol = unitSymbol(units);

  const highlights = [
    { label: "Feels like", value: `${formatTemp(main.feels_like)}${symbol}` },
    { label: "Humidity", value: main.humidity != null ? `${main.humidity}%` : "--" },
    {
      label: "Wind",
      value: `${windValue(weather.wind && weather.wind.speed, units)} ${windLabel(units)}`,
    },
    { label: "Pressure", value: main.pressure != null ? `${main.pressure} hPa` : "--" },
    {
      label: "Visibility",
      value: weather.visibility != null ? `${(weather.visibility / 1000).toFixed(1)} km` : "--",
    },
    {
      label: "Cloudiness",
      value: weather.clouds && weather.clouds.all != null ? `${weather.clouds.all}%` : "--",
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
            <div>H: {formatTemp(main.temp_max)}{symbol}</div>
            <div>L: {formatTemp(main.temp_min)}{symbol}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/80">
          <span>🌅 {formatLocalTime(weather.sys && weather.sys.sunrise, tz)}</span>
          <span>🌇 {formatLocalTime(weather.sys && weather.sys.sunset, tz)}</span>
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
