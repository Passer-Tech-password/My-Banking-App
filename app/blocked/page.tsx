"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function BlockedPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account restricted</h1>
          <p className="text-sm text-gray-600 mb-6">
            Your account has been temporarily restricted. Please contact support for assistance.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/contact-us"
              className="w-full bg-blue-700 text-white py-2 rounded font-medium hover:bg-blue-800 transition-colors"
            >
              Contact support
            </Link>
            <Link
              href="/login"
              className="w-full bg-white border border-gray-300 text-gray-800 py-2 rounded font-medium hover:bg-gray-50 transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

