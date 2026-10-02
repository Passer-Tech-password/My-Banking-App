"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { BellIcon, ShieldCheckIcon, MoonIcon, BanknotesIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "@/lib/i18n/useTranslation";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    notifications: true,
    twoFactor: false,
    darkMode: false,
    emailAlerts: true,
  });
  const [monthlyBudget, setMonthlyBudget] = useState<string>("");
  const [dailyTransferLimit, setDailyTransferLimit] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists() && snap.data().settings) {
        setSettings(snap.data().settings);
      }
      if (snap.exists() && snap.data().monthlyBudget != null) {
        setMonthlyBudget(String(snap.data().monthlyBudget));
      }
      if (snap.exists() && snap.data().dailyTransferLimit != null) {
        setDailyTransferLimit(String(snap.data().dailyTransferLimit));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const toggleSetting = async (key: keyof typeof settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);

    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { settings: newSettings });
    }
  };

  const saveBudget = async () => {
    const val = parseFloat(monthlyBudget);
    if (isNaN(val) || val < 0) return;
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { monthlyBudget: val });
    }
  };

  const saveDailyTransferLimit = async () => {
    const val = parseFloat(dailyTransferLimit);
    if (isNaN(val) || val < 0) return;
    const user = auth.currentUser;
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { dailyTransferLimit: val });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("settings.title")}</h1>
          <p className="text-sm text-gray-500">{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">

        {/* Notifications */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <BellIcon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{t("settings.notifications")}</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{t("settings.pushNotifications")}</p>
                <p className="text-sm text-gray-500">{t("settings.pushNotificationsDesc")}</p>
              </div>
              <button
                onClick={() => toggleSetting("notifications")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.notifications ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{t("settings.emailAlerts")}</p>
                <p className="text-sm text-gray-500">{t("settings.emailAlertsDesc")}</p>
              </div>
              <button
                onClick={() => toggleSetting("emailAlerts")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.emailAlerts ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.emailAlerts ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <ShieldCheckIcon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{t("settings.security")}</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{t("settings.twoFactor")}</p>
                <p className="text-sm text-gray-500">{t("settings.twoFactorDesc")}</p>
              </div>
              <button
                onClick={() => toggleSetting("twoFactor")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.twoFactor ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.twoFactor ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
              <MoonIcon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{t("settings.appearance")}</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{t("settings.darkMode")}</p>
                <p className="text-sm text-gray-500">{t("settings.darkModeDesc")}</p>
              </div>
              <button
                onClick={() => toggleSetting("darkMode")}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  settings.darkMode ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.darkMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <GlobeAltIcon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{t("settings.language")}</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium text-gray-900">{t("settings.language")}</p>
              <p className="text-sm text-gray-500">{t("settings.languageDesc")}</p>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Budget */}
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
              <BanknotesIcon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{t("settings.budgetAndLimits")}</h2>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">{t("settings.monthlyBudget.amount")}</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyBudget}
                placeholder={t("settings.monthlyBudgetPlaceholder")}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={saveBudget}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {t("settings.save")}
              </button>
            </div>
            <p className="text-sm text-gray-500">{t("settings.monthlyBudget.desc")}</p>
          </div>

          <div className="space-y-4 mt-8">
            <label className="block text-sm font-medium text-gray-700">{t("settings.transferLimits")}</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                step="0.01"
                value={dailyTransferLimit}
                placeholder={t("settings.dailyTransferLimitPlaceholder")}
                onChange={(e) => setDailyTransferLimit(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={saveDailyTransferLimit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                {t("settings.save")}
              </button>
            </div>
            <p className="text-sm text-gray-500">{t("settings.dailyTransferLimit.desc")}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
