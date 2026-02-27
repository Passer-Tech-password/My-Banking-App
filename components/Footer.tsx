"use client";

import React from "react";
import Link from "next/link";
import { createTranslator, type Locale } from "@/lib/i18n/messages";
import { getLocaleFromDocument } from "@/lib/i18n/client";
import { useEffect, useState } from "react";

export default function Footer({ locale }: { locale?: Locale }) {
  const [resolvedLocale, setResolvedLocale] = useState<Locale>(locale ?? "en");

  useEffect(() => {
    if (locale) {
      setResolvedLocale(locale);
      return;
    }
    setResolvedLocale(getLocaleFromDocument());
  }, [locale]);

  const t = createTranslator(resolvedLocale);

  return (
    <>
      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 py-16 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-6">
               <span className="font-bold text-2xl text-white">Aurora Bank</span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              {t("footer.about")}
            </p>
          </div>

          {/* Company */}
          <div>
            <h5 className="font-semibold mb-6 text-white tracking-wide uppercase text-sm">{t("footer.company")}</h5>
            <ul className="space-y-4 text-sm">
              <li>
                <Link href="/about" className="hover:text-blue-400 transition-colors">{t("footer.aboutLink")}</Link>
              </li>
              <li>
                <Link href="/contact-us" className="hover:text-blue-400 transition-colors">{t("footer.contactLink")}</Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-blue-400 transition-colors">{t("footer.privacyLink")}</Link>
              </li>
              <li>
                <span className="text-gray-500 cursor-default">{t("footer.careersSoon")}</span>
              </li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h5 className="font-semibold mb-6 text-white tracking-wide uppercase text-sm">{t("footer.products")}</h5>
            <ul className="space-y-4 text-sm">
              <li>
                <span className="text-gray-500 cursor-default">{t("footer.product1")}</span>
              </li>
              <li>
                <span className="text-gray-500 cursor-default">{t("footer.product2")}</span>
              </li>
              <li>
                <span className="text-gray-500 cursor-default">{t("footer.product3")}</span>
              </li>
              <li>
                <span className="text-gray-500 cursor-default">{t("footer.product4")}</span>
              </li>
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <h5 className="font-semibold mb-6 text-white tracking-wide uppercase text-sm">{t("footer.subscribe")}</h5>
            <p className="text-sm mb-4 text-gray-400">
              {t("footer.subscribeText")}
            </p>
            <form className="flex flex-col gap-3">
              <input
                type="email"
                placeholder={t("footer.emailPlaceholder")}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 placeholder-gray-500"
              />
              <button type="submit" className="bg-blue-600 px-4 py-3 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                {t("footer.subscribeButton")}
              </button>
            </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            {t("footer.rights")}
          </p>
          <div className="flex gap-6">
             {/* Social placeholders */}
             <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
             <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
             <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </footer>
    </>
  );
}
