"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  HomeIcon,
  UsersIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: HomeIcon },
  { name: "Users", href: "/admin/users", icon: UsersIcon },
  { name: "Transactions", href: "/admin/transactions", icon: BanknotesIcon },
  { name: "Requests", href: "/admin/requests", icon: Cog6ToothIcon },
];

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({ mobile, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className={`flex flex-col w-64 bg-blue-900 text-white min-h-screen ${mobile ? 'relative' : 'fixed left-0 top-0 z-20'} shadow-xl`}>
      {/* Logo Area */}
      <div className="flex items-center justify-between px-6 h-20 border-b border-blue-800 bg-blue-950">
        <Link href="/" className="flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
             <span className="font-bold text-white text-lg">A</span>
           </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Aurora<span className="text-blue-400">Admin</span>
          </span>
        </Link>
        {mobile && (
          <button onClick={onClose} className="text-blue-300 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={mobile ? onClose : undefined}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/20"
                  : "text-blue-200 hover:text-white hover:bg-blue-800"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-white" : "text-blue-300 group-hover:text-white"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout Area */}
      <div className="p-4 border-t border-blue-800 bg-blue-950">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-300 hover:text-red-200 hover:bg-blue-800 rounded-lg transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
