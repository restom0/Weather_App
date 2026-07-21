import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./_lib/rateLimit.js", () => ({ rateLimit: vi.fn(() => true) }));
vi.mock("./_lib/openweather.js", () => ({ openWeather: vi.fn() }));

import handler from "./weather.js";
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

describe("GET /api/weather", () => {
  it("returns 405 for non-GET methods", async () => {
    const res = makeRes();
    await handler(req("POST", {}), res);
    expect(res.statusCode).toBe(405);
  });

  it("returns 429 when rate limited", async () => {
    rateLimit.mockReturnValue(false);
    const res = makeRes();
    await handler(req("GET", { q: "London" }), res);
    expect(res.statusCode).toBe(429);
    expect(openWeather).not.toHaveBeenCalled();
  });

  it("returns 400 when neither q nor lat/lon are provided", async () => {
    const res = makeRes();
    await handler(req("GET", {}), res);
    expect(res.statusCode).toBe(400);
  });

  it("fetches weather by coordinates (default metric units)", async () => {
    openWeather.mockResolvedValue({ ok: true, status: 200, data: { name: "London" } });
    const res = makeRes();
    await handler(req("GET", { lat: "51.5", lon: "-0.12" }), res);

    expect(openWeather).toHaveBeenCalledWith("/data/2.5/weather", {
      lat: "51.5",
      lon: "-0.12",
      units: "metric",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ name: "London" });
  });

  it("fetches weather by city query with the requested units", async () => {
    openWeather.mockResolvedValue({ ok: true, status: 200, data: { name: "Tokyo" } });
    const res = makeRes();
    await handler(req("GET", { q: "Tokyo", units: "imperial" }), res);

    expect(openWeather).toHaveBeenCalledWith("/data/2.5/weather", {
      q: "Tokyo",
      units: "imperial",
    });
    expect(res.statusCode).toBe(200);
  });

  it("propagates the upstream error status and message", async () => {
    openWeather.mockResolvedValue({
      ok: false,
      status: 404,
      data: { message: "city not found" },
    });
    const res = makeRes();
    await handler(req("GET", { q: "zzzznotacity" }), res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "city not found" });
  });

  it("returns 500 when the upstream call throws", async () => {
    openWeather.mockRejectedValue(new Error("network down"));
    const res = makeRes();
    await handler(req("GET", { q: "London" }), res);
    expect(res.statusCode).toBe(500);
  });
});
