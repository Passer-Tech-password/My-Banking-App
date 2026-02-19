"use client";

import { useState } from "react";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <DashboardSidebar />

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

      {/* Mobile Sidebar Overlay (Simple implementation for now) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 shadow-xl transition transform duration-300 ease-in-out">
             {/* Re-use Sidebar content or just import it if it accepts props to handle close */}
             {/* For simplicity, we just render the sidebar again but mobile optimized versions would be better */}
             <div className="h-full flex flex-col">
               <div className="flex items-center justify-center h-16 border-b border-slate-800">
                  <span className="text-xl font-bold text-white">AuroraBank</span>
                </div>
                {/* Navigation Links (dup for now or refactor) */}
                {/* Ideally DashboardSidebar handles responsive, but for now this is a placeholder for mobile */}
                <div className="p-4 text-gray-400">Mobile Menu Open</div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
