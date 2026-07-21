import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithI18n } from "../test/utils";

vi.mock("../api", () => ({
  searchLocations: vi.fn(),
  getWeatherByCoords: vi.fn(),
  getWeatherByQuery: vi.fn(),
}));

import SearchBar from "./SearchBar";
import { searchLocations } from "../api";

const PLACEHOLDER = "Search for a city…";
const PARIS = { name: "Paris", state: "Ile-de-France", country: "FR", lat: 48.85, lon: 2.35 };

function type(value) {
  fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SearchBar", () => {
  it("searches after typing, shows results, and calls onSelect on click", async () => {
    searchLocations.mockResolvedValue([PARIS]);
    const onSelect = vi.fn();
    renderWithI18n(<SearchBar onSelect={onSelect} />);

    type("Paris");

    const option = await screen.findByText("Paris, Ile-de-France, FR");
    expect(searchLocations).toHaveBeenCalledWith("Paris");

    fireEvent.click(option);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Paris" }));
    // Selecting clears the input and closes the dropdown.
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toHaveValue("");
    expect(screen.queryByText("Paris, Ile-de-France, FR")).not.toBeInTheDocument();
  });

  it("does not search for queries shorter than 2 characters", async () => {
    renderWithI18n(<SearchBar onSelect={() => {}} />);
    type("P");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(searchLocations).not.toHaveBeenCalled();
  });

  it("hides the dropdown again when the query is cleared", async () => {
    searchLocations.mockResolvedValue([PARIS]);
    renderWithI18n(<SearchBar onSelect={() => {}} />);

    type("Paris");
    await screen.findByText("Paris, Ile-de-France, FR");

    type("P"); // back under the minimum length
    await waitFor(() =>
      expect(screen.queryByText("Paris, Ile-de-France, FR")).not.toBeInTheDocument()
    );
  });

  it("shows 'no matches' when the search returns an empty list", async () => {
    searchLocations.mockResolvedValue([]);
    renderWithI18n(<SearchBar onSelect={() => {}} />);
    type("Atlantis");
    expect(await screen.findByText("No matches found.")).toBeInTheDocument();
  });

  it("treats a missing response body as no matches", async () => {
    searchLocations.mockResolvedValue(undefined);
    renderWithI18n(<SearchBar onSelect={() => {}} />);
    type("Atlantis");
    expect(await screen.findByText("No matches found.")).toBeInTheDocument();
  });

  it("shows the error message when the search fails", async () => {
    searchLocations.mockRejectedValue(new Error("Too many requests"));
    renderWithI18n(<SearchBar onSelect={() => {}} />);
    type("Paris");
    expect(await screen.findByText("Too many requests")).toBeInTheDocument();
  });

  it("falls back to a generic message for errors without one", async () => {
    searchLocations.mockRejectedValue(new Error());
    renderWithI18n(<SearchBar onSelect={() => {}} />);
    type("Paris");
    expect(await screen.findByText("Search failed")).toBeInTheDocument();
  });

  it("closes on an outside click and reopens on focus", async () => {
    searchLocations.mockResolvedValue([PARIS]);
    renderWithI18n(<SearchBar onSelect={() => {}} />);

    type("Paris");
    await screen.findByText("Paris, Ile-de-France, FR");

    fireEvent.mouseDown(document.body);
    await waitFor(() =>
      expect(screen.queryByText("Paris, Ile-de-France, FR")).not.toBeInTheDocument()
    );

    fireEvent.focus(screen.getByPlaceholderText(PLACEHOLDER));
    expect(await screen.findByText("Paris, Ile-de-France, FR")).toBeInTheDocument();
  });

  it("discards a successful response that arrives after the query changed", async () => {
    let resolveStale;
    searchLocations
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveStale = resolve;
      }))
      .mockResolvedValue([]);
    renderWithI18n(<SearchBar onSelect={() => {}} />);

    type("Paris");
    // Let the debounce fire so the first request is genuinely in flight.
    await waitFor(() => expect(searchLocations).toHaveBeenCalledTimes(1));

    // Changing the query tears down the effect, marking that request stale.
    type("Lyon");
    resolveStale([PARIS]);

    await waitFor(() => expect(searchLocations).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("Paris, Ile-de-France, FR")).not.toBeInTheDocument();
  });

  it("discards a failed response that arrives after the query changed", async () => {
    let rejectStale;
    searchLocations
      .mockImplementationOnce(() => new Promise((_resolve, reject) => {
        rejectStale = reject;
      }))
      .mockResolvedValue([]);
    renderWithI18n(<SearchBar onSelect={() => {}} />);

    type("Paris");
    await waitFor(() => expect(searchLocations).toHaveBeenCalledTimes(1));

    type("Lyon");
    rejectStale(new Error("stale failure"));

    await waitFor(() => expect(searchLocations).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("stale failure")).not.toBeInTheDocument();
  });

  it("keeps the dropdown open when clicking inside it", async () => {
    searchLocations.mockResolvedValue([PARIS]);
    renderWithI18n(<SearchBar onSelect={() => {}} />);

    type("Paris");
    const option = await screen.findByText("Paris, Ile-de-France, FR");

    fireEvent.mouseDown(option);
    expect(screen.getByText("Paris, Ile-de-France, FR")).toBeInTheDocument();
  });
});
