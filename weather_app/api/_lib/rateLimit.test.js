import { describe, it, expect, vi, afterEach } from "vitest";

function makeRes() {
  return {
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
  };
}

function makeReq(headers = {}, socket = { remoteAddress: "9.9.9.9" }) {
  return { headers, socket };
}

// Re-imports the module so the in-memory bucket map and the env-derived limits
// are rebuilt for each test.
async function loadRateLimit({ max = "2", windowMs = "100000" } = {}) {
  process.env.RATE_LIMIT_MAX = max;
  process.env.RATE_LIMIT_WINDOW_MS = windowMs;
  vi.resetModules();
  const { rateLimit } = await import("./rateLimit.js");
  return rateLimit;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests under the limit and sets rate-limit headers", async () => {
    const rateLimit = await loadRateLimit();
    const res = makeRes();
    const allowed = rateLimit(makeReq({ "x-forwarded-for": "1.1.1.1" }), res);

    expect(allowed).toBe(true);
    expect(res.headers["X-RateLimit-Limit"]).toBe("2");
    expect(res.headers["X-RateLimit-Remaining"]).toBe("1");
    expect(res.headers["X-RateLimit-Reset"]).toBeDefined();
  });

  it("blocks requests over the limit and sets Retry-After", async () => {
    const rateLimit = await loadRateLimit();
    const req = makeReq({ "x-forwarded-for": "2.2.2.2" });

    expect(rateLimit(req, makeRes())).toBe(true); // 1
    expect(rateLimit(req, makeRes())).toBe(true); // 2
    const res = makeRes();
    expect(rateLimit(req, res)).toBe(false); // 3 > limit of 2

    expect(res.headers["X-RateLimit-Remaining"]).toBe("0");
    expect(res.headers["Retry-After"]).toBeDefined();
  });

  it("falls back to the built-in defaults when the env vars are unset", async () => {
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    vi.resetModules();
    const { rateLimit } = await import("./rateLimit.js");

    const res = makeRes();
    rateLimit(makeReq({ "x-forwarded-for": "8.8.8.8" }), res);
    expect(res.headers["X-RateLimit-Limit"]).toBe("100");
  });

  it("uses the first x-forwarded-for entry as the client IP", async () => {
    const rateLimit = await loadRateLimit();
    const req = makeReq({ "x-forwarded-for": "5.5.5.5, 10.0.0.1" });
    rateLimit(req, makeRes());
    const res = makeRes();
    rateLimit(req, res);
    expect(res.headers["X-RateLimit-Remaining"]).toBe("0");
  });

  it("ignores an empty x-forwarded-for and falls back to x-real-ip", async () => {
    const rateLimit = await loadRateLimit();
    const req = { headers: { "x-forwarded-for": "", "x-real-ip": "3.3.3.3" }, socket: {} };
    rateLimit(req, makeRes());
    const res = makeRes();
    rateLimit(req, res);
    // Counted against 3.3.3.3, so the second hit exhausts the limit of 2.
    expect(res.headers["X-RateLimit-Remaining"]).toBe("0");
  });

  it("falls back to socket.remoteAddress, then to 'unknown'", async () => {
    const rateLimit = await loadRateLimit();
    // Distinct identities are counted independently, so each is allowed.
    expect(rateLimit({ headers: {}, socket: { remoteAddress: "4.4.4.4" } }, makeRes())).toBe(true);
    expect(rateLimit({ headers: {}, socket: {} }, makeRes())).toBe(true); // -> "unknown"
    expect(rateLimit({ headers: {} }, makeRes())).toBe(true); // no socket at all
  });

  it("starts a fresh window once the previous one expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const rateLimit = await loadRateLimit({ max: "2", windowMs: "1000" });
    const req = makeReq({ "x-forwarded-for": "6.6.6.6" });

    expect(rateLimit(req, makeRes())).toBe(true);
    expect(rateLimit(req, makeRes())).toBe(true);
    expect(rateLimit(req, makeRes())).toBe(false); // limit reached

    // Move past the window: the bucket resets and requests are allowed again.
    vi.setSystemTime(new Date("2024-01-01T00:00:05Z"));
    const res = makeRes();
    expect(rateLimit(req, res)).toBe(true);
    expect(res.headers["X-RateLimit-Remaining"]).toBe("1");
  });

  it("sweeps expired buckets once the map grows large", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    const rateLimit = await loadRateLimit({ max: "100", windowMs: "1000" });

    // 5000 buckets created at t0; they expire one second later.
    for (let i = 0; i < 5000; i += 1) {
      const ip = `10.0.${Math.floor(i / 256)}.${i % 256}`;
      rateLimit(makeReq({ "x-forwarded-for": ip }), makeRes());
    }

    // Jump past the window, then add two fresh buckets (size becomes 5002).
    vi.setSystemTime(new Date("2024-01-01T00:00:05Z"));
    rateLimit(makeReq({ "x-forwarded-for": "172.16.0.1" }), makeRes());
    rateLimit(makeReq({ "x-forwarded-for": "172.16.0.2" }), makeRes());

    // Size > 5000, so this call triggers the sweep: the 5000 stale buckets are
    // dropped while the two fresh ones survive.
    expect(rateLimit(makeReq({ "x-forwarded-for": "172.16.0.3" }), makeRes())).toBe(true);

    const res = makeRes();
    rateLimit(makeReq({ "x-forwarded-for": "172.16.0.1" }), res);
    expect(res.headers["X-RateLimit-Remaining"]).toBe("98"); // second hit survived
  });
});
