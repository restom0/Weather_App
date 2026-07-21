// Simple in-memory, per-IP fixed-window rate limiter.
//
// Defaults to 100 requests per IP per 15-minute window (configurable via the
// RATE_LIMIT_MAX and RATE_LIMIT_WINDOW_MS environment variables).
//
// NOTE: Vercel serverless functions are stateless and may run on multiple
// instances, so this counter is per-instance and resets on cold starts. It is a
// lightweight guard that is good enough for a demo / low-traffic app. For strict,
// globally-consistent limits, back it with a shared store such as Upstash Redis
// (see the README).

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX) || 100;

const buckets = new Map(); // ip -> { count, resetAt }

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return (
    req.headers["x-real-ip"] ||
    (req.socket && req.socket.remoteAddress) ||
    "unknown"
  );
}

function sweep(now) {
  for (const [ip, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(ip);
  }
}

/**
 * Applies rate limiting and sets standard RateLimit response headers.
 * Returns true if the request is allowed, false if it must be rejected (429).
 */
export function rateLimit(req, res) {
  const now = Date.now();
  // Bound memory usage by occasionally clearing out expired buckets.
  if (buckets.size > 5000) sweep(now);

  const ip = getClientIp(req);
  let bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, bucket);
  }
  bucket.count += 1;

  const remaining = Math.max(0, MAX_REQUESTS - bucket.count);
  res.setHeader("X-RateLimit-Limit", String(MAX_REQUESTS));
  res.setHeader("X-RateLimit-Remaining", String(remaining));
  res.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader("Retry-After", String(retryAfter));
    return false;
  }
  return true;
}
