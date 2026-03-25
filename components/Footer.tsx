"use client";

import React from "react";
import Link from "next/link";
import { createTranslator, type Locale } from "@/lib/i18n/messages";
import { getLocaleFromDocument } from "@/lib/i18n/client";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, limit, query, where, setDoc, doc, serverTimestamp } from "firebase/firestore";

export default function Footer({ locale }: { locale?: Locale }) {
  const [resolvedLocale, setResolvedLocale] = useState<Locale>(locale ?? "en");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
            <form
              className="flex flex-col gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (submitting) return;
                setFeedback(null);
                const user = auth.currentUser;
                if (!user) {
                  setFeedback("Please sign in to subscribe.");
                  return;
                }
                const emailTrimmed = email.trim().toLowerCase();
                if (!emailTrimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
                  setFeedback("Enter a valid email.");
                  return;
                }
                try {
                  setSubmitting(true);
                  const q = query(
                    collection(db, "subscribers"),
                    where("email", "==", emailTrimmed),
                    limit(1),
                  );
                  const snap = await getDocs(q);
                  if (!snap.empty) {
                    setFeedback("You are already subscribed.");
                    return;
                  }
                  const ref = doc(collection(db, "subscribers"));
                  await setDoc(ref, {
                    userId: user.uid,
                    email: emailTrimmed,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                  setFeedback("Subscribed successfully.");
                  setEmail("");
                } catch (err) {
                  console.error("Subscribe error:", err);
                  setFeedback("Subscription failed. Please try again.");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <input
                type="email"
                placeholder={t("footer.emailPlaceholder")}
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 placeholder-gray-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" disabled={submitting} className="bg-blue-600 px-4 py-3 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60">
                {t("footer.subscribeButton")}
              </button>
              {feedback && (
                <div className="text-xs text-gray-400">{feedback}</div>
              )}
            </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            {t("footer.rights")}
          </p>
          <div className="flex gap-6">
             <Link href="https://facebook.com" target="_blank" rel="noopener" aria-label="Facebook" className="text-gray-400 hover:text-white transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 4.99 3.66 9.13 8.44 9.94v-7.03H7.9v-2.91h2.54V9.41c0-2.5 1.49-3.88 3.77-3.88 1.09 0 2.23.2 2.23.2v2.44h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34v7.03C18.34 21.19 22 17.05 22 12.06Z"/></svg>
             </Link>
             <Link href="https://twitter.com" target="_blank" rel="noopener" aria-label="Twitter" className="text-gray-400 hover:text-white transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M19.633 7.997c.013.18.013.36.013.542 0 5.533-4.215 11.9-11.9 11.9-2.363 0-4.56-.69-6.408-1.884.33.039.65.052.994.052 1.953 0 3.75-.664 5.18-1.78-1.82-.039-3.354-1.236-3.88-2.884.26.038.52.064.792.064.377 0 .754-.052 1.105-.143-1.907-.39-3.34-2.066-3.34-4.087v-.052c.556.31 1.2.5 1.88.52a4.154 4.154 0 0 1-1.852-3.456c0-.78.208-1.496.572-2.12a11.781 11.781 0 0 0 8.54 4.333 4.688 4.688 0 0 1-.104-.95c0-2.302 1.867-4.168 4.168-4.168 1.2 0 2.284.5 3.042 1.31a8.24 8.24 0 0 0 2.652-1.01 4.188 4.188 0 0 1-1.832 2.31A8.36 8.36 0 0 0 22 6.162a8.98 8.98 0 0 1-2.367 1.835Z"/></svg>
             </Link>
             <Link href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram" className="text-gray-400 hover:text-white transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 .002 6.002A3 3 0 0 0 12 9Zm4.5-3a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 16.5 6Z"/></svg>
             </Link>
             <Link href="https://linkedin.com" target="_blank" rel="noopener" aria-label="LinkedIn" className="text-gray-400 hover:text-white transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M20.447 20.452H17.21v-5.569c0-1.328-.027-3.036-1.852-3.036-1.853 0-2.136 1.447-2.136 2.942v5.663H9.01V9h3.111v1.561h.044c.435-.825 1.498-1.694 3.081-1.694 3.295 0 3.902 2.168 3.902 4.991v6.594ZM5.337 7.433a1.806 1.806 0 1 1 0-3.612 1.806 1.806 0 0 1 0 3.612Zm1.62 13.019H3.716V9h3.241v11.452Z"/></svg>
             </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
