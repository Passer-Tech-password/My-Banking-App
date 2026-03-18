"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { UserCircleIcon, PencilIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/components/ToastProvider";
import ImageUpload from "@/components/ImageUpload";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    displayName: "",
    email: "",
    phone: "",
    address: "",
    image: "",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setFormData((prev) => ({ ...prev, email: user.email || "" }));

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        setFormData((prev) => ({
          ...prev,
          displayName: data.displayName || user.displayName || "",
          phone: data.phone || "",
          address: data.address || "",
          image: data.image || user.photoURL || "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, displayName: user.displayName || "", image: user.photoURL || "" }));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true);
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      const patch: Record<string, unknown> = {
        displayName: formData.displayName,
        phone: formData.phone,
        address: formData.address,
        image: formData.image,
        updatedAt: serverTimestamp(),
      };

      if (!snap.exists()) {
        patch.email = user.email ?? "";
        patch.role = "user";
        patch.blocked = false;
        patch.createdAt = serverTimestamp();
      }

      await setDoc(userRef, patch, { merge: true });

      if (user.displayName !== formData.displayName || user.photoURL !== formData.image) {
        await updateProfile(user, { 
          displayName: formData.displayName,
          photoURL: formData.image 
        });
      }

      setEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">Manage your personal information.</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <CheckIcon className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-6 mb-8">
            <div className="flex-shrink-0">
              {editing ? (
                <ImageUpload
                  value={formData.image}
                  onChange={(src) => setFormData({ ...formData, image: src })}
                />
              ) : (
                <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center text-blue-600 border-2 border-gray-100">
                  {formData.image ? (
                    <img src={formData.image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-12 h-12" />
                  )}
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{formData.displayName || "User"}</h2>
              <p className="text-gray-500">{formData.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Display Name</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">{formData.displayName || "Not set"}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <p className="text-gray-900 font-medium py-2 bg-gray-50 px-3 rounded-lg border border-transparent">
                {formData.email}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Phone Number</label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+1 (555) 000-0000"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">{formData.phone || "Not set"}</p>
              )}
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">Address</label>
              {editing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123 Main St, City, Country"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2 whitespace-pre-line">{formData.address || "Not set"}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
