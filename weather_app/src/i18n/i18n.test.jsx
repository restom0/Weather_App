import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  I18nProvider,
  STORAGE_KEY,
  detectInitialLanguage,
  resolveLanguage,
  translate,
  useI18n,
} from "./index";
import { LANGUAGES, TRANSLATIONS } from "./translations";

function setNavigatorLanguages(value) {
  Object.defineProperty(navigator, "languages", { value, configurable: true });
}

function Probe() {
  const { t, language, languages, setLanguage } = useI18n();
  return (
    <div>
      <span data-testid="language">{language}</span>
      <span data-testid="title">{t("appTitle")}</span>
      <span data-testid="count">{languages.length}</span>
      <button type="button" onClick={() => setLanguage("de")}>
        pick-de
      </button>
      <button type="button" onClick={() => setLanguage("nope")}>
        pick-invalid
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  setNavigatorLanguages([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("translation dictionaries", () => {
  const englishKeys = Object.keys(TRANSLATIONS.en).sort();

  it("ships the seven requested languages", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["en", "es", "vi", "fr", "de", "ca", "it"]);
  });

  it.each(LANGUAGES.map((l) => l.code))(
    "defines the complete key set for %s with no empty strings",
    (code) => {
      expect(Object.keys(TRANSLATIONS[code]).sort()).toEqual(englishKeys);
      for (const value of Object.values(TRANSLATIONS[code])) {
        expect(typeof value).toBe("string");
        expect(value.trim()).not.toBe("");
      }
    }
  );

  it("actually translates rather than copying English", () => {
    for (const { code } of LANGUAGES.filter((l) => l.code !== "en")) {
      expect(TRANSLATIONS[code].humidity).not.toBe(TRANSLATIONS.en.humidity);
    }
  });
});

describe("resolveLanguage", () => {
  it("accepts supported codes regardless of case or region", () => {
    expect(resolveLanguage("fr")).toBe("fr");
    expect(resolveLanguage("ES")).toBe("es");
    expect(resolveLanguage("vi-VN")).toBe("vi");
  });
  it("rejects unsupported or empty values", () => {
    expect(resolveLanguage("ja")).toBeNull();
    expect(resolveLanguage("")).toBeNull();
    expect(resolveLanguage(null)).toBeNull();
    expect(resolveLanguage(undefined)).toBeNull();
  });
});

describe("detectInitialLanguage", () => {
  it("prefers a stored language", () => {
    expect(detectInitialLanguage("it", ["fr"])).toBe("it");
  });
  it("falls back to the first supported browser language", () => {
    expect(detectInitialLanguage(null, ["ja", "de-DE"])).toBe("de");
  });
  it("falls back to English when nothing matches", () => {
    expect(detectInitialLanguage(null, ["ja"])).toBe("en");
    expect(detectInitialLanguage("xx")).toBe("en"); // no browser languages given
  });
});

describe("translate", () => {
  it("returns the string for a known language and key", () => {
    expect(translate("ca", "humidity")).toBe("Humitat");
  });
  it("falls back to English for an unknown language", () => {
    expect(translate("ja", "humidity")).toBe("Humidity");
  });
  it("returns the key itself when it is not defined anywhere", () => {
    expect(translate("en", "missingKey")).toBe("missingKey");
  });
});

describe("I18nProvider", () => {
  it("defaults to English and exposes every language", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByTestId("language")).toHaveTextContent("en");
    expect(screen.getByTestId("title")).toHaveTextContent("Weather");
    expect(screen.getByTestId("count")).toHaveTextContent("7");
  });

  it("uses the stored preference", () => {
    localStorage.setItem(STORAGE_KEY, "vi");
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByTestId("title")).toHaveTextContent("Thời tiết");
  });

  it("uses the browser language when nothing is stored", () => {
    setNavigatorLanguages(["fr-FR"]);
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByTestId("title")).toHaveTextContent("Météo");
  });

  it("copes with a browser that exposes no language list", () => {
    setNavigatorLanguages(undefined);
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    expect(screen.getByTestId("language")).toHaveTextContent("en");
  });

  it("switches language, persists it and updates <html lang>", () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText("pick-de"));

    expect(screen.getByTestId("title")).toHaveTextContent("Wetter");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("de");
    expect(document.documentElement.lang).toBe("de");
  });

  it("ignores an unsupported language and falls back to English", () => {
    localStorage.setItem(STORAGE_KEY, "de");
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );
    fireEvent.click(screen.getByText("pick-invalid"));

    expect(screen.getByTestId("language")).toHaveTextContent("en");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("en");
  });
});

describe("useI18n", () => {
  it("throws when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/I18nProvider/);
  });
});
