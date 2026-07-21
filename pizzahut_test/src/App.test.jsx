import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./api", () => ({
  getWeatherByCoords: vi.fn(),
  getWeatherByQuery: vi.fn(),
  searchLocations: vi.fn(),
}));

import App from "./App";
import { getWeatherByCoords } from "./api";

function stubGeolocation(impl) {
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition: vi.fn(impl) },
    configurable: true,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  delete navigator.geolocation;
});

describe("App", () => {
  it("shows the empty state when geolocation is denied", async () => {
    stubGeolocation((_success, error) => error({ code: 1, PERMISSION_DENIED: 1 }));

    render(<App />);

    expect(
      await screen.findByText(/Search for a city to get started/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Location access denied/)).toBeInTheDocument();
    expect(getWeatherByCoords).not.toHaveBeenCalled();
  });

  it("loads current-location weather when geolocation succeeds", async () => {
    getWeatherByCoords.mockResolvedValue({
      name: "Testville",
      sys: { country: "US", sunrise: 0, sunset: 0 },
      timezone: 0,
      main: { temp: 20, feels_like: 20, temp_min: 18, temp_max: 22, humidity: 50, pressure: 1000 },
      wind: { speed: 2 },
      visibility: 10000,
      clouds: { all: 10 },
      weather: [{ main: "Clear", description: "clear sky", icon: "01d" }],
      coord: { lat: 10, lon: 20 },
    });
    stubGeolocation((success) => success({ coords: { latitude: 10, longitude: 20 } }));

    render(<App />);

    expect(await screen.findByRole("heading", { name: "Testville, US" })).toBeInTheDocument();
    expect(getWeatherByCoords).toHaveBeenCalledWith(10, 20, "metric");
  });

  it("shows an error card when the weather request fails", async () => {
    getWeatherByCoords.mockRejectedValue(new Error("Weather lookup failed."));
    stubGeolocation((success) => success({ coords: { latitude: 1, longitude: 2 } }));

    render(<App />);

    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText("Weather lookup failed.")).toBeInTheDocument();
  });
});
