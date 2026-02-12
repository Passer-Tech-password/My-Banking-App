"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { doc, collection, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UserData } from "@/components/UserTable";
import { Transaction } from "@/lib/Transaction";

interface FundUserModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: UserData) => void;
}

export default function FundUserModal({ user, isOpen, onClose, onSuccess }: FundUserModalProps) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const fundAmount = parseFloat(amount);
    
    if (isNaN(fundAmount) || fundAmount <= 0) {
      setFeedback({ type: "error", message: "Please enter a valid amount" });
      return;
    }

    setLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", user.id);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error("User does not exist!");
        }

        const currentBalance = userDoc.data().balance || 0;
        const newBalance = type === "credit" 
          ? currentBalance + fundAmount 
          : currentBalance - fundAmount;

        // Create transaction record
        const newTxRef = doc(collection(db, "transactions"));
        const txData = new Transaction.Builder()
          .setType(type)
          .setAmount(fundAmount)
          .setUserId(user.id)
          .setStatus("completed")
          .setDirection(type === "credit" ? "incoming" : "outgoing")
          .setDescription(`Admin ${type === "credit" ? "Deposit" : "Withdrawal"}`)
          .setSenderName(type === "credit" ? "Spring Admin" : user.firstName)
          .setReceiverName(type === "credit" ? user.firstName : "Spring Admin")
          .setDate(new Date().toISOString())
          .build();

        // Update user balance
        transaction.update(userRef, { balance: newBalance });
        
        // Save transaction
        transaction.set(newTxRef, txData.toFirestore());
      });

      const updatedUser = {
        ...user,
        balance: type === "credit" ? (user.balance || 0) + fundAmount : (user.balance || 0) - fundAmount
      };

      onSuccess(updatedUser);
      setAmount("");
      setFeedback({ type: "success", message: `Successfully ${type === "credit" ? "credited" : "debited"} $${fundAmount}` });
      
      timeoutRef.current = setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error("Transaction failed:", error);
      setFeedback({ type: "error", message: "Transaction failed. Check console for details." });
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Manage Balance</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {feedback && (
            <div 
              role="alert" 
              aria-live="polite"
              className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
              feedback.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            }`}>
              {feedback.type === "success" ? (
                <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
              ) : (
                <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
              )}
              {feedback.message}
            </div>
          )}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-blue-900">
              ${user.balance?.toLocaleString() || "0.00"}
            </p>
            <p className="text-xs text-blue-400 mt-1">User: {user.firstName} {user.lastName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType("credit")}
                className={`py-2 px-4 rounded-lg border font-medium transition-colors ${
                  type === "credit"
                    ? "bg-green-600 border-green-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Credit (Deposit)
              </button>
              <button
                type="button"
                onClick={() => setType("debit")}
                className={`py-2 px-4 rounded-lg border font-medium transition-colors ${
                  type === "debit"
                    ? "bg-red-600 border-red-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                Debit (Withdraw)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0.00"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg text-white font-medium shadow-sm transition-all ${
                type === "credit" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-red-600 hover:bg-red-700"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? "Processing..." : `Confirm ${type === "credit" ? "Deposit" : "Withdrawal"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
