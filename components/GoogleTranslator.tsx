"use client";

import { useEffect, useState } from "react";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import Script from "next/script";

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: any;
  }
}

export default function GoogleTranslator() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initGoogleTranslate = () => {
      if (!window.google || !window.google.translate) return;

      const existing = document.getElementById("google_translate_element");
      if (existing && existing.childElementCount > 0) {
        return;
      }

      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element",
      );
    };

    window.googleTranslateElementInit = initGoogleTranslate;

    if (window.google && window.google.translate) {
      initGoogleTranslate();
    }

    const observer = new MutationObserver(() => {
      const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
      if (combo) {
        combo.setAttribute("aria-label", "Select language");
        combo.title = "Select language";
        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (typeof window !== "undefined") {
        delete window.googleTranslateElementInit;
      }
    };
  }, []);

  return (
    <div className="w-full bg-gray-50 border-b border-gray-200 relative z-40">
      <Script
        id="google-translate-script"
        src="https://translate.google.com/translate_a/element.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (
            typeof window !== "undefined" &&
            window.google &&
            window.google.translate &&
            typeof window.googleTranslateElementInit === "function"
          ) {
            window.googleTranslateElementInit();
          }
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setIsOpen((prev) => !prev);
            if (
              typeof window !== "undefined" &&
              typeof window.googleTranslateElementInit === "function"
            ) {
              window.googleTranslateElementInit();
            }
          }}
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-800 rounded-md px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50"
          aria-expanded={isOpen}
          aria-controls="google-translate-element-wrapper"
        >
          <GlobeAltIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <span className="hidden sm:inline">Language</span>
          <span className="sm:hidden">Translate</span>
        </button>
        <div
          id="google-translate-element-wrapper"
          className={`flex justify-end max-w-full overflow-x-auto transition-all duration-150 ${
            isOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 -translate-y-1 pointer-events-none sm:opacity-100 sm:translate-y-0 sm:pointer-events-auto"
          }`}
        >
          <div id="google_translate_element" className="inline-flex" />
        </div>
      </div>
      <style jsx global>{`
        .goog-te-gadget-simple {
          background-color: white !important;
          border: 1px solid #e5e7eb !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          font-size: 13px !important;
          display: flex !important;
          align-items: center !important;
          white-space: nowrap !important;
        }
        .goog-te-gadget-simple .goog-te-menu-value {
          color: #374151 !important;
        }
        .goog-te-gadget-simple .goog-te-menu-value span {
          border-left: none !important;
          color: #374151 !important;
        }
        .goog-te-banner-frame.skiptranslate {
          display: none !important;
        }
        body {
          top: 0px !important;
        }
        .goog-logo-link {
          display: none !important;
        }
        .goog-te-gadget {
          color: transparent !important;
        }
        .goog-te-gadget-simple:hover {
          background-color: #f9fafb !important;
          border-color: #d1d5db !important;
        }
      `}</style>
    </div>
  );
}
