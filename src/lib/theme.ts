import { readConsent } from "@/lib/cookie-consent";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/**
 * Per-device preference, kept in a cookie so the root layout can render
 * `<html data-theme>` on the server and the first paint is already right.
 * Light is the default until someone picks otherwise. `system` is resolved in CSS (see the `dark` variant in globals.css).
 */
export const THEME_COOKIE = "hostayo-theme";

export function parseThemePreference(
  value: string | undefined,
): ThemePreference {
  return value === "system" || value === "dark" ? value : "light";
}

/**
 * Applies the theme now. It is only remembered across visits (as a cookie)
 * when the visitor allowed preference cookies; otherwise any saved one is removed.
 */
export function applyThemePreference(preference: ThemePreference) {
  document.documentElement.dataset.theme = preference;
  if (readConsent() === "all") {
    document.cookie = `${THEME_COOKIE}=${preference}; path=/; max-age=31536000; samesite=lax`;
  } else {
    document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
  }
}
