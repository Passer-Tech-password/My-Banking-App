"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import UserTable, { UserData } from "@/components/UserTable";
import FundUserModal from "@/components/FundUserModal";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fund Modal State
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/admin/login");
        return;
      }
      try {
        setError(null);
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        if (!profileSnap.exists() || profileSnap.data()?.role !== "admin") {
          router.push("/admin/login");
          return;
        }
        fetchUsers();
      } catch (error) {
        console.error("Error verifying admin user:", error);
        setLoading(false);
        setError("Authentication failed");
        router.push("/admin/login");
      }
    });

    return () => unsub();
  }, [router]);

  const fetchUsers = async () => {
    try {
      setError(null);
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const fetchedUsers: UserData[] = [];
      querySnapshot.forEach((doc) => {
        fetchedUsers.push({ id: doc.id, ...doc.data() } as UserData);
      });
      setUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users. Please try again later.");
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

  if (loading) {
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
      <FundUserModal
        user={selectedUser}
        isOpen={fundModalOpen}
        onClose={() => setFundModalOpen(false)}
        onSuccess={handleFundSuccess}
      />
    </div>
  );
}
