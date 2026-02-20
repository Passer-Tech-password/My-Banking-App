import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import {
  BanknotesIcon,
  CreditCardIcon,
  HomeModernIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { CONTACT_PHONE_PRIMARY } from "@/lib/config";

export default function ServicesPage() {
  return (
    <main className="w-full min-h-screen flex flex-col bg-white">
      <Navbar />

      <section className="bg-blue-900 text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-indigo-500 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Banking Services Designed Around You
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            From everyday banking to major life milestones, Aurora Bank offers
            tailored credit cards, loans, and financing solutions to help you
            move confidently.
          </p>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-5">
                <CreditCardIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Credit Cards
              </h2>
              <p className="text-gray-600 mb-6">
                Flexible credit with transparent pricing, rich rewards, and
                real-time controls in your dashboard.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>• Cashback on everyday purchases</li>
                <li>• Virtual cards for safer online payments</li>
                <li>• Real-time card lock and spend alerts</li>
              </ul>
              <Link
                href="/register"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                Apply for a credit card
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-5">
                <BanknotesIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Personal Loans
              </h2>
              <p className="text-gray-600 mb-6">
                Simple, unsecured loans with clear terms for consolidating
                debt, funding projects, or handling the unexpected.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>• Competitive fixed interest rates</li>
                <li>• Flexible repayment schedules</li>
                <li>• No early repayment penalties</li>
              </ul>
              <Link
                href="/contact-us"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                Discuss a personal loan
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-5">
                <HomeModernIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Home & Vehicle Financing
              </h2>
              <p className="text-gray-600 mb-6">
                Structured financing for property and vehicles with guidance
                from experienced specialists.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>• Mortgage and refinancing options</li>
                <li>• Auto financing with predictable payments</li>
                <li>• Expert support from application to closing</li>
              </ul>
              <Link
                href="/contact-us"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                Talk to a financing specialist
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                <BriefcaseIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Business Accounts
              </h2>
              <p className="text-gray-600 mb-6">
                Banking built for growing companies with tools to manage cash
                flow, payroll, and international payments.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>• Dedicated business current and savings accounts</li>
                <li>• Multi-user access and approvals</li>
                <li>• Support for domestic and cross-border transfers</li>
              </ul>
              <Link
                href="/contact-us"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                Talk to business banking
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-5">
                <CurrencyDollarIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Savings & Investments
              </h2>
              <p className="text-gray-600 mb-6">
                Grow your wealth with structured savings plans and curated
                investment opportunities.
              </p>
              <ul className="space-y-2 text-sm text-gray-600 mb-6">
                <li>• High-yield savings options</li>
                <li>• Term deposits with predictable returns</li>
                <li>• Access to managed investment portfolios</li>
              </ul>
              <Link
                href="/register"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                Open a savings account
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="bg-blue-50 rounded-3xl p-10 border border-blue-100 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="text-blue-700 font-semibold tracking-wide uppercase text-sm">
                Smart Protection
              </span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">
                Built-in security on every product
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                Every Aurora Bank service is wrapped in multi-layer security:
                device intelligence, real-time monitoring, and proactive fraud
                alerts across your cards and accounts.
              </p>
              <ul className="space-y-3 text-sm text-gray-700">
                <li>• 24/7 transaction monitoring</li>
                <li>• Instant card freeze from your dashboard</li>
                <li>• Strong encryption across web and mobile banking</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-100 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Prefer to speak to a specialist?
                  </p>
                  <p className="text-sm text-gray-600">
                    Our team can walk you through the right mix of products.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs uppercase text-gray-500 mb-1">
                    Phone
                  </p>
                  <p className="font-semibold text-gray-900">
                    {CONTACT_PHONE_PRIMARY}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-xs uppercase text-gray-500 mb-1">
                    Email
                  </p>
                  <p className="font-semibold text-gray-900">
                    advisory@springcu.pro
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
