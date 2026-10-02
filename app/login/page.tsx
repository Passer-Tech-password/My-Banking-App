"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSignInMethodsForEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ToastProvider";
import { isAdminUserData, parseUserRole } from "@/lib/roles";
import { getDefaultAvatarUrl } from "@/lib/config";
import { setLocaleCookie } from "@/lib/i18n/client";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/messages";
import { useTranslation } from "@/lib/i18n/useTranslation";

async function looksLikeAdminEmail(emailLower: string): Promise<false | { maskedEmail?: string }> {
  if (!emailLower) return false;
  const KNOWN_ADMIN_EMAIL = "ffclimmigration@gmail.com";
  try {
    const res = await fetch("/api/admin/login", {
      method: "GET",
      credentials: "same-origin",
      headers: { "Cache-Control": "no-store" },
    });
    if (!res.ok && res.status !== 503) {
      return emailLower === KNOWN_ADMIN_EMAIL ? { maskedEmail: "f••••••n@gmail.com" } : false;
    }
    const raw = await res.text().catch(() => "");
    const data = raw ? JSON.parse(raw) : null;
    const configured =
      typeof data?.configuredAdminEmail === "string" ? data.configuredAdminEmail.trim().toLowerCase() : "";
    if (configured && configured === emailLower) {
      return { maskedEmail: typeof data.configuredAdminEmailMasked === "string" ? data.configuredAdminEmailMasked : undefined };
    }
    if (!configured && emailLower === KNOWN_ADMIN_EMAIL) {
      return { maskedEmail: "f••••••n@gmail.com" };
    }
  } catch {
    if (emailLower === KNOWN_ADMIN_EMAIL) {
      return { maskedEmail: "f••••••n@gmail.com" };
    }
  }
  return false;
}

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { t, setLocale } = useTranslation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminMatch, setAdminMatch] = useState<{ maskedEmail?: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "email") setAdminMatch(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const email = formData.email.trim().toLowerCase();

    try {
      const cred = await signInWithEmailAndPassword(auth, email, formData.password);
      if (!cred.user.emailVerified) {
        toast.info(t("login.verifyEmail"));
        router.push(`/verify-email?next=${encodeURIComponent("/dashboard")}`);
        return;
      }

      const userRef = doc(db, "users", cred.user.uid);
      const snap = await getDoc(userRef);
      let preferredLanguage: string | null = null;
      let isAdmin = false;

      if (!snap.exists()) {
        const displayName =
          String(cred.user.displayName || "").trim() ||
          String(cred.user.email || "").trim().split("@")[0] ||
          "User";
        const photoURL =
          String(cred.user.photoURL || "").trim() ||
          getDefaultAvatarUrl(displayName || email);
        await setDoc(userRef, {
          email: cred.user.email ?? email,
          displayName,
          photoURL,
          role: "user",
          blocked: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          balance: 0,
        });
      } else {
        const data = snap.data() as unknown;
        const rawLang = (data as any)?.language;
        if (typeof rawLang === "string" && rawLang.trim() && isLocale(rawLang.trim())) {
          preferredLanguage = rawLang.trim();
          setLocaleCookie(preferredLanguage as Locale);
          setLocale(preferredLanguage as Locale, false);
        }
        const hasPhotoURL = !!String((data as any)?.photoURL || "").trim();
        if (!hasPhotoURL) {
          const displayName =
            String((data as any)?.displayName || "").trim() ||
            String(cred.user.displayName || "").trim() ||
            String(cred.user.email || "").trim().split("@")[0] ||
            "User";
          const photoURL =
            String((data as any)?.image || "").trim() ||
            String(cred.user.photoURL || "").trim() ||
            getDefaultAvatarUrl(displayName || email);
          await setDoc(userRef, { photoURL, updatedAt: serverTimestamp() }, { merge: true });
        }
        const blocked = (data as any)?.blocked;
        const isBlocked = blocked === true || blocked === "true";
        if (isBlocked) {
          toast.error(t("blocked.subtitle"));
          await signOut(auth);
          router.push("/blocked");
          return;
        }
        const role = parseUserRole((data as { role?: unknown } | null)?.role);
        if (role === "admin" || isAdminUserData(data)) {
          isAdmin = true;
        }
      }

      const targetLocale = preferredLanguage && isLocale(preferredLanguage)
        ? preferredLanguage
        : defaultLocale;
      setLocaleCookie(targetLocale);
      setLocale(targetLocale, false);
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.setAttribute("lang", targetLocale);
      }
      const dest = isAdmin ? "/admin/dashboard" : "/dashboard";
      toast.success(t("login.toast.signedIn"));
      router.push(dest);
    } catch (err: any) {
      if (err && err.message && err.message === "LOGIN_PROFILE_ERROR_MARKER") {
        toast.error(t("login.error.signedInProfileFailed"));
        try {
          await signOut(auth);
        } catch {}
      } else {
        let message = t("login.error.invalidCredentialsGeneric");
        if (err.code === "auth/invalid-credential") {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            const projectId = auth.app.options.projectId || "unknown-project";
            if (!methods || methods.length === 0) {
              const adminCheck = await looksLikeAdminEmail(email);
              if (adminCheck) {
                setAdminMatch(adminCheck);
                message = t("login.error.noAccountAdminHint");
              } else {
                message = t("login.error.noAccountProjectHint", { projectId });
              }
            } else if (methods.includes("password")) {
              message = t("login.error.wrongPasswordHint");
            } else {
              message = t("login.error.differentMethodHint", { methods: methods.join(", ") });
            }
          } catch (methodsError) {
            message = t("login.invalidCredentials");
          }
        } else if (err.code === "auth/user-not-found") {
          void (async () => {
            const adminCheck = await looksLikeAdminEmail(email);
            if (adminCheck) {
              setAdminMatch(adminCheck);
              setError(t("login.error.noAccountAdminHint"));
            }
          })();
          if (!adminMatch) message = t("login.error.userNotFoundAdmin");
          else message = t("login.error.noAccountAdminHint");
        } else if (err.code === "auth/wrong-password") {
          message = t("login.invalidCredentials");
        } else if (err.code === "auth/too-many-requests") {
          message = t("login.tooManyAttempts");
        } else if (err.code === "auth/network-request-failed") {
          const projectId = auth.app.options.projectId || "unknown-project";
          message = t("login.error.networkAuth", { projectId });
        } else {
          console.error("LOGIN ERROR:", err);
        }

        setError(message);
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gray-50">
        {/* LEFT SECTION */}
        <div className="flex flex-col justify-center px-6 md:px-12 py-12">
          {/* Logo */}
          <div className="mb-6">
            <img src="/logo.svg" alt={t("common.altLogo")} className="h-12 w-auto" />
          </div>

          <h2 className="text-2xl font-semibold mb-2">{t("login.title")}</h2>

          <p className="text-sm text-gray-600 mb-6 border-l-4 border-blue-600 pl-3">
            {t("login.welcomeBack")}
          </p>

          {error && (
            <div
              className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          {adminMatch && (
            <div
              className="bg-blue-50 text-blue-800 p-4 rounded mb-4 text-sm border border-blue-200"
              role="status"
            >
              <div className="font-semibold mb-2">{t("login.adminDetected.title")}</div>
              <p className="mb-3 text-blue-700">
                {t("login.adminDetected.body")}
              </p>
              <a
                href="/admin/login"
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h4.59l-2.1 1.95a.75.75 0 001.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 10-1.02 1.1l2.1 1.95H6.75z" clipRule="evenodd" />
                </svg>
                {t("login.adminDetected.button")}
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            {/* Email */}
            <div>
              <label className="text-sm font-medium">{t("login.email")}</label>
              <input
                type="email"
                name="email"
                placeholder={t("login.emailPlaceholder")}
                className="input mt-1 w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                onChange={handleChange}
                value={formData.email}
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">{t("login.password")}</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <input
                type="password"
                name="password"
                placeholder="••••••••"
                className="input mt-1 w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                onChange={handleChange}
                value={formData.password}
                autoComplete="current-password"
                required
              />
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-2 rounded font-medium hover:bg-blue-800 transition-colors disabled:opacity-70"
            >
              {loading ? t("login.submitting") : t("login.submit")}
            </button>

            {/* Open Account */}
            <Link
              href="/register"
              className="block text-center bg-red-600 text-white py-2 rounded text-sm"
            >
              {t("login.registerHere")}
            </Link>
          </form>
        </div>

        {/* RIGHT SECTION */}
        <div className="hidden md:flex items-center justify-center bg-gray-100 px-10">
          <div className="max-w-md text-center">
            <h3 className="font-semibold mb-3">{t("login.rightPanel.title")}</h3>
            <p className="text-sm text-gray-600">
              {t("login.rightPanel.body")}
            </p>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
