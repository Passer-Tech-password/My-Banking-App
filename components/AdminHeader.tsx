"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDefaultAvatarUrl } from "@/lib/config";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";

export default function AdminHeader({
  onMobileMenuClick,
}: {
  onMobileMenuClick?: () => void;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("Administrator");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout API call failed", error);
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
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    (async () => {
      try {
        const res = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "include",
          signal: controller?.signal ?? undefined,
        });
        if (res.ok) {
          const data = (await res.json()) as {
            ok?: boolean;
            email?: string;
          };
          if (!cancelled && data?.ok && data.email) {
            const email = data.email;
            setDisplayName(email);
            setAvatarUrl(getDefaultAvatarUrl(email));
          }
        }
      } catch (error) {
        if (cancelled) return;
        const isAbort =
          error instanceof DOMException && error.name === "AbortError";
        const isFailedFetchNoisy =
          error instanceof TypeError &&
          /failed to fetch/i.test(error.message || "");
        if (isAbort) return;
        if (isFailedFetchNoisy) {
          if (typeof window !== "undefined") {
            if ((window as any).__adminSessionFetchWarned__) return;
            (window as any).__adminSessionFetchWarned__ = true;
          }
          console.warn("Session check skipped (transient network).");
          return;
        }
        console.error("Session check failed:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      controller?.abort?.();
    };
  }, []);

  const initials = (displayName || "A")
    .split(/[@.\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-10 flex h-auto min-h-[5rem] w-full bg-white shadow-sm border-b border-gray-100 items-center justify-between px-3 sm:px-6 lg:px-12 py-3 gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-blue-600 transition-colors rounded-md"
          aria-label={t("admin.header.openNav")}
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        <h1 className="text-lg sm:text-xl font-semibold text-gray-800 hidden sm:block truncate">
          {t("admin.header.welcome")}
        </h1>
        <h2 className="text-base font-semibold text-gray-800 block sm:hidden truncate">
          {t("admin.header.welcomeShort")}
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-6 flex-shrink-0 min-w-0">
        <LanguageSwitcher />

        <button
          className="relative p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-md"
          aria-label={t("admin.header.notifications")}
        >
          <BellIcon className="w-6 h-6" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="relative max-w-full">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 sm:gap-3 pl-0 sm:pl-6 sm:border-l sm:border-gray-100 focus:outline-none group max-w-full"
          >
            <div className="text-right hidden md:block min-w-0 max-w-[16rem]">
              <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors truncate">
                {loading ? t("admin.common.loading") : displayName}
              </p>
              <p className="text-xs text-gray-500">{t("admin.header.role")}</p>
            </div>
            <div className="h-10 w-10 flex-shrink-0 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                    setAvatarUrl("");
                  }}
                />
              ) : initials ? (
                <span className="text-sm font-bold">{initials}</span>
              ) : (
                <UserCircleIcon className="w-6 h-6" />
              )}
            </div>
            <ChevronDownIcon
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                isProfileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsProfileOpen(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-full min-w-[14rem] max-w-[90vw] sm:min-w-[16rem] sm:max-w-[18rem] bg-white rounded-lg shadow-lg py-1 border border-gray-100 ring-1 ring-black ring-opacity-5 z-20">
                <div className="px-4 py-3 border-b border-gray-50">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {loading ? t("admin.common.loading") : displayName}
                  </p>
                  <p className="text-xs text-gray-500">{t("admin.header.role")}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4 flex-shrink-0" />
                  {t("admin.header.logout")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
