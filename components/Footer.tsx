"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <>
      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 py-16 px-6 border-t border-gray-800">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-6">
               <span className="font-bold text-2xl text-white">Aurora Bank</span>
            </Link>
            <p className="text-sm leading-relaxed text-gray-400">
              Aurora Bank delivers secure, premium digital banking for individuals and businesses,
              with tailored solutions and global access to your money.
            </p>
          </div>

          {/* Company */}
          <div>
            <h5 className="font-semibold mb-6 text-white tracking-wide uppercase text-sm">Our Company</h5>
            <ul className="space-y-4 text-sm">
              <li>
                <Link href="/about" className="hover:text-blue-400 transition-colors">About Us</Link>
              </li>
              <li>
                <Link href="/contact-us" className="hover:text-blue-400 transition-colors">Contact Us</Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link>
              </li>
              <li>
                <span className="text-gray-500 cursor-default">Careers (Coming Soon)</span>
              </li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h5 className="font-semibold mb-6 text-white tracking-wide uppercase text-sm">Products</h5>
            <ul className="space-y-4 text-sm">
              <li>
                <span className="text-gray-500 cursor-default">Online Payments (Coming Soon)</span>
              </li>
              <li>
                <span className="text-gray-500 cursor-default">Mobile Banking (Coming Soon)</span>
              </li>
              <li>
                <span className="text-gray-500 cursor-default">Business Accounts (Coming Soon)</span>
              </li>
              <li>
                <span className="text-gray-500 cursor-default">Savings Accounts (Coming Soon)</span>
              </li>
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <h5 className="font-semibold mb-6 text-white tracking-wide uppercase text-sm">Subscribe</h5>
            <p className="text-sm mb-4 text-gray-400">
              Subscribe to our newsletter to get the latest updates and offers.
            </p>
            <form className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="Your Email"
                className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 placeholder-gray-500"
              />
              <button type="submit" className="bg-blue-600 px-4 py-3 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © 2026 Aurora Bank. All rights reserved.
          </p>
          <div className="flex gap-6">
             {/* Social placeholders */}
             <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
             <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
             <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
          </div>
        </div>
      </footer>
    </>
  );
}
