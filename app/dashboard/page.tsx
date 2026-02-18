"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Transaction } from "@/lib/Transaction";
import { 
  PlusIcon, 
  MinusIcon, 
  ArrowUpRightIcon, 
  UserCircleIcon 
} from "@heroicons/react/24/outline";

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth check + load user data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          balance: 0,
          createdAt: serverTimestamp(),
        });
      } else {
        setBalance(snap.data().balance);
      }

      const q = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid)
      );

      const querySnap = await getDocs(q);
      const txs: Transaction[] = [];

      querySnap.forEach(doc => {
        const data = doc.data();
        txs.push({ id: doc.id, ...data } as Transaction);
      });

      setTransactions(txs.reverse());
      setLoading(false);
    });

    return () => unsub();
  }, [router]);

  const saveTransaction = async (
    type: "deposit" | "withdrawal",
    amount: number
  ) => {
    if (!userId) return;

    try {
      const newTx = Transaction.builder()
        .setUserId(userId)
        .setType(type)
        .setAmount(amount)
        .setDate(new Date().toISOString())
        .setStatus("completed")
        .setDescription(`${type.charAt(0).toUpperCase() + type.slice(1)} via Dashboard`)
        .build();

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error("User does not exist!");
        }

        const currentBalance = userDoc.data().balance || 0;
        let newBalance = currentBalance;
        
        if (type === "deposit") {
          newBalance += amount;
        } else {
          if (currentBalance < amount) {
             throw new Error("Insufficient funds for atomic transaction");
          }
          newBalance -= amount;
        }

        // Add transaction
        const newTxRef = doc(collection(db, "transactions"));
        transaction.set(newTxRef, newTx.toFirestore());

        // Update user balance
        transaction.update(userRef, { balance: newBalance });
      });

      // Update local state
      setBalance(prev => {
        if (type === "deposit") return prev + amount;
        return prev - amount;
      });
      setTransactions(prev => [newTx, ...prev]);

    } catch (e) {
      console.error("Transaction failed:", e);
      alert("Transaction failed: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  const deposit = async () => {
    const amount = 1000;
    await saveTransaction("deposit", amount);
  };

  const withdraw = async () => {
    const amount = 500;
    if (balance < amount) {
      alert("Insufficient funds");
      return;
    }
    await saveTransaction("withdrawal", amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back, User</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Download Statement
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            New Transfer
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Balance & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Balance Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative z-10">
              <p className="text-blue-100 text-sm font-medium mb-1">Total Balance</p>
              <h2 className="text-4xl font-bold mb-6">
                ${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
              
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-blue-200 text-xs mb-1">Income</p>
                  <p className="font-semibold text-lg flex items-center gap-1">
                    <ArrowUpRightIcon className="w-4 h-4 text-green-300" />
                    $2,450.00
                  </p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs mb-1">Expenses</p>
                  <p className="font-semibold text-lg flex items-center gap-1">
                    <ArrowUpRightIcon className="w-4 h-4 text-red-300 rotate-90" />
                    $1,200.50
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button 
              onClick={deposit}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
                <PlusIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">Deposit</span>
            </button>
            
            <button 
              onClick={withdraw}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                <MinusIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">Withdraw</span>
            </button>
            
            {/* Placeholders for visual completeness */}
            <button className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                <ArrowUpRightIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">Transfer</span>
            </button>
             <button className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group opacity-60 cursor-not-allowed">
              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                <span className="font-bold text-lg">...</span>
              </div>
              <span className="text-sm font-medium text-gray-700">More</span>
            </button>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                  <tr>
                    <th className="px-6 py-4">Transaction</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            ["deposit", "credit"].includes(tx.type) ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                          }`}>
                            {["deposit", "credit"].includes(tx.type) ? <PlusIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
                          </div>
                          {tx.description || tx.type}
                        </td>
                        <td className="px-6 py-4">{tx.date}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tx.status === "completed" ? "bg-green-100 text-green-800" : 
                            tx.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                          }`}>
                            {tx.status || "Completed"}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-semibold ${
                          ["deposit", "credit"].includes(tx.type) ? "text-green-600" : "text-gray-900"
                        }`}>
                          {["deposit", "credit"].includes(tx.type) ? "+" : "-"}${tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Cards & Promos */}
        <div className="space-y-6">
          {/* My Cards Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">My Cards</h3>
              <Link
                href="/dashboard/cards"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Manage Cards
              </Link>
            </div>
            
            {/* Card Visual */}
            <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl mb-4 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
               <div className="flex justify-between items-start mb-8 relative z-10">
                 <span className="font-bold text-lg tracking-widest">VISA</span>
                 <div className="flex gap-1">
                   <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                   <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                 </div>
               </div>
               <div className="mb-4 relative z-10">
                 <p className="text-xs text-slate-400 mb-1">Card Number</p>
                 <p className="font-mono text-lg tracking-wider">**** **** **** 4589</p>
               </div>
               <div className="flex justify-between items-end relative z-10">
                 <div>
                   <p className="text-xs text-slate-400 mb-1">Card Holder</p>
                   <p className="font-medium text-sm">JOHN DOE</p>
                 </div>
                 <div>
                   <p className="text-xs text-slate-400 mb-1">Expires</p>
                   <p className="font-medium text-sm">12/26</p>
                 </div>
               </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Card Status</span>
                <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                 <span className="text-gray-600">Daily Limit</span>
                 <span className="font-medium">$2,000.00</span>
              </div>
            </div>
          </div>

          {/* Quick Transfer Widget (Placeholder) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
             <h3 className="font-semibold text-gray-900 mb-4">Quick Transfer</h3>
             <div className="space-y-4">
               <div className="flex items-center gap-3 overflow-x-auto pb-2">
                 {[1,2,3].map((i) => (
                   <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
                     <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                       <UserCircleIcon className="w-6 h-6" />
                     </div>
                     <span className="text-xs text-gray-600">User {i}</span>
                   </div>
                 ))}
                 <button className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors">
                       <PlusIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs text-gray-600">Add</span>
                 </button>
               </div>
               
               <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                 <input 
                   type="number" 
                   placeholder="0.00" 
                   className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                 />
               </div>
               <button className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                 Send Money
               </button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
