"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useToast } from "@/components/ToastProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const ADMIN_OVERRIDE_ENABLED =
    (process.env.NEXT_PUBLIC_ADMIN_OVERRIDE || "").toLowerCase() === "true" &&
    process.env.NODE_ENV !== "production";
  const ADMIN_OVERRIDE_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const ADMIN_OVERRIDE_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

  const [formData, setFormData] = useState(() => ({
    email:
      ADMIN_OVERRIDE_ENABLED && ADMIN_OVERRIDE_EMAIL
        ? ADMIN_OVERRIDE_EMAIL.trim().toLowerCase()
        : "",
    password:
      ADMIN_OVERRIDE_ENABLED && ADMIN_OVERRIDE_PASSWORD
        ? ADMIN_OVERRIDE_PASSWORD.trim()
        : "",
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();
      const password = formData.password;

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        toast.info("Please verify your email to access the admin portal.");
        router.replace(`/verify-email?next=${encodeURIComponent("/admin/dashboard")}`);
        return;
      }

      const bootstrapEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim().toLowerCase();
      const currentEmail = (user.email || "").trim().toLowerCase();
      if (!bootstrapEmail) {
        setError("Admin bootstrap is not configured. Set NEXT_PUBLIC_ADMIN_EMAIL.");
        await signOut(auth);
        return;
      }

      if (currentEmail && currentEmail === bootstrapEmail) {
        const securityRef = doc(db, "config", "security");
        const securitySnap = await getDoc(securityRef);
        if (!securitySnap.exists()) {
          try {
            await setDoc(securityRef, {
              bootstrapAdminEmail: currentEmail,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } catch (configError: any) {
            console.error("Bootstrap config init failed:", configError);
            setError(
              `Admin bootstrap config is missing and could not be initialized (${configError?.code || "unknown"}).`,
            );
            await signOut(auth);
            return;
          }
        }
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as {
          role?: string;
          blocked?: boolean | string;
          [key: string]: any;
        };
        const isBlocked = userData.blocked === true || userData.blocked === "true";
        if (isBlocked) {
          toast.error("Your account is restricted. Please contact support.");
          await signOut(auth);
          router.replace("/blocked");
          return;
        }
        if (userData.role === "admin") {
          router.replace("/admin/dashboard");
          return;
        } else {
          if (bootstrapEmail && currentEmail && currentEmail === bootstrapEmail) {
            try {
              await setDoc(
                doc(db, "users", user.uid),
                {
                  role: "admin",
                  updatedAt: serverTimestamp(),
                },
                { merge: true },
              );
              router.replace("/admin/dashboard");
              return;
            } catch (promoteError: any) {
              console.error("Admin promotion failed:", promoteError);
              setError(
                `Access denied (role=${String(userData.role || "unknown")}). Promotion failed (${promoteError?.code || "unknown"}).`,
              );
              await signOut(auth);
              return;
            }
          }
          setError(`Access denied. Not an admin account. (role=${String(userData.role || "unknown")})`);
          await signOut(auth);
        }
      } else {
        if (bootstrapEmail && currentEmail === bootstrapEmail) {
          await setDoc(doc(db, "users", user.uid), {
            email: currentEmail,
            role: "admin",
            blocked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          router.replace("/admin/dashboard");
          return;
        }
        setError(`Access denied. No user profile found. (uid=${user.uid})`);
        await signOut(auth);
      }

    } catch (err: any) {
      console.error("Login error:", err);

      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password. (auth/invalid-credential)");
      } else if (err.code === "auth/network-request-failed") {
        setError(
          "Network error while contacting Firebase. Please check your internet connection, VPN, or ad blockers and try again.",
        );
      } else if (err.code) {
        setError(`Login failed (${err.code}).`);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-blue-900 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-800 text-white mb-4">
            <span className="text-xl font-bold">S</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Admin Portal</h2>
          <p className="text-blue-200 mt-2 text-sm">Sign in to manage the banking system</p>
        </div>

        <div className="px-6 py-8">
          {error && (
            <div
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2"
              role="alert"
              aria-live="assertive"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="admin@example.com"
                onChange={handleChange}
                value={formData.email}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="••••••••"
                onChange={handleChange}
                value={formData.password}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            <div className="flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="text-blue-700 hover:underline">
                Forgot password?
              </Link>
              <Link href="/" className="text-gray-600 hover:underline">
                Back to site
              </Link>
            </div>
          </form>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Authorized personnel only. Secure connection.
          </p>
        </div>
      </div>
    </div>
  );
}
