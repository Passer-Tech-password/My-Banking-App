"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Transaction } from "@/lib/Transaction";
import { ArrowUpRightIcon, ArrowDownLeftIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<"all" | "deposit" | "withdrawal">("all");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      fetchTransactions(user.uid, true);
    });
    return () => unsub();
  }, [router, filter]);

  const fetchTransactions = async (userId: string, isInitial: boolean) => {
    try {
      setLoading(true);
      let q = query(
        collection(db, "transactions"),
        where("userId", "==", userId),
        orderBy("date", "desc"),
        limit(10)
      );

      if (filter !== "all") {
        q = query(q, where("type", "==", filter));
      }

      if (!isInitial && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      
      const newTransactions: Transaction[] = [];
      snapshot.forEach((doc) => {
        newTransactions.push({ id: doc.id, ...doc.data() } as Transaction);
      });

      if (isInitial) {
        setTransactions(newTransactions);
      } else {
        setTransactions((prev) => [...prev, ...newTransactions]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 10);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const user = auth.currentUser;
    if (user) {
      fetchTransactions(user.uid, false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">View and filter your transaction history.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === "all" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("deposit")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === "deposit" ? "bg-green-50 text-green-700" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Deposits
          </button>
          <button
            onClick={() => setFilter("withdrawal")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === "withdrawal" ? "bg-red-50 text-red-700" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Withdrawals
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No transactions found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'deposit' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {tx.type === 'deposit' ? (
                      <ArrowDownLeftIcon className="w-5 h-5" />
                    ) : (
                      <ArrowUpRightIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{tx.description || "Transaction"}</p>
                    <p className="text-sm text-gray-500">{new Date(tx.date).toLocaleDateString()} • {new Date(tx.date).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className={`font-semibold ${
                  tx.type === 'deposit' ? 'text-green-600' : 'text-gray-900'
                }`}>
                  {tx.type === 'deposit' ? '+' : '-'}${Math.abs(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {hasMore && !loading && transactions.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
            <button
              onClick={loadMore}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
