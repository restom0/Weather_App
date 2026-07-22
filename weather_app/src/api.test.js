import { describe, it, expect, vi, afterEach } from "vitest";
import { getWeatherByCoords, getWeatherByQuery, searchLocations } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

function okJson(data) {
  return { ok: true, status: 200, json: async () => data };
}

describe("api client", () => {
  it("getWeatherByCoords calls /api/weather with lat/lon/units", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ name: "London" }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await getWeatherByCoords(51.5, -0.12, { units: "metric" });
    expect(data).toEqual({ name: "London" });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/weather");
    expect(url.searchParams.get("lat")).toBe("51.5");
    expect(url.searchParams.get("lon")).toBe("-0.12");
    expect(url.searchParams.get("units")).toBe("metric");
  });

  it("uses metric units by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({}));
    vi.stubGlobal("fetch", fetchMock);

    await getWeatherByCoords(1, 2);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("units")).toBe("metric");
  });

  it("omits empty, null and undefined query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({}));
    vi.stubGlobal("fetch", fetchMock);

    // `units: ""` must be dropped rather than sent as an empty value.
    await getWeatherByQuery("London", { units: "" });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.has("units")).toBe(false);
    expect(url.searchParams.get("q")).toBe("London");
  });

  it("getWeatherByQuery calls /api/weather with q", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ name: "Tokyo" }));
    vi.stubGlobal("fetch", fetchMock);

    await getWeatherByQuery("Tokyo", { units: "imperial" });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/weather");
    expect(url.searchParams.get("q")).toBe("Tokyo");
    expect(url.searchParams.get("units")).toBe("imperial");
  });

  it("passes the language through so descriptions come back localised", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({}));
    vi.stubGlobal("fetch", fetchMock);

    await getWeatherByCoords(1, 2, { units: "metric", lang: "vi" });
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("lang")).toBe("vi");

    await getWeatherByQuery("Paris", { units: "metric", lang: "fr" });
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("lang")).toBe("fr");
  });

  it("searchLocations calls /api/geocode with q/limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson([{ name: "Paris" }]));
    vi.stubGlobal("fetch", fetchMock);

    const data = await searchLocations("Paris", 3);
    expect(data).toEqual([{ name: "Paris" }]);

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/geocode");
    expect(url.searchParams.get("q")).toBe("Paris");
    expect(url.searchParams.get("limit")).toBe("3");
  });

  it("defaults the search limit to 5", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson([]));
    vi.stubGlobal("fetch", fetchMock);

    await searchLocations("Paris");
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("limit")).toBe("5");
  });

  it("throws with the server-provided error message on non-ok responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many requests" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getWeatherByQuery("London")).rejects.toThrow("Too many requests");
  });

  it("attaches the HTTP status to the thrown error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many requests" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getWeatherByQuery("London")).rejects.toMatchObject({ status: 429 });
  });

  it("falls back to a generic message when the body has no error field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ somethingElse: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchLocations("x")).rejects.toThrow(/Request failed \(503\)/);
  });

  it("falls back to a generic message when the body cannot be parsed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("no json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchLocations("x")).rejects.toThrow(/Request failed \(500\)/);
  });
});
