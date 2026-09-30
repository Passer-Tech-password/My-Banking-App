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
import { isLocale, defaultLocale } from "@/lib/i18n/messages";

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
        toast.info("Please verify your email to continue.");
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
          toast.error("Your account is restricted. Please contact support.");
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
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.setAttribute("lang", targetLocale);
      }
      const dest = isAdmin ? "/admin/dashboard" : "/dashboard";
      toast.success("Signed in successfully");
      router.push(dest);
    } catch (err: any) {
      if (err && err.message && err.message === "LOGIN_PROFILE_ERROR_MARKER") {
        toast.error("Signed in, but failed to load your profile. Please try again.");
        try {
          await signOut(auth);
        } catch {}
      } else {
        let message = "Invalid credentials. Please try again.";
        if (err.code === "auth/invalid-credential") {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            const projectId = auth.app.options.projectId || "unknown-project";
            if (!methods || methods.length === 0) {
              const adminCheck = await looksLikeAdminEmail(email);
              if (adminCheck) {
                setAdminMatch(adminCheck);
                message =
                  "This email address belongs to an Admin Portal account, not a regular user account. Please sign in via the Admin Portal at /admin/login.";
              } else {
                message = `No account found for this email in this Firebase project (${projectId}). If you are an administrator, please use the Admin Portal login page at /admin/login.`;
              }
            } else if (methods.includes("password")) {
              message = "Invalid email or password. Use 'Forgot password?' to reset.";
            } else {
              message = `This email uses a different sign-in method (${methods.join(", ")}).`;
            }
          } catch (methodsError) {
            message = "Invalid email or password.";
          }
        } else if (err.code === "auth/user-not-found") {
          void (async () => {
            const adminCheck = await looksLikeAdminEmail(email);
            if (adminCheck) {
              setAdminMatch(adminCheck);
              setError("This email address belongs to an Admin Portal account, not a regular user account. Please sign in via the Admin Portal at /admin/login.");
            }
          })();
          if (!adminMatch) message = "No user found with this email. If you are an administrator, please use the Admin Portal login page at /admin/login.";
          else message = "This email address belongs to an Admin Portal account, not a regular user account. Please sign in via the Admin Portal at /admin/login.";
        } else if (err.code === "auth/wrong-password") {
          message = "Incorrect password.";
        } else if (err.code === "auth/too-many-requests") {
          message = "Too many failed attempts. Please try again later.";
        } else if (err.code === "auth/network-request-failed") {
          const projectId = auth.app.options.projectId || "unknown-project";
          message =
            `Login request could not reach Firebase Authentication (project: ${projectId}). ` +
            "Check your network connection, ensure browser extensions/ad blockers are not blocking " +
            "*.googleapis.com or *.firebaseapp.com, verify the authorized domain list in Firebase Console, " +
            "and confirm the page protocol (HTTPS in production). ";
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
            <img src="/logo.svg" alt="Aurora Bank logo" className="h-12 w-auto" />
          </div>

          <h2 className="text-2xl font-semibold mb-2">Sign-In</h2>

          <p className="text-sm text-gray-600 mb-6 border-l-4 border-blue-600 pl-3">
            Access your Aurora Bank online banking panel using your
            registered email address and password.
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
              <div className="font-semibold mb-2">Admin Account Detected</div>
              <p className="mb-3 text-blue-700">
                This email is registered as an Administrator. You must sign in through the
                dedicated Admin Portal instead of this user login page.
              </p>
              <a
                href="/admin/login"
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded font-medium transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.75 9.25a.75.75 0 000 1.5h4.59l-2.1 1.95a.75.75 0 001.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 10-1.02 1.1l2.1 1.95H6.75z" clipRule="evenodd" />
                </svg>
                Go to Admin Portal Login
              </a>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            {/* Email */}
            <div>
              <label className="text-sm font-medium">Email Address</label>
              <input
                type="email"
                name="email"
                placeholder="Enter your Email Address"
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
                <label className="text-sm font-medium">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
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
              {loading ? "Signing in..." : "Continue"}
            </button>

            {/* Open Account */}
            <Link
              href="/register"
              className="block text-center bg-red-600 text-white py-2 rounded text-sm"
            >
              Open an Account
            </Link>
          </form>
        </div>

        {/* RIGHT SECTION */}
        <div className="hidden md:flex items-center justify-center bg-gray-100 px-10">
          <div className="max-w-md text-center">
            <h3 className="font-semibold mb-3">Protect your online banking.</h3>
            <p className="text-sm text-gray-600">
              We have security measures in place to safeguard your money,
              because we are committed to providing you with a secure banking
              experience. When we come across any hoaxes or scams that target
              customers, we will raise them to your attention.
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
