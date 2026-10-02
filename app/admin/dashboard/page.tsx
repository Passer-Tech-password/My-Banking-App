"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheckIcon,
  UserGroupIcon,
  BanknotesIcon,
  ClockIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AdminDashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [sessionIssuedAt, setSessionIssuedAt] = useState<string>("");
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      console.error("Logout failed:", err);
    }
    if (typeof window !== "undefined") {
      window.location.href = "/admin/login";
    } else {
      router.push("/admin/login");
      router.refresh();
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
          headers: { "Cache-Control": "no-store" },
        });
        if (!res.ok) {
          if (!cancelled) setError(t("admin.common.error"));
          if (!cancelled && typeof window !== "undefined") {
            window.location.href = "/admin/login";
          }
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          email?: string;
        };
        if (!cancelled) {
          if (data?.ok && data.email) {
            setEmail(data.email);
            const now = new Date();
            setSessionIssuedAt(now.toLocaleString());
            const exp = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            setSessionExpiresAt(exp.toLocaleString());
          } else {
            setError(t("admin.common.error"));
            if (typeof window !== "undefined") {
              window.location.href = "/admin/login";
            }
          }
        }
      } catch (err) {
        console.error("Session API error:", err);
        if (!cancelled) {
          setError(t("admin.common.error"));
          if (typeof window !== "undefined") {
            window.location.href = "/admin/login";
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <h2 className="text-lg font-semibold text-red-700 mb-2">
            {t("admin.common.error")}
          </h2>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t("admin.header.logout")}
          </button>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: t("admin.dashboard.activeUsers"),
      value: "Yes",
      icon: ShieldCheckIcon,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: t("admin.dashboard.totalUsers"),
      value: "Super User",
      icon: UserGroupIcon,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: t("admin.dashboard.todayTransfers"),
      value: "2 hours",
      icon: ClockIcon,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: t("admin.dashboard.totalBalance"),
      value: "HTTPS",
      icon: BanknotesIcon,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm mb-1">{t("admin.header.welcome")}</p>
            <h1 className="text-2xl sm:text-3xl font-bold break-all">
              {email || t("admin.dashboard.title")}
            </h1>
            <p className="text-blue-200 mt-2 text-sm">
              {t("admin.sidebar.overview")}
            </p>
          </div>
          <div className="hidden sm:flex flex-shrink-0 w-16 h-16 rounded-full bg-white/10 items-center justify-center">
            <ShieldCheckIcon className="w-10 h-10 text-green-300" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${s.bg} ${s.color}`}>
              <s.icon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{t("admin.dashboard.title")}</h2>
            <p className="text-sm text-gray-500">
              {t("admin.sidebar.overview")}
            </p>
          </div>
          <div className="p-6 space-y-4 text-sm">
            <div className="flex justify-between items-start gap-4">
              <span className="text-gray-500 flex-shrink-0">{t("admin.header.welcome")}</span>
              <span className="text-gray-900 font-medium text-right break-all">
                {email}
              </span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-gray-500 flex-shrink-0">{t("admin.dashboard.recentUsers")}</span>
              <span className="text-gray-900 font-medium text-right">
                {sessionIssuedAt}
              </span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-gray-500 flex-shrink-0">{t("admin.dashboard.pendingRequests")}</span>
              <span className="text-gray-900 font-medium text-right">
                {sessionExpiresAt}
              </span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-gray-500 flex-shrink-0">{t("admin.users.tableStatus")}</span>
              <span className="text-gray-900 font-medium text-right">
                HttpOnly, SameSite=Lax
              </span>
            </div>
            <div className="flex justify-between items-start gap-4">
              <span className="text-gray-500 flex-shrink-0">{t("admin.login.signIn")}</span>
              <span className="text-gray-900 font-medium text-right">
                HMAC-SHA256
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">{t("admin.dashboard.noRecentActivity")}</h2>
            <p className="text-sm text-gray-500">
              {t("admin.dashboard.viewAll")}
            </p>
          </div>
          <div className="p-6 space-y-3 text-sm">
            {[
              { title: "Rate limiting", desc: "5 attempts per 15 minutes" },
              { title: "Timing-safe comparison", desc: "Prevents timing attacks" },
              { title: "HttpOnly cookie", desc: "Inaccessible to JavaScript" },
              { title: "SameSite=Lax", desc: "CSRF protection" },
              { title: "HMAC-signed tokens", desc: "Tamper-proof session payloads" },
              { title: "Edge middleware", desc: "Per-request auth enforcement" },
            ].map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
              >
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg
                    className="w-3 h-3 text-green-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.584l7.29-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{f.title}</p>
                  <p className="text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <button
          onClick={handleLogout}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          {t("admin.sidebar.logout")}
        </button>
      </div>
    </div>
  );
}
