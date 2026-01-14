"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { auth , db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

type Transaction = {
  id?: string;
  type: "Deposit" | "Withdrawal";
  amount: number;
  date: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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
        txs.push(doc.data() as Transaction);
      });

      setTransactions(txs.reverse());
    });

    return () => unsub();
  }, [router]);

  const saveTransaction = async (
    type: "Deposit" | "Withdrawal",
    amount: number
  ) => {
    if (!userId) return;

    await addDoc(collection(db, "transactions"), {
      userId,
      type,
      amount,
      date: new Date().toLocaleString(),
    });

    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { balance }, { merge: true });
  };

  const deposit = async () => {
    const amount = 1000;
    const newBalance = balance + amount;
    setBalance(newBalance);

    await saveTransaction("Deposit", amount);
  };

  const withdraw = async () => {
    const amount = 500;
    if (balance < amount) {
      alert("Insufficient balance");
      return;
    }

    const newBalance = balance - amount;
    setBalance(newBalance);

    await saveTransaction("Withdrawal", amount);
  };

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-gray-100 p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <div className="bg-white p-6 rounded shadow mb-6 text-center">
          <p className="text-gray-500">Account Balance</p>
          <h2 className="text-3xl font-bold text-green-600 mb-4">
            ₦{balance.toLocaleString()}
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={deposit}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Deposit ₦1,000
            </button>

            <button
              onClick={withdraw}
              className="bg-red-600 text-white px-4 py-2 rounded"
            >
              Withdraw ₦500
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Transaction History</h2>

          {transactions.length === 0 ? (
            <p className="text-gray-500 text-sm">No transactions yet</p>
          ) : (
            <ul className="space-y-3">
              {transactions.map((tx, i) => (
                <li
                  key={i}
                  className="flex justify-between border-b pb-2 text-sm"
                >
                  <div>
                    <p
                      className={
                        tx.type === "Deposit"
                          ? "text-green-600 font-medium"
                          : "text-red-600 font-medium"
                      }
                    >
                      {tx.type}
                    </p>
                    <p className="text-gray-400 text-xs">{tx.date}</p>
                  </div>
                  <p className="font-bold">₦{tx.amount.toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
