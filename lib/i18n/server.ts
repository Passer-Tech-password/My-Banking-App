import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/messages";

type CookieStore = {
  get: (name: string) => { value: string } | undefined;
};

export function getLocaleFromCookies(cookieStore: CookieStore): Locale {
  const raw = cookieStore.get("aurora_locale")?.value;
  if (isLocale(raw)) return raw;
  return defaultLocale;
}

