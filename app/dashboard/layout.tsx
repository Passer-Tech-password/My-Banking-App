"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/components/ToastProvider";
import { parseUserRole } from "@/lib/roles";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [guardLoading, setGuardLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setAuthorized(false);

      if (!user) {
        setGuardLoading(false);
        router.replace("/login");
        return;
      }

      if (!user.emailVerified) {
        setGuardLoading(false);
        router.replace("/verify-email");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? (snap.data() as unknown) : null;
        const role = parseUserRole((data as { role?: unknown } | null)?.role);
        if (role === "admin") {
          setGuardLoading(false);
          router.replace("/admin/dashboard");
          return;
        }
        const blockedValue = snap.exists() ? (snap.data() as any)?.blocked : undefined;
        const isBlocked = blockedValue === true || blockedValue === "true";
        if (isBlocked) {
          await signOut(auth);
          toast.error("Your account is restricted. Please contact support.");
          setGuardLoading(false);
          router.replace("/blocked");
          return;
        }
      } catch (error) {
        console.error("Blocked check failed:", error);
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error("Sign out failed:", signOutError);
        }
        toast.error("Authentication error. Please try again.");
        setGuardLoading(false);
        router.replace("/login");
        return;
      }

      setAuthorized(true);
      setGuardLoading(false);
    });

    return () => unsub();
  }, [router, toast]);

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
        <DashboardSidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-64 transition-all duration-300">
        {/* Header */}
        <div className="bg-white shadow-sm z-10 sticky top-0">
          <DashboardHeader onMobileMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />
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
          <div className="fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 shadow-xl transition transform duration-300 ease-in-out">
            <DashboardSidebar mobile onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
