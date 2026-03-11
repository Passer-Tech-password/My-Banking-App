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
import Image from "next/image";

export default async function HomePage() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookies(cookieStore);
  const t = createTranslator(locale);

  return (
    <main className="w-full min-h-screen flex flex-col bg-white">
      {/* NAVBAR */}
      <Navbar locale={locale} />
      
      {/* HERO SECTION */}
      <HeroSlider />

      {/* SMART BANKING SECTION */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 relative w-full max-w-lg lg:max-w-none mb-10 lg:mb-0">
               <div className="relative w-full aspect-square flex items-center justify-center animate-float">
                 {/* Decorative background glow */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full blur-3xl transform scale-75"></div>
                 
                <Image
                  src="/smart-banking-image.png"
                  alt={t("home.smartBanking.title")}
                  fill
                  sizes="(max-width: 1024px) 80vw, 600px"
                  className="relative z-10 object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                  priority
                />
               </div>
            </div>

            <div className="flex-1">
              <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t("home.smartBanking")}</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                {t("home.smartBanking.title")}
              </h2>
              <p className="text-gray-600 mb-10 text-lg">
                {t("home.smartBanking.description")}
              </p>

              <div className="grid grid-cols-1 gap-6">
                {/* Card 1 */}
                <div className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                    <GlobeAltIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t("home.card1.title")}</h3>
                    <p className="text-gray-600">
                      {t("home.card1.description")}
                    </p>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CurrencyDollarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t("home.card2.title")}</h3>
                    <p className="text-gray-600">
                      {t("home.card2.description")}
                    </p>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                    <BanknotesIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t("home.card3.title")}</h3>
                    <p className="text-gray-600">
                      {t("home.card3.description")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <Link href="/about" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-colors group">
                  {t("home.moreAboutUs")}
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* OUR FEATURE SECTION */}
      <section className="bg-gray-50 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center">
            <div className="text-center max-w-3xl mb-16">
              <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t("home.ourFeature")}</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                {t("home.feature.title")}
              </h2>
              <p className="text-gray-600 text-lg">
                {t("home.feature.description")}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6">
                  <ShieldCheckIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t("home.feature1.title")}</h3>
                <p className="text-gray-600 leading-relaxed">{t("home.feature1.description")}</p>
              </div>
         
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <PaperAirplaneIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t("home.feature2.title")}</h3>
                <p className="text-gray-600 leading-relaxed">{t("home.feature2.description")}</p>
              </div>
         
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <DevicePhoneMobileIcon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t("home.feature3.title")}</h3>
                <p className="text-gray-600 leading-relaxed">{t("home.feature3.description")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BANKING SECURITY SECTION */}
      <section className="bg-blue-900 text-white py-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left">
              <span className="text-blue-300 font-semibold tracking-wide uppercase text-sm">{t("home.security")}</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
                {t("home.security.title")}
              </h2>
              <p className="text-blue-100 mb-10 text-lg">
                {t("home.security.description")}
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-blue-800/50 rounded-xl border border-blue-700/50 backdrop-blur-sm">
                  <h3 className="text-3xl font-bold mb-1">256-bit</h3>
                  <p className="text-blue-200 text-sm">{t("home.security.encryption")}</p>
                </div>
                <div className="p-6 bg-blue-800/50 rounded-xl border border-blue-700/50 backdrop-blur-sm">
                  <h3 className="text-3xl font-bold mb-1">24/7</h3>
                  <p className="text-blue-200 text-sm">{t("home.security.monitoring")}</p>
                </div>
                <div className="p-6 bg-blue-800/50 rounded-xl border border-blue-700/50 backdrop-blur-sm">
                  <h3 className="text-3xl font-bold mb-1">100%</h3>
                  <p className="text-blue-200 text-sm">{t("home.security.secure")}</p>
                </div>
                <div className="p-6 bg-blue-800/50 rounded-xl border border-blue-700/50 backdrop-blur-sm">
                  <h3 className="text-3xl font-bold mb-1">Multi</h3>
                  <p className="text-blue-200 text-sm">{t("home.security.auth")}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 relative w-full max-w-lg lg:max-w-none">
              <div className="relative w-full aspect-square flex items-center justify-center animate-float">
                 {/* Decorative background glow */}
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-purple-500/30 rounded-full blur-3xl transform scale-75"></div>
                 
                 <img 
                   src="/security-image.png-removebg-preview.png" 
                   alt="Banking Security" 
                   className="relative z-10 object-contain w-full h-full drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                 />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </main>
  );
}
