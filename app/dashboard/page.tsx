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
  onSnapshot,
  runTransaction,
  serverTimestamp,
  limit,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Transaction } from "@/lib/Transaction";
import { Card } from "@/lib/Card";
import { useToast } from "@/components/ToastProvider";
import { 
  PlusIcon, 
  MinusIcon, 
  ArrowUpRightIcon, 
  UserCircleIcon 
} from "@heroicons/react/24/outline";

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [mainCard, setMainCard] = useState<Card | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [recentContacts, setRecentContacts] = useState<string[]>([]);

  // Auth check + load user data
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

    let isMounted = true;
    let txUnsub: null | (() => void) = null;
    
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 15000);

    const unsub = onAuthStateChanged(auth, async user => {
      if (!isMounted) return;
      
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        setUserId(user.uid);

        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(userRef, {
            balance: 0,
            createdAt: serverTimestamp(),
          });
        } else {
          setBalance(snap.data()?.balance ?? 0);
        }

        const userData = snap.exists() ? snap.data() : null;
        const computedName =
          (userData?.displayName as string | undefined) ||
          `${(userData?.firstName as string | undefined) || ""} ${(userData?.lastName as string | undefined) || ""}`.trim() ||
          (user.displayName ?? "") ||
          (user.email ?? "");
        const publicRef = doc(db, "publicUsers", user.uid);
        try {
          await setDoc(
            publicRef,
            {
              email: user.email ?? "",
              name: computedName,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch (e) {
          console.error("publicUsers sync failed:", e);
        }

        if (txUnsub) txUnsub();
        const txQuery = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid),
          orderBy("date", "desc"),
          limit(20),
        );

        txUnsub = onSnapshot(
          txQuery,
          (querySnap) => {
            const txs: Transaction[] = [];
            let inc = 0;
            let exp = 0;
            const contactsSet = new Set<string>();

            querySnap.forEach((docSnap) => {
              const data = docSnap.data();
              const tx = { id: docSnap.id, ...data } as Transaction;
              txs.push(tx);

              if (tx.type === "deposit" || (tx.type === "transfer" && tx.direction === "incoming")) {
                inc += tx.amount;
              } else if (
                tx.type === "withdrawal" ||
                (tx.type === "transfer" && tx.direction === "outgoing")
              ) {
                exp += tx.amount;
                if (tx.receiverName) contactsSet.add(tx.receiverName);
              }
            });

            if (isMounted) {
              setTransactions(txs);
              setIncome(inc);
              setExpense(exp);
              setRecentContacts(Array.from(contactsSet).slice(0, 5));
            }
          },
          (error) => {
            console.error("Dashboard transactions stream error:", error);
            toast.error("Failed to load live transactions");
          },
        );

        // Fetch Main Card
        const cardsQ = query(collection(db, `users/${user.uid}/cards`), limit(1));
        const cardsSnap = await getDocs(cardsQ);
        if (isMounted) {
          if (!cardsSnap.empty) {
            setMainCard({ id: cardsSnap.docs[0].id, ...cardsSnap.docs[0].data() } as Card);
          } else {
            setMainCard(null);
          }
        }
      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(safetyTimer);
      }
    });

    return () => {
      isMounted = false;
      if (txUnsub) txUnsub();
      clearTimeout(safetyTimer);
      unsub();
    };
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

      if (type === "deposit") {
        setIncome(prev => prev + amount);
      } else {
        setExpense(prev => prev + amount);
      }

    } catch (e) {
      console.error("Transaction failed:", e);
      toast.error("Transaction failed: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  const handleQuickTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !recipientEmail || !transferAmount) return;

    try {
      setTransferLoading(true);
      const amount = parseFloat(transferAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      if (amount > balance) throw new Error("Insufficient funds");

      // Find recipient
      const usersQ = query(collection(db, "publicUsers"), where("email", "==", recipientEmail), limit(1));
      const usersSnap = await getDocs(usersQ);
      
      if (usersSnap.empty) {
        toast.error("User not found");
        return;
      }

      const recipientDoc = usersSnap.docs[0];
      const recipientId = recipientDoc.id;

      if (recipientId === userId) {
        toast.error("Cannot transfer to yourself");
        return;
      }

      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, "users", userId);
        const receiverRef = doc(db, "users", recipientId);
        
        const senderDoc = await transaction.get(senderRef);
        const receiverDoc = await transaction.get(receiverRef);

        if (!senderDoc.exists() || !receiverDoc.exists()) throw new Error("User error");

        const senderBalance = senderDoc.data().balance || 0;
        const receiverBalance = receiverDoc.data().balance || 0;

        if (senderBalance < amount) throw new Error("Insufficient funds");

        transaction.update(senderRef, { balance: senderBalance - amount });
        transaction.update(receiverRef, { balance: receiverBalance + amount });

        // Create sender transaction
        const senderTxRef = doc(collection(db, "transactions"));
        transaction.set(senderTxRef, {
          userId: userId,
          type: "transfer",
          direction: "outgoing",
          amount: amount,
          date: new Date().toISOString(),
          status: "completed",
          description: `Transfer to ${recipientEmail}`,
          receiverName: recipientEmail, // using email as name for simplicity
        });

        // Create receiver transaction
        const receiverTxRef = doc(collection(db, "transactions"));
        transaction.set(receiverTxRef, {
          userId: recipientId,
          type: "transfer",
          direction: "incoming",
          amount: amount,
          date: new Date().toISOString(),
          status: "completed",
          description: `Transfer from ${auth.currentUser?.email}`,
          senderName: auth.currentUser?.email,
        });
      });

      // Update local state
      setBalance(prev => prev - amount);
      setExpense(prev => prev + amount);
      // Add to transactions list
      setTransactions(prev => [{
          id: "temp-" + Date.now(),
          userId,
          type: "transfer",
          direction: "outgoing",
          amount,
          date: new Date().toISOString(),
          status: "completed",
          description: `Transfer to ${recipientEmail}`,
      } as Transaction, ...prev]);

      setRecipientEmail("");
      setTransferAmount("");
      toast.success("Transfer successful!");

    } catch (error) {
      console.error("Transfer error:", error);
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  const deposit = async () => {
    const amount = 1000;
    await saveTransaction("deposit", amount);
  };

  const withdraw = async () => {
    const amount = 500;
    if (balance < amount) {
      toast.error("Insufficient funds");
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
          <p className="text-sm text-gray-500">{greeting || "Welcome back"}, User</p>
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
                ${(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
              
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-blue-200 text-xs mb-1">Income</p>
                  <p className="font-semibold text-lg flex items-center gap-1">
                    <ArrowUpRightIcon className="w-4 h-4 text-green-300" />
                    ${income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs mb-1">Expenses</p>
                  <p className="font-semibold text-lg flex items-center gap-1">
                    <ArrowUpRightIcon className="w-4 h-4 text-red-300 rotate-90" />
                    ${expense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-blue-500/30">
                <div className="flex justify-between items-center text-xs text-blue-200 mb-2">
                  <span>Monthly Budget</span>
                  <span>{Math.round((expense / (income || 1)) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-blue-900/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-300 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min((expense / (income || 1)) * 100, 100)}%` }}
                  />
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
            
            <button 
              onClick={() => document.getElementById('transfer-widget')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
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
              <Link href="/dashboard/transactions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</Link>
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
            
            {mainCard ? (
              <>
                <div className={`rounded-2xl p-6 text-white shadow-xl mb-4 relative overflow-hidden ${
                  mainCard.network === 'VISA' ? 'bg-blue-900' : mainCard.network === 'MasterCard' ? 'bg-slate-800' : 'bg-indigo-900'
                }`}>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                   <div className="flex justify-between items-start mb-8 relative z-10">
                     <span className="font-bold text-lg tracking-widest uppercase">{mainCard.network}</span>
                     <div className="w-8 h-5 bg-yellow-400/80 rounded-sm"></div>
                   </div>
                   <div className="mb-4 relative z-10">
                     <p className="text-xs opacity-70 mb-1">Card Number</p>
                     <p className="font-mono text-lg tracking-wider">{mainCard.number}</p>
                   </div>
                   <div className="flex justify-between items-end relative z-10">
                     <div>
                       <p className="text-xs opacity-70 mb-1">Card Holder</p>
                       <p className="font-medium text-sm uppercase">{mainCard.holder}</p>
                     </div>
                     <div>
                       <p className="text-xs opacity-70 mb-1">Expires</p>
                       <p className="font-medium text-sm">{mainCard.expires}</p>
                     </div>
                   </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Card Status</span>
                    <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Active</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500 mb-4">No cards added</p>
                <Link href="/dashboard/cards" className="text-blue-600 font-medium">Add Card</Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Activity Feed</h3>
              <Link href="/dashboard/transactions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All
              </Link>
            </div>

            {transactions.length === 0 ? (
              <div className="text-sm text-gray-500">No activity yet.</div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 6).map((tx, idx) => {
                  const isIncome =
                    tx.type === "deposit" ||
                    tx.type === "credit" ||
                    (tx.type === "transfer" && tx.direction === "incoming");
                  return (
                    <div key={tx.id || idx} className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isIncome ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isIncome ? <PlusIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {tx.description || tx.type}
                          </p>
                          <p className={`text-sm font-semibold ${isIncome ? "text-green-700" : "text-gray-900"}`}>
                            {isIncome ? "+" : "-"}${Math.abs(tx.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {tx.date ? new Date(tx.date).toLocaleString() : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Transfer Widget */}
           <div id="transfer-widget" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
             <h3 className="font-semibold text-gray-900 mb-4">Quick Transfer</h3>
             
             {/* Recent Contacts */}
             {recentContacts.length > 0 && (
               <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Recent</p>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {recentContacts.map((email) => (
                       <button 
                         key={email} 
                         onClick={() => setRecipientEmail(email)}
                         type="button"
                         className="flex flex-col items-center gap-1 min-w-[50px] group"
                       >
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-110 ${recipientEmail === email ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                           {email.charAt(0).toUpperCase()}
                         </div>
                         <span className="text-[10px] text-gray-600 truncate w-12 text-center">{email.split('@')[0]}</span>
                       </button>
                    ))}
                  </div>
               </div>
             )}

             <form onSubmit={handleQuickTransfer} className="space-y-4">
               <div>
                 <label className="text-xs font-medium text-gray-700 mb-1 block">Recipient Email</label>
                 <input
                   type="email"
                   required
                   placeholder="friend@example.com"
                   value={recipientEmail}
                   onChange={(e) => setRecipientEmail(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                 />
               </div>
               
               <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                 <input 
                   type="number" 
                   required
                   min="1"
                   step="0.01"
                   placeholder="0.00"
                   value={transferAmount}
                   onChange={(e) => setTransferAmount(e.target.value)}
                   className="w-full pl-7 pr-4 py-3 bg-gray-50 border-none rounded-xl text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                 />
               </div>

               <button 
                 type="submit"
                 disabled={transferLoading || !recipientEmail || !transferAmount}
                 className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {transferLoading ? "Sending..." : "Send Money"}
               </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
}
