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
          <div className="text-
