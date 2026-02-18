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

export default function HomePage() {
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
            <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">Smart Banking</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
              A Premium Way To Save, Spend & Send Money Online
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Aurora Bank gives you a sophisticated, fully digital way to manage your money.
              Open an account, grow your savings, and move funds globally with confidence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <GlobeAltIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Global Cards</h3>
              <p className="text-gray-600 mb-6">
                Cards that work all across the world. Shop online or offline with complete freedom.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <CurrencyDollarIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">High Returns</h3>
              <p className="text-gray-600 mb-6">
                Highest Returns on your investments. Grow your wealth with our premium savings accounts.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow group">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <BanknotesIcon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Zero Fees</h3>
              <p className="text-gray-600 mb-6">
                No ATM fees. No minimum balance. No overdrafts. Keep more of your hard-earned money.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/about" className="text-blue-600 font-semibold hover:text-blue-800 flex items-center justify-center gap-2">
              More About us
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
              <span className="text-blue-600 font-semibold tracking-wide uppercase text-sm">Our Feature</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                Payment Services Worldwide
              </h2>
              <p className="text-gray-600 mb-10 text-lg">
                We provide a robust infrastructure for seamless global payments. Whether you're sending money to family, funding your business, or paying for services abroad, we help your transfers move quickly and reliably.
              </p>
              
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                    <ShieldCheckIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Protect Your Card</h3>
                    <p className="text-gray-600">Your Credit Card is encrypted with anti-fraud detection AI to keep your funds safe.</p>
                  </div>
                </div>
           
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <PaperAirplaneIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Send Money</h3>
                    <p className="text-gray-600">Send money across the globe in just a matter of minutes with low fees.</p>
                  </div>
                </div>
           
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <DevicePhoneMobileIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Online Banking</h3>
                    <p className="text-gray-600">A new paradigm shift disrupting the old order of Banking with our digital-first approach.</p>
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
          <span className="text-blue-300 font-semibold tracking-wide uppercase text-sm">Banking Security</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6">
            The Safest Way To Transact Your Money Fast
          </h2>
          <p className="text-blue-100 max-w-3xl mx-auto mb-12 text-lg">
            With Aurora Bank, your money and data are protected by multi-layer security,
            strong encryption, and continuous fraud monitoring, so you can bank with confidence.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div className="p-6 bg-blue-800 rounded-xl border border-blue-700">
              <h3 className="text-3xl font-bold mb-2">256-bit</h3>
              <p className="text-blue-200 text-sm">Encryption</p>
            </div>
            <div className="p-6 bg-blue-800 rounded-xl border border-blue-700">
              <h3 className="text-3xl font-bold mb-2">24/7</h3>
              <p className="text-blue-200 text-sm">Monitoring</p>
            </div>
            <div className="p-6 bg-blue-800 rounded-xl border border-blue-700">
              <h3 className="text-3xl font-bold mb-2">100%</h3>
              <p className="text-blue-200 text-sm">Secure</p>
            </div>
             <div className="p-6 bg-blue-800 rounded-xl border border-blue-700">
              <h3 className="text-3xl font-bold mb-2">Multi</h3>
              <p className="text-blue-200 text-sm">Factor Auth</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
