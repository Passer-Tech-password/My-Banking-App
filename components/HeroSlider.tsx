"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createTranslator, type Locale } from "@/lib/i18n/messages";
import { getLocaleFromDocument } from "@/lib/i18n/client";

export default function HeroSlider({ locale }: { locale?: Locale }) {
  const [current, setCurrent] = useState(0);
  const [resolvedLocale, setResolvedLocale] = useState<Locale>(locale ?? "en");

  useEffect(() => {
    if (locale) {
      setResolvedLocale(locale);
      return;
    }
    setResolvedLocale(getLocaleFromDocument());
  }, [locale]);

  const t = createTranslator(resolvedLocale);

  const slides = [
    {
      title: t("hero.slide1.title"),
      subtitle: t("hero.slide1.subtitle"),
      description: t("hero.slide1.description"),
      bg: "bg-gradient-to-br from-blue-900 to-slate-900",
    },
    {
      title: t("hero.slide2.title"),
      subtitle: t("hero.slide2.subtitle"),
      description: t("hero.slide2.description"),
      bg: "bg-gradient-to-br from-indigo-900 to-blue-900",
    },
    {
      title: t("hero.slide3.title"),
      subtitle: t("hero.slide3.subtitle"),
      description: t("hero.slide3.description"),
      bg: "bg-gradient-to-br from-slate-900 to-gray-900",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-[600px] overflow-hidden bg-gray-900 text-white">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-1000 flex items-center justify-center ${
            index === current ? "opacity-100 z-10" : "opacity-0 z-0"
          } ${slide.bg}`}
        >
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
             <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
             <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-indigo-500 blur-3xl"></div>
          </div>

          <div className="max-w-4xl px-6 text-center relative z-20">
            <h2 className="text-xl md:text-2xl font-medium text-blue-300 mb-4 tracking-wide uppercase animate-fade-in-up">
              {slide.title}
            </h2>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight animate-fade-in-up delay-100">
              {slide.subtitle}
            </h1>
            <p className="text-gray-300 text-lg md:text-xl mb-10 max-w-2xl mx-auto animate-fade-in-up delay-200">
              {slide.description}
            </p>
            <div className="animate-fade-in-up delay-300">
              <Link
                href="/register"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-4 rounded-lg transition-all shadow-lg transform hover:scale-105 hover:shadow-blue-500/25"
              >
                {t("hero.getStarted")}
              </Link>
            </div>
          </div>
        </div>
      ))}
      
      {/* Dots */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 flex gap-3 z-30">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`h-3 rounded-full transition-all duration-300 ${
              idx === current ? "bg-blue-500 w-10" : "bg-white/30 hover:bg-white/50 w-3"
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
