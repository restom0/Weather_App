// Frontend client for our own serverless API (which proxies OpenWeather).
// The browser never sees the OpenWeather API key.

async function get(path, params) {
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

export function getWeatherByCoords(lat, lon, units = "metric") {
  return get("/api/weather", { lat, lon, units });
}

export function getWeatherByQuery(q, units = "metric") {
  return get("/api/weather", { q, units });
}

export function searchLocations(q, limit = 5) {
  return get("/api/geocode", { q, limit });
}
