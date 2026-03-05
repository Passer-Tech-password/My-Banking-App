"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useToast } from "@/components/ToastProvider";
import { MagnifyingGlassIcon, TrashIcon, PlusIcon, UserGroupIcon } from "@heroicons/react/24/outline";

type Contact = {
  id: string;
  userId: string;
  recipientId: string;
  email: string;
  name: string;
  createdAt?: any;
  updatedAt?: any;
};

export default function ContactsPage() {
  const router = useRouter();
  const toast = useToast();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthChecking(false);
        router.push("/login");
        return;
      }
      setAuthChecking(false);
      fetchContacts(user.uid);
    });
    return () => unsub();
  }, [router]);

  const fetchContacts = async (uid: string) => {
    try {
      setLoading(true);
      const q = query(
        collection(db, `users/${uid}/contacts`),
        orderBy("updatedAt", "desc"),
        limit(200),
      );
      const snap = await getDocs(q);
      const rows: Contact[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) } as Contact));
      setContacts(rows);
    } catch (e) {
      console.error("Failed to load contacts:", e);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter((c) => c.email.toLowerCase().includes(term) || c.name.toLowerCase().includes(term));
  }, [contacts, search]);

  const addContact = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;
    try {
      const q = query(collection(db, "publicUsers"), where("email", "==", normalized), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast.error("User not found");
        return;
      }
      const match = snap.docs[0];
      const recipientId = match.id;
      const displayName = (match.data() as any)?.name || normalized;

      await setDoc(
        doc(db, `users/${user.uid}/contacts/${recipientId}`),
        {
          userId: user.uid,
          recipientId,
          email: normalized,
          name: displayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      toast.success("Contact saved");
      setAddOpen(false);
      setEmail("");
      fetchContacts(user.uid);
    } catch (e) {
      console.error("Failed to save contact:", e);
      toast.error("Failed to save contact");
    }
  };

  const removeContact = async (contactId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/contacts/${contactId}`));
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      toast.success("Contact removed");
    } catch (e) {
      console.error("Failed to remove contact:", e);
      toast.error("Failed to remove contact");
    }
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500">Save recipients for faster transfers.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-sm">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {loading && <div className="text-sm text-gray-500">Loading...</div>}
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mx-auto mb-3">
              <UserGroupIcon className="w-6 h-6" />
            </div>
            No contacts yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((c) => (
              <div key={c.id} className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-sm text-gray-500 truncate">{c.email}</p>
                </div>
                <button
                  onClick={() => removeContact(c.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  aria-label="Remove"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Add Contact</h3>
              <button onClick={() => setAddOpen(false)} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <label className="block text-sm font-medium text-gray-700">Recipient Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="friend@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setAddOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={addContact}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

