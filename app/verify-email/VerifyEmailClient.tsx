"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, sendEmailVerification, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ToastProvider";

export default function VerifyEmailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [email, setEmail] = useState<string>("");
  const nextTarget = searchParams.get("next") || "/dashboard";
  const [resendAvailableAt, setResendAvailableAt] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const cooldownKey = email ? `verifyEmailResendAvailableAt:${email.toLowerCase()}` : "verifyEmailResendAvailableAt";

  useEffect(() => {
    if (!email) return;
    const raw = window.localStorage.getItem(cooldownKey);
    const parsed = raw ? Number(raw) : 0;
    if (Number.isFinite(parsed) && parsed > 0) {
      setResendAvailableAt(parsed);
    }
  }, [cooldownKey, email]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, resendAvailableAt - nowMs);
  const canResend = remainingMs === 0;
  const formatRemaining = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email || "");
      if (user.emailVerified) {
        router.replace(nextTarget);
        return;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router, nextTarget]);

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!canResend) {
      toast.info(`Please wait ${formatRemaining(remainingMs)} before resending.`);
      return;
    }
    try {
      setSending(true);
      await sendEmailVerification(user);
      const nextAt = Date.now() + 60_000;
      setResendAvailableAt(nextAt);
      window.localStorage.setItem(cooldownKey, String(nextAt));
      toast.success("Verification email sent. Check your inbox.");
    } catch (error) {
      console.error(error);
      const code = (error as any)?.code;
      if (code === "auth/too-many-requests") {
        const nextAt = Date.now() + 10 * 60_000;
        setResendAvailableAt(nextAt);
        window.localStorage.setItem(cooldownKey, String(nextAt));
        toast.error("Too many requests. Please wait a few minutes and try again.");
      } else if (code) {
        toast.error(`Failed to send verification email (${code}).`);
      } else {
        toast.error("Failed to send verification email.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      setChecking(true);
      await user.reload();
      if (user.emailVerified) {
        toast.success("Email verified. Welcome!");
        router.replace(nextTarget);
        return;
      }
      toast.info("Email not verified yet. Please check your inbox.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to check verification status.");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error(error);
      toast.error("Failed to sign out.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
          <p className="text-sm text-gray-600 mb-6">
            We sent a verification link to <span className="font-medium text-gray-900">{email || "your email"}</span>.
            Open your inbox and click the link to activate your account.
          </p>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={sending || !canResend}
              className="w-full bg-blue-700 text-white py-2 rounded font-medium hover:bg-blue-800 transition-colors disabled:opacity-70"
            >
              {sending
                ? "Sending..."
                : canResend
                  ? "Resend verification email"
                  : `Resend available in ${formatRemaining(remainingMs)}`}
            </button>
            <button
              type="button"
              onClick={handleCheck}
              disabled={checking}
              className="w-full bg-white border border-gray-300 text-gray-800 py-2 rounded font-medium hover:bg-gray-50 transition-colors disabled:opacity-70"
            >
              {checking ? "Checking..." : "I verified, continue"}
            </button>
          </div>

          <div className="mt-6 text-sm text-gray-600 flex items-center justify-between">
            <Link href="/contact-us" className="text-blue-700 hover:underline">
              Need help?
            </Link>
            <button onClick={handleSignOut} className="text-red-600 hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
