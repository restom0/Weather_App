import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithI18n } from "./test/utils";

vi.mock("./api", () => ({
  getWeatherByCoords: vi.fn(),
  getWeatherByQuery: vi.fn(),
  searchLocations: vi.fn(),
}));

import App from "./App";
import { getWeatherByCoords, searchLocations } from "./api";

const WEATHER = {
  name: "Testville",
  sys: { country: "US", sunrise: 0, sunset: 0 },
  timezone: 0,
  main: { temp: 20, feels_like: 20, temp_min: 18, temp_max: 22, humidity: 50, pressure: 1000 },
  wind: { speed: 2 },
  visibility: 10000,
  clouds: { all: 10 },
  weather: [{ main: "Clear", description: "clear sky", icon: "01d" }],
  coord: { lat: 10, lon: 20 },
};

function stubGeolocation(impl) {
  const getCurrentPosition = vi.fn(impl);
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition },
    configurable: true,
  });
  return getCurrentPosition;
}

const grant = (lat = 10, lon = 20) => (success) =>
  success({ coords: { latitude: lat, longitude: lon } });
const deny = (_success, error) => error({ code: 1, PERMISSION_DENIED: 1 });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  delete navigator.geolocation;
});

afterEach(() => {
  delete navigator.geolocation;
});

describe("App", () => {
  it("shows the empty state when geolocation is denied", async () => {
    stubGeolocation(deny);
    renderWithI18n(<App />);

    expect(await screen.findByText(/Search for a city to get started/)).toBeInTheDocument();
    expect(screen.getByText(/Location access denied/)).toBeInTheDocument();
    expect(getWeatherByCoords).not.toHaveBeenCalled();
  });

  it("reports a generic message for non-permission geolocation errors", async () => {
    stubGeolocation((_success, error) => error({ code: 2, PERMISSION_DENIED: 1 }));
    renderWithI18n(<App />);

    expect(await screen.findByText(/Couldn't determine your location/)).toBeInTheDocument();
  });

  it("reports when the browser has no geolocation support", async () => {
    // navigator.geolocation is deleted in beforeEach.
    renderWithI18n(<App />);
    expect(await screen.findByText(/isn't supported by your browser/)).toBeInTheDocument();
  });

  it("loads current-location weather when geolocation succeeds", async () => {
    getWeatherByCoords.mockResolvedValue(WEATHER);
    stubGeolocation(grant());
    renderWithI18n(<App />);

    expect(await screen.findByRole("heading", { name: "Testville, US" })).toBeInTheDocument();
    expect(getWeatherByCoords).toHaveBeenCalledWith(10, 20, "metric", "en");
  });

  it("honours a stored unit preference", async () => {
    localStorage.setItem("units", "imperial");
    getWeatherByCoords.mockResolvedValue(WEATHER);
    stubGeolocation(grant());
    renderWithI18n(<App />);

    await screen.findByRole("heading", { name: "Testville, US" });
    expect(getWeatherByCoords).toHaveBeenCalledWith(10, 20, "imperial", "en");
  });

  it("shows an error card when the weather request fails, and retries", async () => {
    getWeatherByCoords.mockRejectedValue(new Error("Weather lookup failed."));
    const getCurrentPosition = stubGeolocation(grant());
    renderWithI18n(<App />);

    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText("Weather lookup failed.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(2));
  });

  it("falls back to a generic message for errors without one", async () => {
    getWeatherByCoords.mockRejectedValue(new Error());
    stubGeolocation(grant());
    renderWithI18n(<App />);

    expect(await screen.findByText("Could not load weather.")).toBeInTheDocument();
  });

  it("refetches in the new unit when the toggle changes", async () => {
    getWeatherByCoords.mockResolvedValue(WEATHER);
    stubGeolocation(grant());
    renderWithI18n(<App />);
    await screen.findByRole("heading", { name: "Testville, US" });

    fireEvent.click(screen.getByRole("button", { name: "°F" }));

    await waitFor(() =>
      expect(getWeatherByCoords).toHaveBeenCalledWith(10, 20, "imperial", "en")
    );
    expect(localStorage.getItem("units")).toBe("imperial");
  });

  it("ignores a click on the already-active unit", async () => {
    getWeatherByCoords.mockResolvedValue(WEATHER);
    stubGeolocation(grant());
    renderWithI18n(<App />);
    await screen.findByRole("heading", { name: "Testville, US" });

    fireEvent.click(screen.getByRole("button", { name: "°C" }));
    expect(getWeatherByCoords).toHaveBeenCalledTimes(1);
  });

  it("changes units without refetching when no location is loaded", async () => {
    stubGeolocation(deny);
    renderWithI18n(<App />);
    await screen.findByText(/Search for a city to get started/);

    fireEvent.click(screen.getByRole("button", { name: "°F" }));
    expect(localStorage.getItem("units")).toBe("imperial");
    expect(getWeatherByCoords).not.toHaveBeenCalled();
  });

  it("loads the weather for a location picked from search", async () => {
    stubGeolocation(deny);
    searchLocations.mockResolvedValue([
      { name: "Paris", state: "Ile-de-France", country: "FR", lat: 48.85, lon: 2.35 },
    ]);
    getWeatherByCoords.mockResolvedValue({ ...WEATHER, name: "Paris" });
    renderWithI18n(<App />);
    await screen.findByText(/Search for a city to get started/);

    fireEvent.change(screen.getByPlaceholderText("Search for a city…"), {
      target: { value: "Paris" },
    });
    fireEvent.click(await screen.findByText("Paris, Ile-de-France, FR"));

    await waitFor(() =>
      expect(getWeatherByCoords).toHaveBeenCalledWith(48.85, 2.35, "metric", "en")
    );
  });

  it("refetches in the new language and re-labels the UI", async () => {
    getWeatherByCoords.mockResolvedValue(WEATHER);
    stubGeolocation(grant());
    renderWithI18n(<App />);
    await screen.findByRole("heading", { name: "Testville, US" });

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "de" } });

    // The description is localised by OpenWeather, so the request is repeated.
    await waitFor(() => expect(getWeatherByCoords).toHaveBeenCalledWith(10, 20, "metric", "de"));
    // …and the static UI switches language immediately.
    expect(screen.getByPlaceholderText("Stadt suchen…")).toBeInTheDocument();
  });

  it("ignores selecting the already-active language", async () => {
    getWeatherByCoords.mockResolvedValue(WEATHER);
    stubGeolocation(grant());
    renderWithI18n(<App />);
    await screen.findByRole("heading", { name: "Testville, US" });

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "en" } });
    expect(getWeatherByCoords).toHaveBeenCalledTimes(1);
  });

  it("changes language without refetching when no location is loaded", async () => {
    stubGeolocation(deny);
    renderWithI18n(<App />);
    await screen.findByText(/Search for a city to get started/);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "vi" } });

    expect(getWeatherByCoords).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Tìm một thành phố…")).toBeInTheDocument();
  });

  it("re-translates an existing error message when the language changes", async () => {
    stubGeolocation(deny);
    renderWithI18n(<App />);
    await screen.findByText(/Location access denied/);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "vi" } });

    expect(screen.getByText(/Quyền truy cập vị trí bị từ chối/)).toBeInTheDocument();
    expect(screen.queryByText(/Location access denied/)).not.toBeInTheDocument();
  });

  it("re-requests the location from the toolbar button", async () => {
    getWeatherByCoords.mockResolvedValue(WEATHER);
    const getCurrentPosition = stubGeolocation(grant());
    renderWithI18n(<App />);
    await screen.findByRole("heading", { name: "Testville, US" });

    fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(2));
  });
});
