import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGES, TRANSLATIONS } from "./translations";

export const STORAGE_KEY = "language";

const SUPPORTED = LANGUAGES.map((language) => language.code);

const I18nContext = createContext(null);

/** Normalises a tag such as "es-419" or "FR" to a supported code, or null. */
export function resolveLanguage(value) {
  if (!value) return null;
  const base = String(value).toLowerCase().split("-")[0];
  return SUPPORTED.includes(base) ? base : null;
}

/** A stored preference wins, then the browser's languages, then English. */
export function detectInitialLanguage(stored, preferred = []) {
  const fromStorage = resolveLanguage(stored);
  if (fromStorage) return fromStorage;
  for (const candidate of preferred) {
    const match = resolveLanguage(candidate);
    if (match) return match;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Looks up a translation key. Unknown languages fall back to English, and an
 * unknown key returns the key itself so a missing string is obvious in the UI.
 * (A test asserts every language defines the full English key set.)
 */
export function translate(language, key) {
  const dictionary = TRANSLATIONS[language] || TRANSLATIONS[DEFAULT_LANGUAGE];
  return dictionary[key] ?? key;
}

export function I18nProvider({ children }) {
  const [language, setLanguage] = useState(() =>
    detectInitialLanguage(localStorage.getItem(STORAGE_KEY), navigator.languages)
  );

  // Keep <html lang> in sync for assistive tech and search engines.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = useCallback((next) => {
    const resolved = resolveLanguage(next) || DEFAULT_LANGUAGE;
    setLanguage(resolved);
    localStorage.setItem(STORAGE_KEY, resolved);
  }, []);

  const value = useMemo(
    () => ({
      language,
      languages: LANGUAGES,
      setLanguage: changeLanguage,
      t: (key) => translate(language, key),
    }),
    [language, changeLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside an I18nProvider");
  }
  return context;
}
