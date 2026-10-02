"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { useTranslation } from "@/lib/i18n/useTranslation";

type CardRequestStatus = "none" | "pending" | "approved" | "rejected";

export default function TrackCardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CardRequestStatus>("none");
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthChecking(false);
        router.push("/login");
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const q = query(
          collection(db, "cardRequests"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1),
        );
        const snap = await getDocs(q);
        if (snap.empty) {
          setStatus("none");
          setRequestId(null);
        } else {
          const d = snap.docs[0]!;
          const s = String((d.data() as any)?.status || "pending");
          setStatus(s === "approved" || s === "rejected" ? (s as any) : "pending");
          setRequestId(d.id);
        }
      } catch (e) {
        console.error("Track card request failed:", e);
        setError(t("cards.refreshFailed"));
      } finally {
        setLoading(false);
        setAuthChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  return (
    <main className="w-full min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("trackCard.title")}</h1>
          <p className="text-sm text-gray-600 mb-6">{t("trackCard.subtitle")}</p>

          {authChecking || loading ? (
            <div className="flex items-center justify-center min-h-[160px]">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          ) : status === "none" ? (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-100 text-gray-700 px-4 py-3 rounded-lg">
                {t("cards.noneYet")}
              </div>
              <button
                type="button"
                onClick={() => router.push("/apply-card")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t("dashboard.cardPreview.apply")}
              </button>
            </div>
          ) : status === "pending" ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
              {t("dashboard.status.pending", { idSuffix: requestId ? ` (ID: ${requestId})` : "" })}
            </div>
          ) : status === "approved" ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                {t("dashboard.status.approved")}
              </div>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                {t("sidebar.dashboard")}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {t("cards.requestRejectedBody")}
              </div>
              <button
                type="button"
                onClick={() => router.push("/apply-card")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t("dashboard.cardPreview.reapply")}
              </button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
}

