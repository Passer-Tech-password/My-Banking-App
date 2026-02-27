import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import HeroSlider from "@/components/HeroSlider";
import Link from "next/link";
import { 
  CreditCardIcon, 
  CurrencyDollarIcon, 
  BanknotesIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  PaperAirplaneIcon
} from "@heroicons/react/24/outline";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/messages";
import { cookies } from "next/headers";

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookies(cookieStore);
  const t = createTranslator(locale);

  return (
    <main className="w-full min-h-screen flex flex-col bg-white">
      {/* NAVBAR */}
      <Navbar />
      
      {/* HERO SECTION */}
      <HeroSlider />

      {/* SMART BANKING SECTION */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t("home.smartBanking")}</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
              {t("home.smartBanking.title")}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {t("home.smartBanking.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <GlobeAltIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t("home.card1.title")}</h3>
              <p className="text-gray-600 mb-6">
                {t("home.card1.description")}
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <CurrencyDollarIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t("home.card2.title")}</h3>
              <p className="text-gray-600 mb-6">
                {t("home.card2.description")}
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <BanknotesIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{t("home.card3.title")}</h3>
              <p className="text-gray-600 mb-6">
                {t("home.card3.description")}
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/about" className="text-blue-600 font-semibold hover:text-blue-800 flex items-center justify-center gap-2">
              {t("home.moreAboutUs")}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
      
      {/* OUR FEATURE SECTION */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t("home.ourFeature")}</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                {t("home.feature.title")}
              </h2>
              <p className="text-gray-600 mb-10 text-lg">
                {t("home.feature.description")}
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                    <ShieldCheckIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{t("home.feature1.title")}</h3>
                    <p className="text-gray-600">{t("home.feature1.description")}</p>
                  </div>
                </div>
           
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <PaperAirplaneIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{t("home.feature2.title")}</h3>
                    <p className="text-gray-600">{t("home.feature2.description")}</p>
                  </div>
                </div>
           
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <DevicePhoneMobileIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{t("home.feature3.title")}</h3>
                    <p className="text-gray-600">{t("home.feature3.description")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BANKING SECURITY SECTION */}
      <section className="bg-blue-900 text-white py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <span className="text-blue-300 font-semibold tracking-wide uppercase text-sm">{t("home.security")}</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
            {t("home.security.title")}
          </h2>
          <p className="text-blue-100 max-w-3xl mx-auto mb-12 text-lg">
            {t("home.security.description")}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="p-6 bg-blue-800 rounded-xl border border-blue-700">
              <h3 className="text-3xl font-bold mb-2">256-bit</h3>
              <p className="text-blue-200 text-sm">{t("home.security.encryption")}</p>
            </div>
            <div className="p-6 bg-blue-800 rounded-xl border border-blue-700">
              <h3 className="text-3xl font-bold mb-2">24/7</h3>
              <p className="text-blue-200 text-sm">{t("home.security.monitoring")}</p>
            </div>
            <div className="p-6 bg-blue-800 rounded-xl border border-blue-700">
              <h3 className="text-3xl font-bold mb-2">100%</h3>
              <p className="text-blue-200 text-sm">{t("home.security.secure")}</p>
            </div>
             <div className="p-6 bg-blue-800 rounded-xl border border-blue-700">
              <h3 className="text-3xl font-bold mb-2">Multi</h3>
              <p className="text-blue-200 text-sm">{t("home.security.auth")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </main>
  );
}
