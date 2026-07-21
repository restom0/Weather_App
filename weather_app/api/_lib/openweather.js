// Thin server-side wrapper around the OpenWeather API. The API key lives only
// here (server-side, from an environment variable) and is never exposed to the
// browser.

const BASE_URL = "https://api.openweathermap.org";

export function getApiKey() {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) {
    throw new Error("OPENWEATHER_API_KEY environment variable is not set");
  }
  return key;
}

/**
 * Calls an OpenWeather endpoint and returns { ok, status, data }.
 * `params` are appended as query string values; the API key is added here.
 */
export async function openWeather(path, params = {}) {
  const url = new URL(BASE_URL + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  url.searchParams.set("appid", getApiKey());

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
}
