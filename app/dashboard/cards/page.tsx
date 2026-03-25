"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { CreditCardIcon, PlusIcon, TrashIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Card, CardNetwork } from "@/lib/Card";
import { useToast } from "@/components/ToastProvider";

export default function CardsPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardRequestStatus, setCardRequestStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({
    network: "VISA" as CardNetwork,
    number: "",
    holder: "",
    expires: "",
    cvv: "",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      await fetchCards(user.uid);
      try {
        const reqQ = query(
          collection(db, "cardRequests"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1),
        );
        const snap = await getDocs(reqQ);
        if (snap.empty) {
          setCardRequestStatus("none");
        } else {
          const s = String((snap.docs[0]!.data() as any)?.status || "pending");
          setCardRequestStatus(s === "approved" || s === "rejected" ? (s as any) : "pending");
        }
      } catch (e) {
        console.error("Failed to load card request status:", e);
        setCardRequestStatus("none");
      }
    });
    return () => unsub();
  }, [router]);

  const fetchCards = async (userId: string) => {
    try {
      const q = query(collection(db, `users/${userId}/cards`));
      const snapshot = await getDocs(q);
      const fetchedCards: Card[] = [];
      snapshot.forEach((doc) => {
        fetchedCards.push({ id: doc.id, ...doc.data() } as Card);
      });
      setCards(fetchedCards);
    } catch (error) {
      console.error("Error fetching cards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    try {
      const card = Card.builder()
        .setNetwork(newCard.network)
        .setNumber(newCard.number)
        .setHolder(newCard.holder)
        .setExpires(newCard.expires)
        .setCvv(newCard.cvv)
        .build();

      await addDoc(collection(db, `users/${user.uid}/cards`), card.toFirestore());
      setShowAddForm(false);
      setNewCard({
        network: "VISA" as CardNetwork,
        number: "",
        holder: "",
        expires: "",
        cvv: "",
      });
      fetchCards(user.uid);
      toast.success("Card added");
    } catch (error) {
      console.error("Error adding card:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add card.");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    
    if (!confirm("Are you sure you want to delete this card?")) return;

    try {
      await deleteDoc(doc(db, `users/${user.uid}/cards`, cardId));
      fetchCards(user.uid);
      toast.success("Card deleted");
    } catch (error) {
      console.error("Error deleting card:", error);
      toast.error("Failed to delete card.");
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
          <h1 className="text-2xl font-bold text-gray-900">My Cards</h1>
          <p className="text-sm text-gray-500">Manage your payment methods.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(cardRequestStatus === "none" ? "/apply-card" : "/track-card")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <CreditCardIcon className="w-4 h-4" />
            {cardRequestStatus === "approved" ? "Manage Virtual Card" : cardRequestStatus === "pending" ? "Track Request" : "Get Virtual Card"}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Add Existing
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div key={card.id} className={`relative group rounded-2xl p-6 text-white shadow-xl transition-transform hover:-translate-y-1 overflow-hidden ${
            card.network === 'VISA' ? 'bg-gradient-to-br from-blue-900 to-blue-800' : 
            card.network === 'MasterCard' ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 
            'bg-gradient-to-br from-indigo-900 to-purple-900'
          }`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            <div className="flex justify-between items-start mb-8 relative z-10">
              <span className="font-bold text-lg tracking-widest uppercase italic">{card.network}</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(card.number);
                    toast.success("Card number copied");
                  }}
                  className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  title="Copy Number"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => card.id && handleDeleteCard(card.id)}
                  className="p-1.5 bg-red-500/20 text-red-200 rounded-lg hover:bg-red-500/40 transition-colors"
                  title="Delete Card"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-7 bg-yellow-400/80 rounded-md shadow-sm"></div>
                <div className="w-6 h-7 border border-white/20 rounded-md"></div>
              </div>
            </div>

            <div className="mb-6 relative z-10">
              <p className="font-mono text-xl tracking-wider drop-shadow-md">{card.number}</p>
            </div>

            <div className="flex justify-between items-end relative z-10">
              <div>
                <p className="text-[10px] uppercase opacity-70 tracking-wider mb-0.5">Card Holder</p>
                <p className="font-medium text-sm uppercase tracking-wide">{card.holder}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase opacity-70 tracking-wider mb-0.5">Expires</p>
                <p className="font-medium text-sm tracking-wide">{card.expires}</p>
              </div>
            </div>
          </div>
        ))}
        
        {cards.length === 0 && (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <CreditCardIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No cards added</h3>
            <p className="text-gray-500 mb-6">
              Add a virtual or existing card to manage your payments and track activity.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => router.push(cardRequestStatus === "none" ? "/apply-card" : "/track-card")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Get Virtual Card
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
              >
                Add your first card
              </button>
            </div>
          </div>
        )}
      </div>
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add New Card</h2>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Network</label>
                <select
                  value={newCard.network}
                  onChange={(e) => setNewCard({ ...newCard, network: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="VISA">VISA</option>
                  <option value="MasterCard">MasterCard</option>
                  <option value="Amex">Amex</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                <input
                  type="text"
                  required
                  placeholder="**** **** **** ****"
                  value={newCard.number}
                  onChange={(e) => setNewCard({ ...newCard, number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Holder</label>
                <input
                  type="text"
                  required
                  placeholder="JOHN DOE"
                  value={newCard.holder}
                  onChange={(e) => setNewCard({ ...newCard, holder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    required
                    placeholder="MM/YY"
                    value={newCard.expires}
                    onChange={(e) => setNewCard({ ...newCard, expires: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
                  <input
                    type="password"
                    required
                    placeholder="123"
                    value={newCard.cvv}
                    onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
