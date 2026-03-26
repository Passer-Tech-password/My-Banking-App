"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, doc, updateDoc, deleteDoc, getDoc, onSnapshot, orderBy, limit, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import UserTable, { UserData } from "@/components/UserTable";
import FundUserModal from "@/components/FundUserModal";
import { useToast } from "@/components/ToastProvider";
import { Transaction } from "@/lib/Transaction";
import { isAdminUserData } from "@/lib/roles";
import { 
  UserGroupIcon, 
  MagnifyingGlassIcon, 
  NoSymbolIcon, 
  CheckCircleIcon,
  BanknotesIcon
} from "@heroicons/react/24/outline";

export default function AdminDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [pendingCardRequests, setPendingCardRequests] = useState<
    Array<{
      id: string;
      userId: string;
      email: string;
      status: "pending" | "approved" | "rejected";
      createdAt?: any;
      updatedAt?: any;
    }>
  >([]);
  const [cardRequestsLoading, setCardRequestsLoading] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("");
  
  // Fund Modal State
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

    let txUnsub: null | (() => void) = null;
    let cardReqUnsub: null | (() => void) = null;
    let authUnsub: null | (() => void) = null;
    const startTxStream = () => {
      if (txUnsub) txUnsub();
      const txQ = query(collection(db, "transactions"), orderBy("date", "desc"), limit(10));
      txUnsub = onSnapshot(
        txQ,
        (snap) => {
          const txs: Transaction[] = [];
          snap.forEach((d) => txs.push({ id: d.id, ...d.data() } as Transaction));
          setRecentTransactions(txs);
        },
        (err) => {
          console.error("Admin activity stream error:", err);
          toast.error("Failed to load live activity");
        },
      );
    };

    const startCardRequestsStream = () => {
      if (cardReqUnsub) cardReqUnsub();
      setCardRequestsLoading(true);
      const q = query(
        collection(db, "cardRequests"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(50),
      );
      cardReqUnsub = onSnapshot(
        q,
        (snap) => {
          const rows: Array<{
            id: string;
            userId: string;
            email: string;
            status: "pending" | "approved" | "rejected";
            createdAt?: any;
            updatedAt?: any;
          }> = [];
          snap.forEach((d) => {
            const data = d.data() as any;
            const status =
              data?.status === "approved" || data?.status === "rejected"
                ? data.status
                : "pending";
            rows.push({
              id: d.id,
              userId: String(data?.userId || ""),
              email: String(data?.email || ""),
              status,
              createdAt: data?.createdAt,
              updatedAt: data?.updatedAt,
            });
          });
          setPendingCardRequests(rows);
          setCardRequestsLoading(false);
        },
        (err) => {
          console.error("Admin cardRequests stream error:", err);
          setCardRequestsLoading(false);
          toast.error("Failed to load card requests");
        },
      );
    };

    authUnsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthChecking(false);
        router.push("/admin/login");
        return;
      }
      try {
        setError(null);
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        const data = profileSnap.exists() ? (profileSnap.data() as unknown) : null;
        if (!profileSnap.exists() || !isAdminUserData(data)) {
          setAuthChecking(false);
          router.push("/admin/login");
          return;
        }
        setAuthChecking(false);
        fetchUsers();
        startTxStream();
        startCardRequestsStream();
      } catch (error) {
        console.error("Error verifying admin user:", error);
        authUnsub?.();
        setAuthChecking(false);
        setError("Authentication failed");
        router.push("/admin/login");
      }
    });

    return () => {
      authUnsub?.();
      txUnsub?.();
      cardReqUnsub?.();
    };
  }, [router]);

  const fetchUsers = async () => {
    try {
      setError(null);
      setUsersLoading(true);
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: UserData[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() } as UserData);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      const code = (error as any)?.code;
      console.error("Error fetching users:", { code, error });
      if (code === "permission-denied") {
        setError("Failed to load users (permission-denied). Check Firestore rules and admin role.");
      } else if (code) {
        setError(`Failed to load users (${code}). Please try again later.`);
      } else {
        setError("Failed to load users. Please try again later.");
      }
    } finally {
      setUsersLoading(false);
    }
  };

  const toggleBlockUser = async (userId: string, currentStatus?: boolean) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            blocked: !currentStatus
        });
        setUsers(users.map(u => u.id === userId ? { ...u, blocked: !currentStatus } : u));
        toast.success(!currentStatus ? "User blocked" : "User unblocked");
    } catch (error) {
        console.error("Error updating user:", error);
        toast.error("Failed to update user status");
    }
  };

  const deleteUser = async (userId: string) => {
      if(!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
      
      try {
          await deleteDoc(doc(db, "users", userId));
          setUsers(users.filter(u => u.id !== userId));
          toast.success("User deleted");
      } catch (error) {
          console.error("Error deleting user:", error);
          toast.error("Failed to delete user");
      }
  }

  const updateCardRequestStatus = async (requestId: string, action: "approve" | "reject") => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Not signed in");
      return;
    }
    try {
      const idToken = await user.getIdToken(true);
      const res = await fetch("/api/admin/card-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.status === 401) {
        toast.error("Session expired. Please login again.");
        await signOut(auth);
        router.push("/admin/login");
        return;
      }
      const raw = await res.text();
      const data = (() => {
        try {
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })() as any;
      if (!res.ok) {
        const msg = String(data?.message || raw || `Request failed (${res.status}).`);
        toast.error(msg);
        return;
      }
      toast.success(action === "approve" ? "Request approved" : "Request rejected");
    } catch (e) {
      console.error("Update card request failed:", e);
      toast.error("Failed to update card request");
    }
  };

  const openFundModal = (user: UserData) => {
    setSelectedUser(user);
    setFundModalOpen(true);
  };

  const handleFundSuccess = (updatedUser: UserData) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => !u.blocked).length,
    blocked: users.filter(u => u.blocked).length,
    balance: users.reduce((acc, u) => acc + (u.balance || 0), 0)
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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <UserGroupIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <BanknotesIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500">System Balance</p>
            <p className="text-2xl font-bold text-gray-900">${stats.balance.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <CheckCircleIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Active Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <NoSymbolIcon className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Blocked Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.blocked}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Virtual Card Requests</h2>
            <p className="text-sm text-gray-500">Pending approvals</p>
          </div>
          {cardRequestsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-block h-4 w-4 border-b-2 border-blue-500 rounded-full animate-spin" />
              <span>Loading...</span>
            </div>
          )}
        </div>
        {pendingCardRequests.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No pending card requests.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pendingCardRequests.map((r) => (
              <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{r.email || "Unknown email"}</div>
                  <div className="text-xs text-gray-500 truncate">userId: {r.userId} • requestId: {r.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateCardRequestStatus(r.id, "approve")}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateCardRequestStatus(r.id, "reject")}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
          <p className="text-sm text-gray-500">Live</p>
        </div>
        {recentTransactions.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No activity yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentTransactions.slice(0, 10).map((tx, idx) => {
              const isIncome =
                tx.type === "deposit" ||
                tx.type === "credit" ||
                (tx.type === "transfer" && tx.direction === "incoming");
              return (
                <div key={tx.id || idx} className="p-5 flex items-start justify-between gap-6">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isIncome ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      <BanknotesIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {tx.description || tx.type}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {tx.userId} • {tx.date ? new Date(tx.date).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                  <div className={`text-sm font-semibold ${isIncome ? "text-green-700" : "text-gray-900"}`}>
                    {isIncome ? "+" : "-"}${Math.abs(tx.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* User Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">User Management</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
            {usersLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="inline-block h-4 w-4 border-b-2 border-blue-500 rounded-full animate-spin" />
                <span>Loading users...</span>
              </div>
            )}
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
      <FundUserModal
        user={selectedUser}
        isOpen={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        onSuccess={handleFundSuccess}
      />
    </div>
  );
}
