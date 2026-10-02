"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  HomeIcon,
  BanknotesIcon,
  CreditCardIcon,
  UserCircleIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";

const navKeys = [
  { key: "sidebar.dashboard", href: "/dashboard", icon: HomeIcon },
  { key: "sidebar.transfer", href: "/dashboard/transfer", icon: PaperAirplaneIcon },
  { key: "sidebar.transactions", href: "/dashboard/transactions", icon: BanknotesIcon },
  { key: "sidebar.cards", href: "/dashboard/cards", icon: CreditCardIcon },
  { key: "sidebar.contacts", href: "/dashboard/contacts", icon: UserGroupIcon },
  { key: "sidebar.profile", href: "/dashboard/profile", icon: UserCircleIcon },
  { key: "sidebar.settings", href: "/dashboard/settings", icon: Cog6ToothIcon },
];

interface DashboardSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ mobile, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className={`flex flex-col w-64 bg-slate-900 text-white min-h-screen ${mobile ? "relative" : "fixed left-0 top-0 z-20"} shadow-xl`}>
      {/* Logo Area */}
      <div className="flex items-center justify-between px-6 h-20 border-b border-slate-800 bg-slate-950">
        <Link href="/" className="flex items-center gap-2" onClick={mobile ? onClose : undefined}>
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
             <span className="font-bold text-white text-lg">A</span>
           </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Aurora<span className="text-blue-500">Bank</span>
          </span>
        </Link>
        {mobile && (
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navKeys.map((item) => {
          const isActive = pathname === item.href;
          const name = t(item.key);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={mobile ? onClose : undefined}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-500 group-hover:text-white"}`} />
              {name}
            </Link>
          );
        })}
      </nav>

      {/* Logout Area */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          {t("sidebar.signOut")}
        </button>
      </div>
    </div>
  );
}
