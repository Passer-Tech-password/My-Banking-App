"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  startAfter,
  writeBatch,
  increment,
  serverTimestamp,
  documentId,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Transaction } from "@/lib/Transaction";
import { useToast } from "@/components/ToastProvider";
import { parseUserRole } from "@/lib/roles";
import { 
  ArrowDownLeftIcon, 
  ArrowUpRightIcon, 
  BanknotesIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline";

export default function AdminTransactionsPage() {
  const router = useRouter();
  const toast = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [authChecking, setAuthChecking] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const ADMIN_OVERRIDE_ENABLED =
    (process.env.NEXT_PUBLIC_ADMIN_OVERRIDE || "").toLowerCase() === "true" &&
    process.env.NODE_ENV !== "production";

  useEffect(() => {
    if (ADMIN_OVERRIDE_ENABLED) {
      console.warn(
        "Admin override is active: skipping Firebase auth checks on transactions page. Do not enable this in production.",
      );
      setError(null);
      setAuthChecking(false);
      fetchTransactions();
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
        const role = profileSnap.exists()
          ? parseUserRole(((profileSnap.data() as unknown) as { role?: unknown })?.role)
          : null;
        if (!profileSnap.exists() || role !== "admin") {
          setAuthChecking(false);
          router.push("/admin/login");
          return;
        }
        setAuthChecking(false);
        fetchTransactions();
      } catch (error) {
        console.error("Error verifying admin user:", error);
        setAuthChecking(false);
        setError("Authentication failed");
        router.push("/admin/login");
      }
    });

    return () => unsub();
  }, [router]);

  const fetchTransactions = async () => {
    try {
      setError(null);
      setTxLoading(true);
      const q = query(
        collection(db, "transactions"), 
        orderBy("date", "desc"),
        limit(100)
      );
      const querySnapshot = await getDocs(q);
      const txs: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        txs.push({ id: doc.id, ...data } as Transaction);
      });
      setTransactions(txs);
      setSelectedIds([]);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setError("Failed to load transactions. Please try again later.");
    } finally {
      setTxLoading(false);
    }
  };

  const [exporting, setExporting] = useState(false);

  const exportToCSV = () => {
    if (transactions.length === 0) return;

    try {
      setExporting(true);
      const headers = ["Date", "Description", "Type", "Amount", "Status", "User ID", "Reference"];
      const sanitize = (str: any) => {
        if (!str && str !== 0) return '""';
        return `"${String(str).replace(/"/g, '""').replace(/^([=+\-@\t\r])/, "'$1")}"`;
      };

      const rows = transactions.map(tx => [
        sanitize(new Date(tx.date).toLocaleDateString()),
        sanitize(tx.description),
        sanitize(tx.type),
        tx.amount.toFixed(2),
        sanitize(tx.status),
        sanitize(tx.userId),
        sanitize(tx.id)
      ]);

      const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "admin_transactions.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const allVisibleSelected =
    transactions.length > 0 && selectedIds.length === transactions.length;

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(transactions.map((t) => t.id));
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const balanceDeltaFor = (tx: Transaction): number => {
    const status = String(tx.status || "").toLowerCase();
    const type = String(tx.type || "").toLowerCase();
    const direction = String(tx.direction || "").toLowerCase();
    const amount = Number(tx.amount || 0);

    if (!Number.isFinite(amount) || amount <= 0) return 0;

    if (status === "failed") return 0;

    if (type === "deposit" || type === "credit") return -amount;

    if (type === "withdrawal" || type === "debit") return amount;

    if (type === "transfer") {
      if (direction === "incoming") return -amount;
      return amount;
    }

    return 0;
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected transaction(s)? This cannot be undone.`)) return;

    try {
      setDeleting(true);
      const selected = transactions.filter((t) => selectedIds.includes(t.id));
      const deltasByUser = new Map<string, number>();
      selected.forEach((tx) => {
        const delta = balanceDeltaFor(tx);
        if (!delta) return;
        const uid = String(tx.userId || "").trim();
        if (!uid) return;
        deltasByUser.set(uid, (deltasByUser.get(uid) || 0) + delta);
      });

      const deltas = Array.from(deltasByUser.entries());
      for (let i = 0; i < deltas.length; i += 500) {
        const chunk = deltas.slice(i, i + 500);
        const batch = writeBatch(db);
        chunk.forEach(([uid, delta]) => {
          batch.update(doc(db, "users", uid), {
            balance: increment(delta),
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      const ids = [...selectedIds];
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const batch = writeBatch(db);
        chunk.forEach((id) => batch.delete(doc(db, "transactions", id)));
        await batch.commit();
      }
      setTransactions((prev) => prev.filter((t) => !selectedIds.includes(t.id)));
      setSelectedIds([]);
      toast.success("Selected transactions deleted");
    } catch (e) {
      console.error("Delete selected failed:", e);
      toast.error("Failed to delete selected transactions");
    } finally {
      setDeleting(false);
    }
  };

  const deleteAll = async () => {
    if (transactions.length === 0) return;
    if (!confirm("Delete ALL transaction logs? This cannot be undone.")) return;
    if (!confirm("This will also reset ALL user balances to $0. Continue?")) return;

    try {
      setDeleting(true);
      const col = collection(db, "transactions");
      let last: QueryDocumentSnapshot | null = null;
      while (true) {
        const q = last
          ? query(col, orderBy("date", "desc"), startAfter(last), limit(500))
          : query(col, orderBy("date", "desc"), limit(500));
        const snap = await getDocs(q);
        if (snap.empty) break;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        last = snap.docs[snap.docs.length - 1] || null;
        if (snap.size < 500) break;
      }

      const usersCol = collection(db, "users");
      let lastUser: QueryDocumentSnapshot | null = null;
      while (true) {
        const uq = lastUser
          ? query(usersCol, orderBy(documentId()), startAfter(lastUser), limit(500))
          : query(usersCol, orderBy(documentId()), limit(500));
        const usersSnap = await getDocs(uq);
        if (usersSnap.empty) break;
        const batch = writeBatch(db);
        usersSnap.docs.forEach((d) => {
          batch.update(d.ref, { balance: 0, updatedAt: serverTimestamp() });
        });
        await batch.commit();
        lastUser = usersSnap.docs[usersSnap.docs.length - 1] || null;
        if (usersSnap.size < 500) break;
      }

      setTransactions([]);
      setSelectedIds([]);
      toast.success("All transaction logs deleted and balances reset");
    } catch (e) {
      console.error("Delete all failed:", e);
      toast.error("Failed to delete all transaction logs");
    } finally {
      setDeleting(false);
    }
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
        <h1 className="text-2xl font-bold text-gray-900">Transaction Logs</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={deleteSelected}
            disabled={selectedIds.length === 0 || deleting}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Selected
          </button>
          <button
            onClick={deleteAll}
            disabled={transactions.length === 0 || deleting}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete All
          </button>
          <button 
            onClick={exportToCSV}
            disabled={transactions.length === 0 || exporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <span className="inline-block h-4 w-4 border-b-2 border-gray-600 rounded-full animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="w-4 h-4" />
            )}
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>
              {selectedIds.length > 0 ? `Selected ${selectedIds.length} · ` : ""}Showing last {transactions.length}
            </span>
            {txLoading && (
              <span className="inline-block h-3 w-3 border-b-2 border-blue-500 rounded-full animate-spin" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    disabled={transactions.length === 0}
                  />
                </th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">From / To</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(tx.id)}
                        onChange={() => toggleSelectOne(tx.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {tx.type === "deposit" || tx.type === "credit" ? (
                          <div className="p-1.5 bg-green-100 text-green-600 rounded-full">
                            <ArrowDownLeftIcon className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-red-100 text-red-600 rounded-full">
                            <ArrowUpRightIcon className="w-4 h-4" />
                          </div>
                        )}
                        <span className="capitalize font-medium">{tx.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-gray-900">
                      {tx.type === "deposit" || tx.type === "credit" ? "+" : "-"}${tx.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400">From: {tx.senderName || "System"}</span>
                        <span className="text-xs text-gray-400">To: {tx.receiverName || "System"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate">
                      {tx.description}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(tx.date).toLocaleDateString()} <span className="text-xs">{new Date(tx.date).toLocaleTimeString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.status === "completed" || tx.status === "success"
                          ? "bg-green-100 text-green-800" 
                          : tx.status === "pending" 
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
