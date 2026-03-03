import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/messages";

export function getLocaleFromDocument(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("aurora_locale="));
  const raw = match ? decodeURIComponent(match.split("=").slice(1).join("=")) : undefined;
  if (isLocale(raw)) return raw;
  return defaultLocale;
}

export function setLocaleCookie(locale: Locale, callback?: () => void) {
  document.cookie = `aurora_locale=${locale}; path=/; max-age=31536000; samesite=lax`;
  if (callback) {
    callback();
  }
}

