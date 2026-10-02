"use client";

import { useContext, useEffect, useState, useCallback } from "react";
import {
  MESSAGES,
  defaultLocale,
  type Locale,
  isLocale,
} from "@/lib/i18n/messages";
import { LocaleContext, type LocaleContextValue } from "@/lib/i18n/LocaleProvider";
import { getLocaleFromDocument, setLocaleCookie } from "@/lib/i18n/client";

export function useTranslation(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;

  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const detected = getLocaleFromDocument();
    setLocaleState(detected);
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
    }
  }, []);

  return { locale, t, setLocale };
}
