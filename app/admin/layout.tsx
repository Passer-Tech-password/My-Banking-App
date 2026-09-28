"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login" || pathname === "/admin/login/";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen && typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    } else if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
    return () => {
      if (typeof document !== "undefined") document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const closeOnResize = () => {
      if (typeof window !== "undefined" && window.innerWidth >= 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    if (typeof window === "undefined") return;
    window.addEventListener("resize", closeOnResize);
    return () => window.removeEventListener("resize", closeOnResize);
  }, [mobileMenuOpen]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <aside className="hidden lg:block w-64 flex-shrink-0" aria-label="Admin sidebar">
        <div className="fixed inset-y-0 left-0 w-64">
          <AdminSidebar />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="bg-white shadow-sm z-20 sticky top-0">
          <AdminHeader
            onMobileMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
        </div>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 w-full max-w-full">
          {children}
        </main>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation drawer"
        >
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          ></div>
          <div className="fixed inset-y-0 left-0 z-50 w-[80%] max-w-[18rem] sm:w-64 sm:max-w-none bg-blue-900 shadow-xl transition transform duration-300 ease-in-out overflow-y-auto">
            <AdminSidebar mobile onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
