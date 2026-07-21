import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getApiKey, openWeather } from "./openweather.js";

const ORIGINAL_KEY = process.env.OPENWEATHER_API_KEY;

afterEach(() => {
  process.env.OPENWEATHER_API_KEY = ORIGINAL_KEY;
  vi.unstubAllGlobals();
});

describe("getApiKey", () => {
  it("returns the key when the env var is set", () => {
    process.env.OPENWEATHER_API_KEY = "test-key";
    expect(getApiKey()).toBe("test-key");
  });
  it("throws when the env var is missing", () => {
    delete process.env.OPENWEATHER_API_KEY;
    expect(() => getApiKey()).toThrow(/OPENWEATHER_API_KEY/);
  });
});

describe("openWeather", () => {
  beforeEach(() => {
    process.env.OPENWEATHER_API_KEY = "test-key";
  });

  it("builds the request URL with params + appid and returns ok/status/data", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: "world" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await openWeather("/data/2.5/weather", {
      lat: 1,
      lon: 2,
      units: "metric",
      empty: "",
      nothing: null,
      missing: undefined,
    });

    expect(result).toEqual({ ok: true, status: 200, data: { hello: "world" } });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://api.openweathermap.org/data/2.5/weather");
    expect(url.searchParams.get("lat")).toBe("1");
    expect(url.searchParams.get("units")).toBe("metric");
    expect(url.searchParams.get("appid")).toBe("test-key");
    // empty / null / undefined params are filtered out
    expect(url.searchParams.has("empty")).toBe(false);
    expect(url.searchParams.has("nothing")).toBe(false);
    expect(url.searchParams.has("missing")).toBe(false);
  });

  it("works with no params at all", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await openWeather("/geo/1.0/direct");
    expect(result.ok).toBe(true);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("appid")).toBe("test-key");
  });

  it("returns data: null when the response body is not valid JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("bad json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await openWeather("/x", {});
    expect(result).toEqual({ ok: false, status: 500, data: null });
  });
});
