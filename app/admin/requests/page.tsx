"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

type FundingRequestStatus = "pending" | "approved" | "rejected";

type FundingRequest = {
  id: string;
  userId: string;
  type: "deposit" | "withdrawal";
  amount: number;
  status: FundingRequestStatus;
  method?: string;
  narration?: string;
  bankName?: string;
  note?: string;
};

const sampleRequests: FundingRequest[] = [];

export default function AdminRequestsPage() {
  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);
  const [requests, setRequests] = useState<FundingRequest[]>(sampleRequests);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/session", { credentials: "include" });
        if (!cancelled) setSessionOk(res.ok);
      } catch (_) {
        if (!cancelled) setSessionOk(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );
  const approvedCount = useMemo(
    () => requests.filter((r) => r.status === "approved").length,
    [requests],
  );
  const rejectedCount = useMemo(
    () => requests.filter((r) => r.status === "rejected").length,
    [requests],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-yellow-50 text-yellow-600 rounded-lg">
            <ClockIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className="text-xl font-bold text-gray-900">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-green-50 text-green-600 rounded-lg">
            <CheckCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Approved</p>
            <p className="text-xl font-bold text-gray-900">{approvedCount}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg">
            <XCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Rejected</p>
            <p className="text-xl font-bold text-gray-900">{rejectedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Funding Requests</h3>
          <p className="text-sm text-gray-500">
            {sessionOk
              ? "Admin session verified. Approve/reject via server-side API routes."
              : "Session verification pending."}
          </p>
        </div>
        <div className="p-10 text-center text-gray-500 text-sm">
          <p>
            Funding request approvals/rejections would be handled via
            server-side API routes using the Firebase Admin SDK, authenticated
            by the admin session cookie.
          </p>
          <p className="mt-2">
            Route:{" "}
            <code className="px-2 py-0.5 bg-gray-100 rounded">/admin/requests</code>
          </p>
        </div>
      </div>
    </div>
  );
}
