import { rateLimit } from "./_lib/rateLimit.js";
import { openWeather } from "./_lib/openweather.js";

/**
 * GET /api/weather
 *   ?lat=<num>&lon=<num>   -> current weather for coordinates
 *   ?q=<city>              -> current weather for a city name
 *   &units=metric|imperial (default: metric)
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

  const { lat, lon, q, units = "metric" } = req.query;

  let params;
  if (q) {
    params = { q, units };
  } else if (lat !== undefined && lon !== undefined) {
    params = { lat, lon, units };
  } else {
    return res
      .status(400)
      .json({ error: "Provide either `q`, or both `lat` and `lon`." });
  }

  try {
    const { ok, status, data } = await openWeather("/data/2.5/weather", params);
    if (!ok) {
      return res
        .status(status || 502)
        .json({ error: (data && data.message) || "Weather lookup failed." });
    }
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error." });
  }
}
