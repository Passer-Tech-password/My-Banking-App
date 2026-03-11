"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { ClockIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

type FundingRequestStatus = "pending" | "approved" | "rejected";
type FundingRequestType = "deposit" | "withdrawal";

type FundingRequest = {
  id: string;
  userId: string;
  type: FundingRequestType;
  amount: number;
  status: FundingRequestStatus;
  createdAt?: any;
  updatedAt?: any;
};

export default function UserRequestsPage() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<FundingRequest[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthChecking(false);
        router.push("/login");
        return;
      }
      setAuthChecking(false);
      fetchRequests(user.uid);
    });
    return () => unsub();
  }, [router]);

  const fetchRequests = async (uid: string) => {
    try {
      setError(null);
      setLoading(true);
      const q = query(
        collection(db, "fundingRequests"),
        where("userId", "==", uid),
        limit(50),
      );
      const snap = await getDocs(q);
      const rows: FundingRequest[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() } as FundingRequest));
      const getCreatedAtMs = (value: any): number => {
        if (!value) return 0;
        if (typeof value?.toMillis === "function") return value.toMillis();
        if (typeof value?.seconds === "number") return value.seconds * 1000;
        if (typeof value === "string") return new Date(value).getTime() || 0;
        return 0;
      };
      rows.sort((a, b) => getCreatedAtMs(b.createdAt) - getCreatedAtMs(a.createdAt));
      setRequests(rows);
    } catch (e) {
      console.error("Failed to load requests:", e);
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Requests</h1>
          <p className="text-sm text-gray-500">Track your deposit and withdrawal requests.</p>
        </div>
        <button
          onClick={() => fetchRequests(auth.currentUser!.uid)}
          disabled={loading}
          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No requests yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((r) => (
              <div key={r.id} className="p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      r.type === "deposit" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {r.type.toUpperCase()}
                  </span>
                  <p className="text-lg font-bold text-gray-900">${Number(r.amount || 0).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === "pending" && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-600">
                      <ClockIcon className="w-4 h-4" />
                      Pending
                    </span>
                  )}
                  {r.status === "approved" && (
                    <span className="inline-flex items-center gap-1 text-sm text-green-700">
                      <CheckCircleIcon className="w-4 h-4" />
                      Approved
                    </span>
                  )}
                  {r.status === "rejected" && (
                    <span className="inline-flex items-center gap-1 text-sm text-red-700">
                      <XCircleIcon className="w-4 h-4" />
                      Rejected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
