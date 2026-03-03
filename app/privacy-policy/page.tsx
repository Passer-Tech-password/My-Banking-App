import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cookies } from "next/headers";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { defaultLocale, createTranslator } from "@/lib/i18n/messages";

export default async function PrivacyPolicyPage() {
  let locale = defaultLocale;
  try {
    const cookieStore = await cookies();
    locale = getLocaleFromCookies(cookieStore);
  } catch (error) {
    // Fallback to default locale
  }

  const t = createTranslator(locale);

  return (
    <main className="w-full min-h-screen flex flex-col bg-white">
      <Navbar locale={locale} />

      {/* Hero Section */}
      <section className="bg-blue-900 text-white py-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-indigo-500 blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex-1">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">Privacy Policy</h1>
              <p className="text-blue-100 text-lg">
                {t("privacy.breadcrumb")}
              </p>
            </div>
            <div className="flex-1 relative w-full max-w-md hidden md:block">
               <div className="relative w-full aspect-[4/3] flex items-center justify-center animate-float">
                 <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-full blur-3xl transform scale-75"></div>
                 <img 
                   src="/privacy-hero-image.png" 
                   alt={t("privacy.heroAlt") || "Privacy Policy"} 
                   className="relative z-10 object-contain w-full h-full drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                 />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg text-gray-600 max-w-none">
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("privacy.section1.title")}</h2>
              <p className="text-gray-600 leading-relaxed">
                {t("privacy.section1.content")}
              </p>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("privacy.section2.title")}</h2>
              <p className="text-gray-600 leading-relaxed">
                {t("privacy.section2.content")}
              </p>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("privacy.section3.title")}</h2>
              <p className="text-gray-600 leading-relaxed">
                {t("privacy.section3.content")}
              </p>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("privacy.section4.title")}</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                {t("privacy.section4.content")}
              </p>
              <p className="text-gray-600 leading-relaxed">
                {t("privacy.section4.browser_info")}
              </p>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("privacy.section5.title")}</h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {t("privacy.section5.content")}
              </p>
              <ol className="list-decimal pl-6 space-y-4 text-gray-600">
                <li className="pl-2">{t("privacy.list1")}</li>
                <li className="pl-2">{t("privacy.list2")}</li>
                <li className="pl-2">{t("privacy.list3")}</li>
              </ol>
            </div>

            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t("privacy.section6.title")}</h2>
              <p className="text-gray-600 leading-relaxed">
                {t("privacy.section6.content")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer locale={locale} />
    </main>
  );
}
