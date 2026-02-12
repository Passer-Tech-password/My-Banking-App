"use client";

import { useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import AdminHeader from "@/components/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
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
