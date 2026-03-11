"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/components/ToastProvider";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

type FundingRequestStatus = "pending" | "approved" | "rejected";
type FundingRequestType = "deposit" | "withdrawal";

type FundingRequest = {
  id: string;
  userId: string;
  type: FundingRequestType;
  amount: number;
  status: FundingRequestStatus;
  txId?: string;
  method?: string;
  createdAt?: any;
  updatedAt?: any;
};

export default function AdminRequestsPage() {
  const router = useRouter();
  const toast = useToast();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [actingId, setActingId] = useState<string | null>(null);

  const ADMIN_OVERRIDE_ENABLED =
    (process.env.NEXT_PUBLIC_ADMIN_OVERRIDE || "").toLowerCase() === "true" &&
    process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (ADMIN_OVERRIDE_ENABLED) {
      console.warn(
        "Admin override is active: skipping Firebase auth checks on requests page. Do not enable this in production.",
      );
      setError(null);
      setAuthChecking(false);
      fetchRequests();
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthChecking(false);
        router.push("/admin/login");
        return;
      }
      try {
        setError(null);
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        if (!profileSnap.exists() || profileSnap.data()?.role !== "admin") {
          setAuthChecking(false);
          router.push("/admin/login");
          return;
        }
        setAuthChecking(false);
        fetchRequests();
      } catch (e) {
        console.error("Error verifying admin user:", e);
        setAuthChecking(false);
        setError("Authentication failed");
        router.push("/admin/login");
      }
    });

    return () => unsub();
  }, [router]);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );

  const fetchRequests = async () => {
    try {
      setError(null);
      setLoading(true);
      const q = query(
        collection(db, "fundingRequests"),
        where("status", "==", "pending"),
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

  const sendEmail = async (userId: string, type: string, amount: number, status: string, referenceId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data();
      const email = userData.email;
      const userName = userData.firstName || userData.displayName || "User";

      if (!email) return;

      await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          userName,
          type,
          amount,
          date: new Date().toISOString(),
          status,
          referenceId,
        }),
      });
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  const approve = async (req: FundingRequest) => {
    try {
      setActingId(req.id);
      await runTransaction(db, async (tx) => {
        const reqRef = doc(db, "fundingRequests", req.id);
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists()) throw new Error("Request not found");
        const data = reqSnap.data() as any;
        if (data.status !== "pending") throw new Error("Request already processed");

        const userRef = doc(db, "users", data.userId);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");

        if (data.type === "deposit") {
          const currentBalance = userSnap.data().balance || 0;
          tx.update(userRef, { balance: currentBalance + data.amount });

          const txRef = doc(collection(db, "transactions"));
          tx.set(txRef, {
            userId: data.userId,
            type: "deposit",
            amount: data.amount,
            date: new Date().toISOString(),
            status: "completed",
            description: "Deposit approved",
          });

          tx.update(reqRef, {
            status: "approved",
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            txId: txRef.id,
          });
          return;
        }

        if (data.type === "withdrawal") {
          const currentBalance = userSnap.data().balance || 0;
          if (currentBalance < data.amount) {
            throw new Error("Insufficient funds");
          }
          if (data.txId) {
            tx.update(doc(db, "transactions", data.txId), {
              status: "completed",
            });
          }
          tx.update(reqRef, {
            status: "approved",
            approvedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      });
      
      // Send email
      await sendEmail(req.userId, req.type, req.amount, "approved", req.id);
      
      toast.success("Request approved");
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (e) {
      console.error("Approve failed:", e);
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (req: FundingRequest) => {
    try {
      setActingId(req.id);
      await runTransaction(db, async (tx) => {
        const reqRef = doc(db, "fundingRequests", req.id);
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists()) throw new Error("Request not found");
        const data = reqSnap.data() as any;
        if (data.status !== "pending") throw new Error("Request already processed");

        const userRef = doc(db, "users", data.userId);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error("User not found");

        if (data.type === "withdrawal") {
          const currentBalance = userSnap.data().balance || 0;
          tx.update(userRef, { balance: currentBalance + data.amount });
          if (data.txId) {
            tx.update(doc(db, "transactions", data.txId), { status: "failed" });
          }
        }

        tx.update(reqRef, {
          status: "rejected",
          rejectedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      
      // Send email
      await sendEmail(req.userId, req.type, req.amount, "rejected", req.id);

      toast.success("Request rejected");
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (e) {
      console.error("Reject failed:", e);
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActingId(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Funding Requests</h1>
          <p className="text-sm text-gray-500">Approve or reject pending deposits and withdrawals.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4" />
            <span>{pendingCount} pending</span>
          </div>
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No pending requests.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {requests.map((r) => (
              <div key={r.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        r.type === "deposit" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {r.type.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500 truncate">{r.userId}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-lg font-bold text-gray-900">${Number(r.amount || 0).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{r.method || "manual"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => approve(r)}
                    disabled={actingId === r.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => reject(r)}
                    disabled={actingId === r.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
