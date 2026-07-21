import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("./_lib/rateLimit.js", () => ({ rateLimit: vi.fn(() => true) }));
vi.mock("./_lib/openweather.js", () => ({ openWeather: vi.fn() }));

import handler from "./geocode.js";
import { rateLimit } from "./_lib/rateLimit.js";
import { openWeather } from "./_lib/openweather.js";

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const req = (method, query) => ({ method, headers: {}, query });

beforeEach(() => {
  vi.clearAllMocks();
  rateLimit.mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/geocode", () => {
  it("returns 405 for non-GET methods", async () => {
    const res = makeRes();
    await handler(req("POST", { q: "London" }), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe("GET");
  });

  it("returns 429 when rate limited", async () => {
    rateLimit.mockReturnValue(false);
    const res = makeRes();
    await handler(req("GET", { q: "London" }), res);
    expect(res.statusCode).toBe(429);
    expect(openWeather).not.toHaveBeenCalled();
  });

  it("returns 400 when q is missing or blank", async () => {
    const res1 = makeRes();
    await handler(req("GET", {}), res1);
    expect(res1.statusCode).toBe(400);

    const res2 = makeRes();
    await handler(req("GET", { q: "   " }), res2);
    expect(res2.statusCode).toBe(400);
  });

  it("returns matching locations and clamps the limit to 5", async () => {
    const results = [{ name: "Paris", country: "FR" }];
    openWeather.mockResolvedValue({ ok: true, status: 200, data: results });
    const res = makeRes();
    await handler(req("GET", { q: "Paris", limit: "20" }), res);

    expect(openWeather).toHaveBeenCalledWith("/geo/1.0/direct", { q: "Paris", limit: 5 });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(results);
    expect(res.headers["Cache-Control"]).toContain("s-maxage=3600");
  });

  it("uses the default limit of 5 when none is given", async () => {
    openWeather.mockResolvedValue({ ok: true, status: 200, data: [] });
    await handler(req("GET", { q: "Paris" }), makeRes());
    expect(openWeather).toHaveBeenCalledWith("/geo/1.0/direct", { q: "Paris", limit: 5 });
  });

  it("falls back to a limit of 5 when the limit is not a number", async () => {
    openWeather.mockResolvedValue({ ok: true, status: 200, data: [] });
    await handler(req("GET", { q: "Paris", limit: "abc" }), makeRes());
    expect(openWeather).toHaveBeenCalledWith("/geo/1.0/direct", { q: "Paris", limit: 5 });
  });

  it("returns an empty array when upstream data is not an array", async () => {
    openWeather.mockResolvedValue({ ok: true, status: 200, data: { message: "oops" } });
    const res = makeRes();
    await handler(req("GET", { q: "Paris" }), res);
    expect(res.body).toEqual([]);
  });

  it("returns an error status when the upstream call fails", async () => {
    openWeather.mockResolvedValue({ ok: false, status: 401, data: null });
    const res = makeRes();
    await handler(req("GET", { q: "Paris" }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Location search failed." });
  });

  it("defaults to 502 when the upstream failure has no status", async () => {
    openWeather.mockResolvedValue({ ok: false, status: undefined, data: null });
    const res = makeRes();
    await handler(req("GET", { q: "Paris" }), res);
    expect(res.statusCode).toBe(502);
  });

  it("returns 500 and logs when the upstream call throws", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    openWeather.mockRejectedValue(new Error("boom"));
    const res = makeRes();
    await handler(req("GET", { q: "Paris" }), res);

    expect(res.statusCode).toBe(500);
    expect(logged).toHaveBeenCalled();
  });
});
