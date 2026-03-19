"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";
import { auth, db } from "@/lib/firebase";
import { isAdminUserData } from "@/lib/roles";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guardLoading, setGuardLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthorized(false);

      if (!user) {
        setGuardLoading(false);
        router.replace("/admin/login");
        return;
      }

      if (!user.emailVerified) {
        setGuardLoading(false);
        router.replace(`/verify-email?next=${encodeURIComponent("/admin/dashboard")}`);
        return;
      }

      try {
        const profileSnap = await getDoc(doc(db, "users", user.uid));
        const data = profileSnap.exists() ? (profileSnap.data() as unknown) : null;
        if (!profileSnap.exists() || !isAdminUserData(data)) {
          setGuardLoading(false);
          router.replace("/admin/login");
          return;
        }
      } catch (error) {
        console.error("Error verifying admin user:", error);
        setGuardLoading(false);
        router.replace("/admin/login");
        return;
      }

      setAuthorized(true);
      setGuardLoading(false);
    });

    return () => unsub();
  }, [router]);

  if (guardLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-64 transition-all duration-300">
        {/* Header */}
        <div className="bg-white shadow-sm z-10 sticky top-0">
          <AdminHeader onMobileMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
        </div>

        {/* Main Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 shadow-xl transition transform duration-300 ease-in-out">
             <AdminSidebar mobile onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
