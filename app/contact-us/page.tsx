import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { EnvelopeIcon, PhoneIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { CONTACT_PHONE_PRIMARY } from "@/lib/config";
import { cookies } from "next/headers";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/messages";
import Image from "next/image";

export default async function ContactPage() {
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
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">{t("contact.title")}</h1>
              <p className="text-xl text-blue-100 max-w-2xl mx-auto md:mx-0">
                {t("contact.description")}
              </p>
            </div>
            <div className="flex-1 relative w-full max-w-md hidden md:block">
               <div className="relative w-full aspect-[4/3] flex items-center justify-center animate-float">
                 <div className="absolute inset-0 bg-gradient-to-tr from-blue-400/20 to-purple-400/20 rounded-full blur-3xl transform scale-75"></div>
                 <Image 
                   src="/contact-hero-image.png" 
                   alt={t("contact.heroAlt") || "Contact Aurora Bank"} 
                   className="relative z-10 object-contain w-full h-full drop-shadow-2xl transition-transform duration-500 hover:scale-105"
                 />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Content */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Info */}
          <div>
            <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">{t("contact.getInTouch")}</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-8">
              {t("contact.conversationTitle")}
            </h2>
            <p className="text-gray-600 mb-10 text-lg">
              {t("contact.conversationText")}
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                  <MapPinIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{t("contact.office")}</h3>
                  <p className="text-gray-600">123 Banking Street, Financial District, New York, NY 10005, USA</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                  <EnvelopeIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{t("contact.email")}</h3>
                  <p className="text-gray-600">support@springcu.pro</p>
                  <p className="text-gray-600">info@springcu.pro</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                  <PhoneIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{t("contact.phone")}</h3>
                  <p className="text-gray-600">{CONTACT_PHONE_PRIMARY}</p>
                  <p className="text-gray-600">+1 (555) 987-6543</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-50 p-8 rounded-2xl border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{t("contact.form.send")}</h3>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">{t("contact.form.name")}</label>
                  <input
                    type="text"
                    id="firstName"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">{t("contact.form.name")} (Last)</label>
                  <input
                    type="text"
                    id="lastName"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">{t("contact.form.email")}</label>
                <input
                  type="email"
                  id="email"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  id="subject"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                  placeholder="Your message..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-4 rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer locale={locale} />
    </main>
  );
}
