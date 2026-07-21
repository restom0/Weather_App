import { rateLimit } from "./_lib/rateLimit.js";
import { openWeather } from "./_lib/openweather.js";

/**
 * GET /api/geocode?q=<query>&limit=<1-5>
 * Returns up to `limit` matching locations (name, state, country, lat, lon)
 * from the OpenWeather Geocoding API, used to power the search autocomplete.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!rateLimit(req, res)) {
    return res
      .status(429)
      .json({ error: "Too many requests. Please slow down and try again shortly." });
  }

  const { q, limit = "5" } = req.query;
  if (!q || String(q).trim() === "") {
    return res.status(400).json({ error: "Provide a search query via `q`." });
  }

  try {
    const { ok, status, data } = await openWeather("/geo/1.0/direct", {
      q,
      limit: Math.min(Number(limit) || 5, 5),
    });
    if (!ok) {
      return res.status(status || 502).json({ error: "Location search failed." });
    }
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error." });
  }
}
