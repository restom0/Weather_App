import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import WeatherView from "./WeatherView";

const sample = {
  name: "London",
  sys: { country: "GB", sunrise: 1700000000, sunset: 1700040000 },
  timezone: 0,
  main: {
    temp: 16.7,
    feels_like: 15.4,
    temp_min: 15,
    temp_max: 18,
    humidity: 73,
    pressure: 1012,
  },
  wind: { speed: 3 },
  visibility: 10000,
  clouds: { all: 40 },
  weather: [{ main: "Clouds", description: "scattered clouds", icon: "03d" }],
};

describe("WeatherView", () => {
  it("renders place, condition and metric values", () => {
    render(<WeatherView weather={sample} units="metric" />);

    expect(screen.getByRole("heading", { name: "London, GB" })).toBeInTheDocument();
    expect(screen.getByText("scattered clouds")).toBeInTheDocument();
    expect(screen.getByText("17°C")).toBeInTheDocument(); // 16.7 rounded
    expect(screen.getByText("73%")).toBeInTheDocument();
    expect(screen.getByText("11 km/h")).toBeInTheDocument(); // 3 m/s -> 11 km/h
    expect(screen.getByText("1012 hPa")).toBeInTheDocument();
    expect(screen.getByText("10.0 km")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();

    const icon = screen.getByAltText("scattered clouds");
    expect(icon).toHaveAttribute("src", expect.stringContaining("03d"));
  });

  it("renders imperial units", () => {
    render(<WeatherView weather={sample} units="imperial" />);
    expect(screen.getByText("17°F")).toBeInTheDocument();
    expect(screen.getByText("3 mph")).toBeInTheDocument(); // imperial passes through
  });

  it("renders placeholders when the payload is missing fields", () => {
    render(<WeatherView weather={{}} units="metric" />);

    // Temperature, feels-like, humidity, pressure, visibility and cloudiness
    // all fall back to the placeholder.
    // The main temperature and "feels like" both fall back to the placeholder.
    expect(screen.getAllByText("--°C").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("-- km/h")).toBeInTheDocument();
    expect(screen.getAllByText("--").length).toBeGreaterThan(0);

    // No condition icon is rendered when the payload has no weather entry.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("uses generic alt text when the condition has an icon but no description", () => {
    render(<WeatherView weather={{ weather: [{ icon: "01d" }] }} units="metric" />);
    expect(screen.getByAltText("weather")).toBeInTheDocument();
  });

  it("renders sunrise/sunset placeholders without a sys block", () => {
    render(<WeatherView weather={{ main: { temp: 5 } }} units="metric" />);
    expect(screen.getByText("🌅 --")).toBeInTheDocument();
    expect(screen.getByText("🌇 --")).toBeInTheDocument();
  });
});
