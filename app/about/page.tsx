import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { UserGroupIcon, BuildingOfficeIcon, GlobeAmericasIcon } from "@heroicons/react/24/outline";
import { cookies } from "next/headers";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/messages";

export default async function AboutPage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookies(cookieStore);
  const t = createTranslator(locale);

  return (
    <main className="w-full min-h-screen flex flex-col bg-white">
      <Navbar locale={locale} />

      {/* Hero Section */}
      <section className="bg-blue-900 text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-indigo-500 blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t("about.title")}</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            {t("about.description")}
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t("about.whoWeAre")}</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-6">
              {t("about.trustTitle")}
            </h2>
            <p className="text-gray-600 mb-6 text-lg leading-relaxed">
              {t("about.trustText1")}
            </p>
            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
              {t("about.trustText2")}
            </p>
            
            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {t("about.getInTouch")}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-6 mt-12">
              <div className="bg-gray-50 p-6 rounded-2xl">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                  <UserGroupIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t("about.customerFirst")}</h3>
                <p className="text-gray-600 text-sm">{t("about.customerFirstText")}</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 mb-4">
                  <GlobeAmericasIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t("about.globalReach")}</h3>
                <p className="text-gray-600 text-sm">{t("about.globalReachText")}</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-2xl">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                  <BuildingOfficeIcon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t("about.secure")}</h3>
                <p className="text-gray-600 text-sm">{t("about.secureText")}</p>
              </div>
              <div className="bg-blue-600 p-6 rounded-2xl text-white">
                <h3 className="text-4xl font-bold mb-2">10+</h3>
                <p className="text-blue-100">Years of Service</p>
                <p className="text-blue-200 text-sm mt-2">Serving thousands of happy customers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-900 text-white py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-gray-800">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">2M+</div>
              <div className="text-gray-400">Users Worldwide</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">$5B+</div>
              <div className="text-gray-400">{t("about.stat.transactions")}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">60+</div>
              <div className="text-gray-400">{t("about.stat.countries")}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">24/7</div>
              <div className="text-gray-400">{t("about.stat.support")}</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
