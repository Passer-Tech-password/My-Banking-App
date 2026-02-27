"use client";

import { useRouter } from "next/navigation";
import { locales, localeLabels, type Locale } from "@/lib/i18n/messages";
import { setLocaleCookie } from "@/lib/i18n/client";

export default function LanguageSwitcher({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange?: (locale: Locale) => void;
}) {
  const router = useRouter();

  const setLocale = (nextLocale: Locale) => {
    setLocaleCookie(nextLocale);
    onChange?.(nextLocale);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="text-xs sm:text-sm bg-white border border-gray-300 text-gray-800 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        aria-label="Select language"
      >
        {locales.map((code) => (
          <option key={code} value={code}>
            {localeLabels[code]}
          </option>
        ))}
      </select>
    </div>
  );
}
