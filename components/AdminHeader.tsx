"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { toErrorInfo } from "@/lib/errorInfo";
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon
} from "@heroicons/react/24/outline";

export default function AdminHeader({ onMobileMenuClick }: { onMobileMenuClick?: () => void }) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("Administrator");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin/login");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  useEffect(() => {
    let profileUnsub: null | (() => void) = null;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      if (!user) {
        setDisplayName("Administrator");
        setAvatarUrl("");
        return;
      }

      const authName =
        String(user.displayName || "").trim() ||
        String(user.email || "").trim() ||
        "Administrator";
      const authImage = String(user.photoURL || "").trim();
      setDisplayName(authName);
      setAvatarUrl(authImage);

      profileUnsub = onSnapshot(
        doc(db, "users", user.uid),
        (snap) => {
          const data = snap.exists() ? (snap.data() as any) : null;
          const name =
            String(data?.displayName || "").trim() ||
            authName;
          const image =
            String(data?.image || "").trim() ||
            authImage;
          setDisplayName(name);
          setAvatarUrl(image);
        },
        (error) => {
          const { code, message } = toErrorInfo(error);
          console.error("Firestore access error:", {
            code,
            message,
          });
          setDisplayName(authName);
          setAvatarUrl(authImage);
        },
      );
    });

    return () => {
      if (profileUnsub) profileUnsub();
      unsub();
    };
  }, []);

  const initials = (displayName || "A")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  
  return (
    <header className="sticky top-0 z-10 flex h-20 w-full bg-white shadow-sm border-b border-gray-100 items-center justify-between px-6 lg:px-12">
      {/* Left: Mobile Menu Button & Title */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-blue-600 transition-colors"
        >
          <Bars3Icon className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold text-gray-800 hidden sm:block">
          Admin Portal
        </h1>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-blue-600 transition-colors">
          <BellIcon className="w-6 h-6" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        {/* User Profile */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 pl-6 border-l border-gray-100 focus:outline-none group"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">{displayName}</p>
              <p className="text-xs text-gray-500">Super User</p>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : initials ? (
                <span className="text-sm font-bold">{initials}</span>
              ) : (
                <UserCircleIcon className="w-6 h-6" />
              )}
            </div>
            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isProfileOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsProfileOpen(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 border border-gray-100 ring-1 ring-black ring-opacity-5 z-20">
                <div className="px-4 py-3 border-b border-gray-50 md:hidden">
                  <p className="text-sm font-medium text-gray-900">{displayName}</p>
                  <p className="text-xs text-gray-500">Super User</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
