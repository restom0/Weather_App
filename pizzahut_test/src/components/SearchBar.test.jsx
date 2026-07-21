import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../api", () => ({
  searchLocations: vi.fn(),
  getWeatherByCoords: vi.fn(),
  getWeatherByQuery: vi.fn(),
}));

import SearchBar from "./SearchBar";
import { searchLocations } from "../api";

const PLACEHOLDER = "Search for a city…";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SearchBar", () => {
  it("searches after typing, shows results, and calls onSelect on click", async () => {
    searchLocations.mockResolvedValue([
      { name: "Paris", state: "Ile-de-France", country: "FR", lat: 48.85, lon: 2.35 },
    ]);
    const onSelect = vi.fn();
    render(<SearchBar onSelect={onSelect} />);

    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: "Paris" },
    });

    const option = await screen.findByText("Paris, Ile-de-France, FR");
    expect(searchLocations).toHaveBeenCalledWith("Paris");

    fireEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Paris" }));
  });

  it("does not search for queries shorter than 2 characters", async () => {
    render(<SearchBar onSelect={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: "P" },
    });
    // Wait past the debounce window.
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(searchLocations).not.toHaveBeenCalled();
  });

  it("shows an error message when the search fails", async () => {
    searchLocations.mockRejectedValue(new Error("Too many requests"));
    render(<SearchBar onSelect={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), {
      target: { value: "Paris" },
    });
    expect(await screen.findByText("Too many requests")).toBeInTheDocument();
  });
});
