"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, doc, updateDoc, deleteDoc, runTransaction } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import UserTable, { UserData } from "@/components/UserTable";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Transaction } from "@/lib/Transaction";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Fund Modal State
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [fundAmount, setFundAmount] = useState("");
  const [fundType, setFundType] = useState<"credit" | "debit">("credit");
  const [fundLoading, setFundLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/admin/login");
        return;
      }
      fetchUsers();
    });

    return () => unsub();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: UserData[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() } as UserData);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleBlockUser = async (userId: string, currentStatus?: boolean) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            blocked: !currentStatus
        });
        setUsers(users.map(u => u.id === userId ? { ...u, blocked: !currentStatus } : u));
    } catch (error) {
        console.error("Error updating user:", error);
        alert("Failed to update user status");
    }
  };

  const deleteUser = async (userId: string) => {
      if(!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
      
      try {
          await deleteDoc(doc(db, "users", userId));
          setUsers(users.filter(u => u.id !== userId));
      } catch (error) {
          console.error("Error deleting user:", error);
          alert("Failed to delete user");
      }
  }

  const openFundModal = (user: UserData) => {
    setSelectedUser(user);
    setFundAmount("");
    setFundType("credit");
    setFundModalOpen(true);
  };

  const handleFundUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !fundAmount) return;

    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setFundLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", selectedUser.id);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error("User does not exist!");
        }

        const currentBalance = userDoc.data().balance || 0;
        const newBalance = fundType === "credit" 
          ? currentBalance + amount 
          : currentBalance - amount;

        // Create transaction record
        const newTxRef = doc(collection(db, "transactions"));
        
        // Save transaction
        transaction.set(newTxRef, {
            type: fundType,
            amount: amount,
            userId: selectedUser.id,
            status: "completed",
            direction: fundType === "credit" ? "incoming" : "outgoing",
            description: `Admin ${fundType === "credit" ? "Deposit" : "Withdrawal"}`,
            senderName: fundType === "credit" ? "Spring Admin" : selectedUser.firstName,
            receiverName: fundType === "credit" ? selectedUser.firstName : "Spring Admin",
            date: new Date().toISOString()
        });

        // Update user balance
        transaction.update(userRef, { balance: newBalance });
      });

      // Update local state
      setUsers(users.map(u => {
        if (u.id === selectedUser.id) {
            const currentBalance = u.balance || 0;
            return {
                ...u,
                balance: fundType === "credit" ? currentBalance + amount : currentBalance - amount
            };
        }
        return u;
      }));

      setFundModalOpen(false);
      alert(`Successfully ${fundType === "credit" ? "credited" : "debited"} $${amount}`);
    } catch (error) {
      console.error("Transaction failed:", error);
      alert("Transaction failed. Check console for details.");
    } finally {
      setFundLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
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
      {/* User Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">All Users</h2>
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64"
            />
          </div>
        </div>
        
        <UserTable 
          users={filteredUsers} 
          onToggleBlock={toggleBlockUser}
          onDelete={deleteUser}
          onFund={openFundModal}
        />
      </div>

      {/* Fund Modal */}
      {fundModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Manage Balance</h3>
              <button onClick={() => setFundModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFundUser} className="p-6 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">Current Balance</p>
                <p className="text-2xl font-bold text-blue-900">
                  ${selectedUser.balance?.toLocaleString() || "0.00"}
                </p>
                <p className="text-xs text-blue-400 mt-1">User: {selectedUser.firstName} {selectedUser.lastName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFundType("credit")}
                    className={`py-2 px-4 rounded-lg border font-medium transition-colors ${
                      fundType === "credit"
                        ? "bg-green-600 border-green-600 text-white"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    Credit (Deposit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundType("debit")}
                    className={`py-2 px-4 rounded-lg border font-medium transition-colors ${
                      fundType === "debit"
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
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="0.00"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={fundLoading}
                  className={`w-full py-3 rounded-lg text-white font-medium shadow-sm transition-all ${
                    fundType === "credit" 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-red-600 hover:bg-red-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {fundLoading ? "Processing..." : `Confirm ${fundType === "credit" ? "Deposit" : "Withdrawal"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
