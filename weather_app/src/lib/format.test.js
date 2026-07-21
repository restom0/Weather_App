import { describe, it, expect } from "vitest";
import {
  unitSymbol,
  formatTemp,
  windLabel,
  windValue,
  iconUrl,
  formatLocalTime,
  placeLabel,
  formatLocationOption,
  themeFor,
} from "./format";

describe("unitSymbol", () => {
  it("returns °F for imperial and °C otherwise", () => {
    expect(unitSymbol("imperial")).toBe("°F");
    expect(unitSymbol("metric")).toBe("°C");
    expect(unitSymbol(undefined)).toBe("°C");
  });
});

describe("formatTemp", () => {
  it("rounds numbers", () => {
    expect(formatTemp(16.7)).toBe(17);
    expect(formatTemp(16.2)).toBe(16);
    expect(formatTemp(0)).toBe(0);
  });
  it("returns -- for missing or NaN values", () => {
    expect(formatTemp(undefined)).toBe("--");
    expect(formatTemp(null)).toBe("--");
    expect(formatTemp(NaN)).toBe("--");
  });
});

describe("windLabel", () => {
  it("returns mph for imperial and km/h otherwise", () => {
    expect(windLabel("imperial")).toBe("mph");
    expect(windLabel("metric")).toBe("km/h");
  });
});

describe("windValue", () => {
  it("passes mph through (rounded) for imperial", () => {
    expect(windValue(3.4, "imperial")).toBe(3);
  });
  it("converts m/s to km/h for metric", () => {
    expect(windValue(3, "metric")).toBe(11); // 3 * 3.6 = 10.8 -> 11
    expect(windValue(0, "metric")).toBe(0);
  });
  it("returns -- for missing speed", () => {
    expect(windValue(undefined, "metric")).toBe("--");
    expect(windValue(null, "imperial")).toBe("--");
  });
});

describe("iconUrl", () => {
  it("builds an OpenWeather icon URL", () => {
    expect(iconUrl("03d")).toBe("https://openweathermap.org/img/wn/03d@2x.png");
    expect(iconUrl("01n", "@4x")).toBe("https://openweathermap.org/img/wn/01n@4x.png");
  });
  it("returns empty string when no icon", () => {
    expect(iconUrl("")).toBe("");
    expect(iconUrl(undefined)).toBe("");
  });
});

describe("formatLocalTime", () => {
  it("returns -- for missing timestamps", () => {
    expect(formatLocalTime(undefined, 0)).toBe("--");
    expect(formatLocalTime(null, 0)).toBe("--");
  });
  it("applies the timezone offset (UTC-based)", () => {
    // 1700000000 = 2023-11-14T22:13:20Z -> +3600s offset => 23:13 local
    expect(formatLocalTime(1700000000, 3600)).toBe("11:13 PM");
    // handles the timestamp of 0 without treating it as missing
    expect(formatLocalTime(0, 0)).toBe("12:00 AM");
  });
});

describe("placeLabel", () => {
  it("joins name and country", () => {
    expect(placeLabel({ name: "London", sys: { country: "GB" } })).toBe("London, GB");
  });
  it("handles missing pieces", () => {
    expect(placeLabel({ name: "Nowhere" })).toBe("Nowhere");
    expect(placeLabel(null)).toBe("");
    expect(placeLabel({})).toBe("");
  });
});

describe("formatLocationOption", () => {
  it("joins name, state and country", () => {
    expect(
      formatLocationOption({ name: "Paris", state: "Texas", country: "US" })
    ).toBe("Paris, Texas, US");
  });
  it("skips missing state", () => {
    expect(formatLocationOption({ name: "Paris", country: "FR" })).toBe("Paris, FR");
  });
});

describe("themeFor", () => {
  const theme = (main, icon) => themeFor({ weather: [{ main, icon }] });

  it("returns the default gradient without weather data", () => {
    expect(themeFor(null)).toContain("from-sky-500");
    expect(themeFor({})).toContain("from-sky-500");
  });
  it("distinguishes clear day and night", () => {
    expect(theme("Clear", "01d")).toContain("sky-400");
    expect(theme("Clear", "01n")).toContain("indigo-950");
  });
  it("distinguishes cloudy day and night", () => {
    expect(theme("Clouds", "03d")).toContain("slate-500");
    expect(theme("Clouds", "03n")).toContain("slate-700");
  });
  it("maps precipitation and severe conditions", () => {
    expect(theme("Rain", "10d")).toContain("blue-900");
    expect(theme("Drizzle", "09d")).toContain("blue-900");
    expect(theme("Thunderstorm", "11d")).toContain("to-black");
    expect(theme("Snow", "13d")).toContain("sky-300");
    expect(theme("Fog", "50d")).toContain("slate-400");
  });
  it("falls back to the default gradient for unknown conditions", () => {
    expect(theme("Unknown", "01d")).toContain("from-sky-500");
  });
});
