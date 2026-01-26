"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: any;
  }
}

export default function GoogleTranslator() {
  useEffect(() => {
    if (typeof window !== "undefined" && !window.googleTranslateElementInit) {
      window.googleTranslateElementInit = function () {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          "google_translate_element"
        );
      };

      const script = document.createElement("script");
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full bg-gray-50 border-b border-gray-200 py-2 px-4 flex justify-end items-center relative z-50">
      <div id="google_translate_element" />
      <style jsx global>{`
        .goog-te-gadget-simple {
          background-color: white !important;
          border: 1px solid #e5e7eb !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          font-size: 13px !important;
          display: flex !important;
          align-items: center !important;
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
