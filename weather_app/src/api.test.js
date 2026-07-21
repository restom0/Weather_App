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

    const data = await getWeatherByCoords(51.5, -0.12, "metric");
    expect(data).toEqual({ name: "London" });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/weather");
    expect(url.searchParams.get("lat")).toBe("51.5");
    expect(url.searchParams.get("lon")).toBe("-0.12");
    expect(url.searchParams.get("units")).toBe("metric");
  });

  it("getWeatherByQuery calls /api/weather with q", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson({ name: "Tokyo" }));
    vi.stubGlobal("fetch", fetchMock);

    await getWeatherByQuery("Tokyo", "imperial");
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/weather");
    expect(url.searchParams.get("q")).toBe("Tokyo");
    expect(url.searchParams.get("units")).toBe("imperial");
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

  it("throws with the server-provided error message on non-ok responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many requests" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getWeatherByQuery("London")).rejects.toThrow("Too many requests");
  });

  it("throws a generic message when the error body cannot be parsed", async () => {
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
