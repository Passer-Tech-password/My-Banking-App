import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { cookies } from "next/headers";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/messages";
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

export default async function ServicesPage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookies(cookieStore);
  const t = createTranslator(locale);

  return (
    <main className="w-full min-h-screen flex flex-col bg-white">
      <Navbar locale={locale} />

      <section className="bg-blue-900 text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-indigo-500 blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {t("services.title")}
          </h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            {t("services.description")}
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
                {t("services.card1.title")}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("services.card1.description")}
              </p>
              <Link
                href="/register"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                {t("services.cta.button")}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-5">
                <BanknotesIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {t("services.card4.title")}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("services.card4.description")}
              </p>
              <Link
                href="/contact-us"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                {t("about.getInTouch")}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-5">
                <HomeModernIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {t("services.card5.title")}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("services.card5.description")}
              </p>
              <Link
                href="/contact-us"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                {t("about.getInTouch")}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-5">
                <CurrencyDollarIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {t("services.card2.title")}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("services.card2.description")}
              </p>
              <Link
                href="/register"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                {t("services.cta.button")}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-5">
                <BriefcaseIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {t("services.card3.title")}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("services.card3.description")}
              </p>
              <Link
                href="/contact-us"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                {t("about.getInTouch")}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center mb-5">
                <ShieldCheckIcon className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                {t("services.card6.title")}
              </h2>
              <p className="text-gray-600 mb-6">
                {t("services.card6.description")}
              </p>
              <Link
                href="/contact-us"
                className="mt-auto inline-flex items-center gap-2 text-blue-700 font-semibold hover:text-blue-900"
              >
                {t("about.getInTouch")}
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-blue-600 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-6">{t("services.cta.title")}</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            {t("services.cta.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
            >
              {t("services.cta.button")}
            </Link>
            <Link
              href="/contact-us"
              className="bg-blue-700 text-white border border-blue-500 px-8 py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors"
            >
              {t("contact.title")}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
