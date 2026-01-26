"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    accountNumber: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-gray-50">
        {/* LEFT SECTION */}
        <div className="flex flex-col justify-center px-6 md:px-12">
          {/* Logo */}
          <div className="mb-6">
            <img src="/logo.png" alt="Spring Bank Logo" className="h-12" />
          </div>

          <h2 className="text-2xl font-semibold mb-2">Sign-In</h2>

          <p className="text-sm text-gray-600 mb-6 border-l-4 border-blue-600 pl-3">
            Access the Spring Credit Union online banking panel using your
            Account Number and password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
            {/* Account Number */}
            <div>
              <label className="text-sm font-medium">Account Number</label>
              <input
                type="text"
                name="accountNumber"
                placeholder="Enter your Account Number"
                className="input mt-1"
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Password</label>
                <Link
                  href="#"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot Code?
                </Link>
              </div>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                className="input mt-1"
                onChange={handleChange}
              />
            </div>

            {/* Continue Button */}
            <button
              type="submit"
              className="w-full bg-blue-700 text-white py-2 rounded font-medium"
            >
              Continue
            </button>

            {/* Open Account */}
            <Link
              href="/register"
              className="block text-center bg-red-600 text-white py-2 rounded text-sm"
            >
              Open an Account
            </Link>
          </form>
        </div>

        {/* RIGHT SECTION */}
        <div className="hidden md:flex items-center justify-center bg-gray-100 px-10">
          <div className="max-w-md text-center">
            <h3 className="font-semibold mb-3">Protect your online banking.</h3>
            <p className="text-sm text-gray-600">
              We have security measures in place to safeguard your money,
              because we are committed to providing you with a secure banking
              experience. When we come across any hoaxes or scams that target
              customers, we will raise them to your attention.
            </p>

            {/* Dots Indicator */}
            <div className="flex justify-center gap-2 mt-6">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
              <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
