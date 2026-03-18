"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSignInMethodsForEmail, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ToastProvider";
import { parseUserRole } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        router.push("/verify-email");
        return;
      }
      try {
        const userRef = doc(db, "users", cred.user.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            email: cred.user.email ?? email,
            role: "user",
            blocked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            balance: 0,
          });
        } else {
          const role = parseUserRole(((snap.data() as unknown) as { role?: unknown })?.role);
          if (role === "admin") {
            router.push("/admin/dashboard");
            return;
          }
        }
      } catch (profileError) {
        console.error(profileError);
      }
      toast.success("Signed in successfully");
      router.push("/dashboard");
    } catch (err: any) {
      let message = "Invalid credentials. Please try again.";
      if (err.code === "auth/invalid-credential") {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          const projectId = auth.app.options.projectId || "unknown-project";
          if (!methods || methods.length === 0) {
            message = `No account found for this email in this Firebase project (${projectId}).`;
          } else if (methods.includes("password")) {
            message = "Invalid email or password. Use 'Forgot password?' to reset.";
          } else {
            message = `This email uses a different sign-in method (${methods.join(", ")}).`;
          }
        } catch (methodsError) {
          message = "Invalid email or password.";
        }
      } else if (err.code === "auth/user-not-found") {
        message = "No user found with this email.";
      } else if (err.code === "auth/wrong-password") {
        message = "Incorrect password.";
      } else if (err.code === "auth/too-many-requests") {
        message = "Too many failed attempts. Please try again later.";
      } else {
        console.error(err);
      }

      setError(message);
      toast.error(message);
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
