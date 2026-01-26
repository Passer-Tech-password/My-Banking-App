import React from "react";

export default function Footer() {
  return (
    <>
      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo */}
          <div>
            <img src="/logo.png" alt="Spring Bank" className="h-10 mb-4" />
            <p className="text-sm">
              Spring Credit Union provides secure, fast, and innovative banking
              solutions worldwide.
            </p>
          </div>

          {/* Company */}
          <div>
            <h5 className="font-semibold mb-3 text-white">Our Company</h5>
            <ul className="space-y-2 text-sm">
              <li>About Us</li>
              <li>Careers</li>
              <li>Contact</li>
              <li>Privacy Policy</li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h5 className="font-semibold mb-3 text-white">Products</h5>
            <ul className="space-y-2 text-sm">
              <li>Online Payments</li>
              <li>Mobile Banking</li>
              <li>Business Accounts</li>
              <li>Savings Accounts</li>
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <h5 className="font-semibold mb-3 text-white">Subscribe</h5>
            <p className="text-sm mb-3">
              Subscribe to our newsletter to get updates.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Your Email"
                className="px-3 py-2 rounded-l bg-gray-800 text-sm focus:outline-none"
              />
              <button className="bg-teal-600 px-4 py-2 rounded-r text-sm text-white">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-10">
          © 2026 Spring Credit Union. All Rights Reserved.
        </p>
      </footer>
    </>
  );
}
