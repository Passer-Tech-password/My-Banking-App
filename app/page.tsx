import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="w-full min-h-screen flex flex-col">
      {/* NAVBAR */}
      <Navbar />
      
      <div className="flex-grow">
        {/* HERO SECTION */}
        <section className="bg-gradient-to-r from-blue-50 to-white">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center px-6 py-16 gap-10">
            {/* Left Text */}
            <div className="order-2 md:order-1">
              <p className="text-sm text-blue-700 font-semibold mb-2 uppercase tracking-wide">
                Simple. Transparent. Secure
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight text-gray-900">
                Fast & Secure <br/>
                <span className="text-blue-700">Online Banking</span>
              </h1>
              <p className="text-gray-600 mb-8 max-w-lg text-lg leading-relaxed">
                An innovative online banking solution that allows you to manage
                your finances easily, securely, and from anywhere in the world.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="inline-flex justify-center items-center bg-blue-700 text-white px-8 py-3 rounded-lg text-base font-semibold hover:bg-blue-800 transition-all shadow-lg hover:shadow-xl"
                >
                  Get Started
                </Link>
                <Link
                  href="/about"
                  className="inline-flex justify-center items-center bg-white text-blue-700 border border-blue-200 px-8 py-3 rounded-lg text-base font-semibold hover:bg-blue-50 transition-all"
                >
                  Learn More
                </Link>
              </div>
            </div>

            {/* Right Image */}
            <div className="flex justify-center order-1 md:order-2">
              <img
                src="/hero-people.png"
                alt="Happy banking users"
                className="max-w-full h-auto drop-shadow-xl rounded-2xl animate-fade-in-up"
              />
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 px-6 items-center">
            {/* Images */}
            <div className="grid grid-cols-2 gap-6 relative">
              <div className="absolute -z-10 bg-blue-100 rounded-full w-64 h-64 -top-10 -left-10 blur-3xl opacity-50"></div>
              <img
                src="/feature-1.jpg"
                alt="Mobile banking interface"
                className="rounded-2xl shadow-lg w-full h-64 object-cover transform translate-y-8"
              />
              <img
                src="/feature-2.jpg"
                alt="Secure transactions"
                className="rounded-2xl shadow-lg w-full h-64 object-cover"
              />
            </div>

            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-4">
                <span className="w-2 h-2 rounded-full bg-blue-700"></span>
                Smart Banking
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                The Better Way To Save & Send Money Online
              </h2>
              <p className="text-gray-600 mb-6 text-lg">
                Experience the future of banking with our cutting-edge platform. We prioritize security, speed, and user experience to give you the best financial tools available.
              </p>
              
              <ul className="space-y-4 mb-8">
                {[
                  "Instant transfers to any bank",
                  "Real-time spending notifications",
                  "No hidden fees or monthly charges",
                  "24/7 dedicated customer support"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-700">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <Link
                href="/features"
                className="text-blue-700 font-semibold hover:text-blue-800 flex items-center gap-2 group"
              >
                Explore all features
                <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="bg-blue-900 text-white py-20">
          <div className="max-w-4xl mx-auto text-center px-6">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to get started?</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
              Join millions of users who trust Spring Bank for their daily financial needs. Open an account in less than 5 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-white text-blue-900 px-8 py-3 rounded-lg text-base font-semibold hover:bg-gray-100 transition-colors"
              >
                Open an Account
              </Link>
              <Link
                href="/contact-us"
                className="border border-white text-white px-8 py-3 rounded-lg text-base font-semibold hover:bg-white/10 transition-colors"
              >
                Contact Support
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
