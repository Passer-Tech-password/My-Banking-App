"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  return (
    <nav className="bg-blue-600 text-white px-4 py-3 flex justify-between">
      <h1 className="font-bold">Banking App</h1>

      <button
        onClick={handleLogout}
        className="bg-red-500 px-3 py-1 rounded text-sm"
      >
        Logout
      </button>
    </nav>
  );
}
