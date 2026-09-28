"use client";

import { useEffect, useState } from "react";
import {
  BanknotesIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
} from "@heroicons/react/24/outline";

export default function AdminTransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [sessionOk, setSessionOk] = useState(false);

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
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <BanknotesIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Transactions</p>
            <p className="text-xl font-bold text-gray-900">—</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-green-50 text-green-600 rounded-lg">
            <ArrowDownLeftIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Credits</p>
            <p className="text-xl font-bold text-gray-900">—</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="p-2 bg-red-50 text-red-600 rounded-lg">
            <ArrowUpRightIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Debits</p>
            <p className="text-xl font-bold text-gray-900">—</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Transactions</h3>
          <p className="text-sm text-gray-500">
            {sessionOk
              ? "Admin session verified. List data via server-side API route."
              : "Session verification pending."}
          </p>
        </div>
        <div className="p-10 text-center text-gray-500 text-sm">
          <p>
            Transaction listing would render here via a server-side API route
            using the Firebase Admin SDK.
          </p>
          <p className="mt-2">
            Route:{" "}
            <code className="px-2 py-0.5 bg-gray-100 rounded">
              /admin/transactions
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
