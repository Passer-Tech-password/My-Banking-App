import Image from "next/image";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="w-full">
      {/* HERO */}
      <section className="bg-teal-50 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-10">
          {/* Text */}
          <div>
            <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
            <p className="text-sm text-gray-600">
              Home / <span className="text-teal-600">Privacy Policy</span>
            </p>
          </div>

          {/* Illustration */}
          <div className="flex justify-center">
            <Image
              src="/privacy-illustration.png"
              alt="Privacy Policy Illustration"
              width={420}
              height={300}
            />
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-5xl mx-auto space-y-10 text-sm text-gray-700">
          <div>
            <h3 className="text-lg font-semibold mb-2">What Data We Get</h3>
            <p>
              We collect personal data directly from you through your personal
              data when you participate in services and data from third-party
              platforms you connect with Spring Credit Union.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Data You Provide to Us
            </h3>
            <p>
              You may provide personal data such as your name, address, email,
              phone number, banking information, and other details necessary for
              account creation and service delivery.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              How We Get Data About You
            </h3>
            <p>
              We collect data through forms, account registration, surveys,
              cookies, analytics services, and interactions with our platform
              and support channels.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Your Choices About the Use of Your Data
            </h3>
            <p>
              You may manage communication preferences, restrict certain data
              usage, or request access, correction, or deletion of your personal
              data by contacting our support team.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              What We Use Your Data For
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Providing and maintaining banking services</li>
              <li>Processing transactions securely</li>
              <li>Fraud detection and security monitoring</li>
              <li>Improving customer experience and services</li>
              <li>Sending important service notifications</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">
              Our Policy for Ages Under 18
            </h3>
            <p>
              We do not knowingly collect personal information from individuals
              under the age of 18. If such data is identified, it will be
              promptly removed.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 py-16 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo */}
          <div>
            <Image src="/logo.png" alt="Spring Bank" width={120} height={40} />
            <p className="text-sm mt-4">
              Spring Credit Union provides secure, modern online banking
              solutions for individuals and businesses.
            </p>
          </div>

          {/* Company */}
          <div>
            <h5 className="font-semibold text-white mb-3">Our Company</h5>
            <ul className="space-y-2 text-sm">
              <li>About Us</li>
              <li>Careers</li>
              <li>Contact Us</li>
              <li>Privacy Policy</li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h5 className="font-semibold text-white mb-3">Products</h5>
            <ul className="space-y-2 text-sm">
              <li>Online Payments</li>
              <li>Mobile Banking</li>
              <li>Debit Cards</li>
              <li>Savings Accounts</li>
            </ul>
          </div>

          {/* Subscribe */}
          <div>
            <h5 className="font-semibold text-white mb-3">Subscribe</h5>
            <p className="text-sm mb-3">Subscribe to get the latest updates.</p>
            <div className="flex">
              <input
                type="email"
                placeholder="Your Email"
                className="bg-gray-800 px-3 py-2 rounded-l text-sm focus:outline-none"
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
    </main>
  );
}
