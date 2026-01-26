"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type UserData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
  balance?: number;
  accountType?: string;
  blocked?: boolean;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/admin/login");
        return;
      }
      
      // Ideally verify admin role here again
      // const userDoc = await getDoc(doc(db, "users", user.uid));
      // if (userDoc.data()?.role !== 'admin') ...

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

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  const toggleBlockUser = async (userId: string, currentStatus?: boolean) => {
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            blocked: !currentStatus
        });
        // Update local state
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

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white hidden md:block">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-400">Admin Panel</h1>
        </div>
        <nav className="mt-6">
          <a href="#" className="block py-3 px-6 bg-gray-800 border-l-4 border-blue-500 text-white">
            Dashboard
          </a>
          <a href="#" className="block py-3 px-6 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            Transactions
          </a>
          <a href="#" className="block py-3 px-6 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
            Settings
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-gray-800">User Management</h2>
          <div className="flex items-center gap-4">
             <span className="text-sm text-gray-600">Admin User</span>
             <button 
                onClick={handleLogout}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
             >
                Logout
             </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 flex-1 overflow-y-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Total Users</h3>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{users.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Active Accounts</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                        {users.filter(u => !u.blocked).length}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-gray-500 text-sm font-medium">Blocked Accounts</h3>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                        {users.filter(u => u.blocked).length}
                    </p>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between gap-4 items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Registered Users</h3>
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider">
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Email</th>
                                <th className="px-6 py-3 font-medium">Account Type</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {user.accountType || "Savings"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.blocked ? (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Blocked</span>
                                            ) : (
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => toggleBlockUser(user.id, user.blocked)}
                                                className={`mr-3 ${user.blocked ? 'text-green-600 hover:text-green-900' : 'text-orange-600 hover:text-orange-900'}`}
                                            >
                                                {user.blocked ? 'Unblock' : 'Block'}
                                            </button>
                                            <button 
                                                onClick={() => deleteUser(user.id)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </main>
      </div>
    </div>
  );
}
