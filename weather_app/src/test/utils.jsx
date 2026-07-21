import { render } from "@testing-library/react";
import { I18nProvider, STORAGE_KEY } from "../i18n";

/**
 * Renders `ui` inside the i18n provider. Pass `language` to pin the locale —
 * the provider reads the stored preference when it mounts.
 */
export function renderWithI18n(ui, { language = "en", ...options } = {}) {
  localStorage.setItem(STORAGE_KEY, language);
  return render(<I18nProvider>{ui}</I18nProvider>, options);
}
