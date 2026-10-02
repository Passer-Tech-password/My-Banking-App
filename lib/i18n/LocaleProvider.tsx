"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import {
  MESSAGES,
  defaultLocale,
  type Locale,
  isLocale,
} from "@/lib/i18n/messages";
import { getLocaleFromDocument, setLocaleCookie } from "@/lib/i18n/client";

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale | string, persist?: boolean) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale | string;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (isLocale(initialLocale)) return initialLocale;
    if (typeof document !== "undefined") return getLocaleFromDocument();
    return defaultLocale;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const detected = getLocaleFromDocument();
    if (detected !== locale) {
      setLocaleState(detected);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = (MESSAGES as any)[locale] || (MESSAGES as any)[defaultLocale];
      const base = (MESSAGES as any)[defaultLocale];
      let raw = dict?.[key] ?? base?.[key] ?? key;
      if (params && typeof raw === "string") {
        return raw.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
      }
      return raw;
    },
    [locale],
  );

  const setLocale = useCallback((next: Locale | string, persist = true) => {
    const l: Locale = isLocale(next) ? next : defaultLocale;
    setLocaleState(l);
    if (persist && typeof document !== "undefined") {
      setLocaleCookie(l);
      try {
        document.documentElement.lang = l;
      } catch {}
    }
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
