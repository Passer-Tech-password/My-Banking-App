"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import {
  Bars3Icon,
  BellIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";

export default function DashboardHeader({ onMobileMenuClick }: { onMobileMenuClick?: () => void }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDisplayName("");
        setAvatarUrl("");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const data = snap.exists() ? (snap.data() as any) : null;
        const name =
          String(data?.displayName || "").trim() ||
          String(user.displayName || "").trim() ||
          String(user.email || "").trim();
        const image = String(data?.image || "").trim() || String(user.photoURL || "").trim();
        setDisplayName(name);
        setAvatarUrl(image);
      } catch (e) {
        setDisplayName(String(user.displayName || user.email || "").trim());
        setAvatarUrl(String(user.photoURL || "").trim());
      }
    });

    return () => unsub();
  }, []);

  const initials = (displayName || "User")
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
          Overview
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
        <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-700">{displayName ? displayName.split(" ")[0] : "My Account"}</p>
            <p className="text-xs text-gray-500">Member</p>
          </div>
          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : initials ? (
              <span className="text-sm font-bold">{initials}</span>
            ) : (
              <UserCircleIcon className="w-6 h-6" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
