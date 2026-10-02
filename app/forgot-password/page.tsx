"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useToast } from "@/components/ToastProvider";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;

    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, normalizedEmail);
      toast.success(t("forgot.success"));
      setEmail("");
    } catch (error: any) {
      console.error(error);
      toast.error(t("forgot.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("forgot.title")}</h1>
          <p className="text-sm text-gray-600 mb-6">
            {t("forgot.subtitle")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">{t("forgot.email")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="mt-1 w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder={t("forgot.emailPlaceholder")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 text-white py-2 rounded font-medium hover:bg-blue-800 transition-colors disabled:opacity-70"
            >
              {loading ? t("forgot.submitting") : t("forgot.submit")}
            </button>
          </form>

          <div className="mt-6 text-sm text-gray-600 flex items-center justify-between">
            <Link href="/login" className="text-blue-700 hover:underline">
              {t("forgot.backToLogin")}
            </Link>
            <Link href="/register" className="text-blue-700 hover:underline">
              {t("login.registerHere")}
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

