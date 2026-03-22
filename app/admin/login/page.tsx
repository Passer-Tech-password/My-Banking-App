"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchSignInMethodsForEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/components/ToastProvider";
import { isAdminUserData, parseUserRole } from "@/lib/roles";
import { isBootstrapAdminError, resolveBootstrapAdminEmail } from "@/lib/adminBootstrap";

export default function AdminLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState("");
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugDetails, setDebugDetails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState(() => ({
    email: "",
    password: "",
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLastErrorCode(null);
    setDebugOpen(false);
    setLoading(true);

    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      try {
        await user.reload();
      } catch (reloadError: any) {
        console.error("Failed to reload user:", reloadError);
        const code = reloadError?.code ? String(reloadError.code) : undefined;
        if (code) setLastErrorCode(code);
        else setLastErrorCode("auth/network-request-failed");
        setError(
          "Network error while contacting Firebase. Disable VPN/ad blockers, try another network, and ensure your domain is added in Firebase Auth → Settings → Authorized domains. (auth/network-request-failed)",
        );
        await signOut(auth);
        return;
      }

      if (!user.emailVerified) {
        toast.info("Please verify your email to access the admin portal.");
        router.replace(`/verify-email?next=${encodeURIComponent("/admin/dashboard")}`);
        return;
      }

      await user.getIdToken(true);
      const idToken = await user.getIdToken();

      const currentEmailRaw = (user.email || "").trim();
      const currentEmail = currentEmailRaw.toLowerCase();
      let bootstrapEmail = "";
      let bootstrapIsAdmin = false;
      try {
        const result = await resolveBootstrapAdminEmail({
          idToken,
          currentEmail: currentEmailRaw,
        });
        bootstrapEmail = result.bootstrapAdminEmail;
        bootstrapIsAdmin = result.isBootstrapAdmin;
      } catch (e: any) {
        console.error("Bootstrap config error:", e);
        const code = e?.code ? String(e.code) : undefined;
        if (isBootstrapAdminError(e)) setError(e.message);
        else if (e?.code) setError(`Admin bootstrap config error (${code}).`);
        else setError("Admin bootstrap config error.");
        await signOut(auth);
        return;
      }

      const isBootstrapAdmin = bootstrapIsAdmin || currentEmail === bootstrapEmail;

      const userRef = doc(db, "users", user.uid);
      let userDoc = await getDoc(userRef);
      if (isBootstrapAdmin) {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const data = userDoc.exists() ? (userDoc.data() as unknown) : null;
          if (userDoc.exists() && isAdminUserData(data)) break;
          await new Promise((r) => setTimeout(r, 400));
          try {
            userDoc = await getDoc(userRef);
          } catch (readError) {
            console.error("Admin profile retry getDoc failed:", readError);
            break;
          }
        }
      }

      if (userDoc.exists()) {
        const userData = userDoc.data() as {
          role?: string;
          isAdmin?: boolean;
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
        const role = parseUserRole(userData.role);
        if (role === "admin" || isAdminUserData(userData)) {
          router.replace("/admin/dashboard");
          return;
        } else {
          if (isBootstrapAdmin) {
            setError("Admin profile promotion is still in progress. Please sign in again.");
            await signOut(auth);
            return;
          }
          setError(`Access denied. Not an admin account. (role=${String(userData.role || "unknown")})`);
          await signOut(auth);
        }
      } else {
        if (isBootstrapAdmin) {
          setError("Admin profile initialization is still in progress. Please sign in again.");
          await signOut(auth);
          return;
        }
        setError(`Access denied. No user profile found. (uid=${user.uid})`);
        await signOut(auth);
      }

    } catch (err: any) {
      if (err.code === "auth/invalid-credential") {
        setLastErrorCode("auth/invalid-credential");
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          const projectId = auth.app.options.projectId || "unknown-project";
          if (!methods || methods.length === 0) {
            setError(
              `No account found for this email in this Firebase project${projectId ? ` (${projectId})` : ""}.`,
            );
          } else if (methods.includes("password")) {
            setError("Invalid email or password. Try 'Forgot password?' to reset. (auth/invalid-credential)");
          } else {
            setError(
              `This email uses a different sign-in method (${methods.join(", ")}). (auth/invalid-credential)`,
            );
          }
        } catch (methodsError) {
          console.error("fetchSignInMethodsForEmail failed:", methodsError);
          setError("Invalid email or password. (auth/invalid-credential)");
        }
      } else if (err.code === "auth/network-request-failed") {
        setLastErrorCode("auth/network-request-failed");
        setError(
          "Network error while contacting Firebase. Disable VPN/ad blockers, try another network, and ensure your domain is added in Firebase Auth → Settings → Authorized domains. (auth/network-request-failed)",
        );
      } else if (err.code === "auth/unauthorized-domain") {
        setLastErrorCode("auth/unauthorized-domain");
        setError(
          "This domain is not authorized for Firebase Auth. Add your Vercel domain in Firebase Auth → Settings → Authorized domains. (auth/unauthorized-domain)",
        );
      } else if (err.code === "auth/invalid-api-key") {
        setLastErrorCode("auth/invalid-api-key");
        setError(
          "Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY on Vercel and locally. (auth/invalid-api-key)",
        );
      } else if (err.code) {
        setLastErrorCode(String(err.code));
        setError(`Login failed (${err.code}).`);
      } else {
        setError("Login failed. Please try again.");
        console.error("Login error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDebugDetails([]);
    setDebugOpen(false);
    if (!lastErrorCode) return;
    if (
      lastErrorCode !== "auth/network-request-failed" &&
      lastErrorCode !== "auth/unauthorized-domain" &&
      lastErrorCode !== "auth/invalid-api-key"
    ) {
      return;
    }

    const opts = auth.app.options;
    const apiKey = opts.apiKey ? `${opts.apiKey.slice(0, 4)}…${opts.apiKey.slice(-4)}` : "missing";
    setDebugDetails([
      `origin: ${window.location.origin}`,
      `hostname: ${window.location.hostname}`,
      `online: ${navigator.onLine ? "true" : "false"}`,
      `projectId: ${opts.projectId || "unknown-project"}`,
      `authDomain: ${opts.authDomain || "unknown-auth-domain"}`,
      `apiKey: ${apiKey}`,
      `errorCode: ${lastErrorCode}`,
    ]);
  }, [lastErrorCode]);

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
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <div>{error}</div>
                  {debugDetails.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDebugOpen((v) => !v)}
                      className="mt-2 text-xs text-red-700 underline"
                    >
                      {debugOpen ? "Hide details" : "Show details"}
                    </button>
                  )}
                  {debugOpen && debugDetails.length > 0 && (
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-red-700">
                      {debugDetails.join("\n")}
                    </pre>
                  )}
                </div>
              </div>
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
