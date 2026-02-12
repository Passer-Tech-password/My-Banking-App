import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPolicyPage() {
  return (
    <main className="w-full min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-blue-900 text-white py-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-indigo-500 blur-3xl"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-blue-100 text-lg">
            Last updated: October 24, 2024
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto prose prose-blue prose-lg text-gray-600">
          <p className="lead text-xl text-gray-800 font-medium mb-8">
            At Spring Credit Union, we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and share information about you when you use our website, mobile application, and other online products and services.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information you provide directly to us, such as when you create an account, update your profile, make a transaction, or contact customer support. This may include:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Name, email address, phone number, and mailing address</li>
            <li>Social Security number and other government identification</li>
            <li>Financial information, including bank account numbers and transaction history</li>
            <li>Login credentials and biometric data</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">
            We use the information we collect to provide, maintain, and improve our services, such as to:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>Process transactions and send notices about your transactions</li>
            <li>Verify your identity and prevent fraud</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Communicate with you about products, services, offers, and events</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our services</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">3. Information Sharing</h2>
          <p className="mb-4">
            We may share information about you as follows or as otherwise described in this Privacy Policy:
          </p>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>With vendors, consultants, and other service providers who need access to such information to carry out work on our behalf</li>
            <li>In response to a request for information if we believe disclosure is in accordance with any applicable law, regulation, or legal process</li>
            <li>If we believe your actions are inconsistent with our user agreements or policies, or to protect the rights, property, and safety of Spring Credit Union or others</li>
          </ul>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">4. Security</h2>
          <p className="mb-6">
            We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction. We use industry-standard encryption and security protocols to safeguard your financial data.
          </p>

          <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">5. Contact Us</h2>
          <p className="mb-6">
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <p className="font-semibold text-gray-900">Spring Credit Union</p>
            <p>123 Banking Street</p>
            <p>New York, NY 10005</p>
            <p className="mt-2 text-blue-600">privacy@springcu.pro</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
