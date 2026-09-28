"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FormDataState {
  email: string;
  password: string;
}

type TouchedState = Partial<Record<keyof FormDataState, boolean>>;

function validateEmail(email: string): string {
  if (!email.trim()) return "Email is required";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) return "Please enter a valid email address";
  return "";
}

function validatePassword(password: string): string {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return "";
}

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 1, label: "Weak", color: "bg-red-500" };
  if (score <= 4) return { level: 2, label: "Medium", color: "bg-yellow-500" };
  return { level: 3, label: "Strong", color: "bg-green-500" };
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<TouchedState>({});
  const [formData, setFormData] = useState<FormDataState>(() => ({
    email: "",
    password: "",
  }));
  const [showPassword, setShowPassword] = useState(false);

  const emailError = touched.email ? validateEmail(formData.email) : "";
  const passwordError = touched.password ? validatePassword(formData.password) : "";
  const passwordStrength = getPasswordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTouched({ email: true, password: true });

    const emailErr = validateEmail(formData.email);
    const passwordErr = validatePassword(formData.password);
    if (emailErr || passwordErr) {
      setLoading(false);
      setError(emailErr || passwordErr);
      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const raw = await res.text();
      const data = (() => {
        try {
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })() as { ok?: boolean; error?: string; redirectTo?: string } | null;

      if (res.status === 429) {
        setError(data?.error || "Too many attempts. Please try again later.");
        return;
      }

      if (!res.ok || !data?.ok) {
        const envMissingHeader = res.headers.get("X-Admin-Config-Status");
        const restartHint = res.headers.get("X-Admin-Config-Restart-Hint");
        if (envMissingHeader === "env-missing" && restartHint) {
          setError(
            `Invalid email or password. ADMIN SERVER CONFIG WARNING: ${restartHint} This message appears when ADMIN_EMAIL/ADMIN_PASSWORD in .env.local were changed or added after the server was started — fully stop and restart the Next.js dev/prod server for new values to take effect.`,
          );
          console.warn(
            "[Admin Login] Server reports X-Admin-Config-Status=env-missing. The admin credentials in the running Node.js process are not loaded. Restart the server after verifying .env.local variables.",
          );
          return;
        }
        setError(data?.error || "Invalid email or password");
        return;
      }

      const redirectTo = data.redirectTo || "/admin/dashboard";
      if (typeof window !== "undefined") {
        window.location.href = redirectTo;
      } else {
        router.replace(redirectTo);
      }
      return;
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
        <div className="bg-blue-900 px-6 py-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-800 text-white mb-4">
            <span className="text-xl font-bold">A</span>
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
                <div className="flex-1">{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                autoComplete="email"
                aria-invalid={!!emailError}
                aria-describedby={emailError ? "email-error" : undefined}
                className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  emailError
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
                placeholder="admin@example.com"
                onChange={handleChange}
                onBlur={handleBlur}
                value={formData.email}
              />
              {emailError && (
                <p id="email-error" className="mt-2 text-xs text-red-600">
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-xs text-blue-700 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                required
                autoComplete="current-password"
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? "password-error" : undefined}
                className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  passwordError
                    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
                    : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                }`}
                placeholder="••••••••"
                onChange={handleChange}
                onBlur={handleBlur}
                value={formData.password}
              />
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full ${
                          i <= passwordStrength.level ? passwordStrength.color : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Password strength: <span className="font-medium">{passwordStrength.label}</span>
                  </p>
                </div>
              )}
              {passwordError && (
                <p id="password-error" className="mt-2 text-xs text-red-600">
                  {passwordError}
                </p>
              )}
              {!passwordError && (
                <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                  <p>Password must contain:</p>
                  <ul className="ml-4 space-y-0.5">
                    <li className={formData.password.length >= 8 ? "text-green-600" : ""}>
                      {formData.password.length >= 8 ? "✓" : "○"} At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(formData.password) ? "text-green-600" : ""}>
                      {/[A-Z]/.test(formData.password) ? "✓" : "○"} One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(formData.password) ? "text-green-600" : ""}>
                      {/[a-z]/.test(formData.password) ? "✓" : "○"} One lowercase letter
                    </li>
                    <li className={/[0-9]/.test(formData.password) ? "text-green-600" : ""}>
                      {/[0-9]/.test(formData.password) ? "✓" : "○"} One number
                    </li>
                  </ul>
                </div>
              )}
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
              <span></span>
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
