"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
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
      fetchCards(user.uid);
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

  const handleGenerateVirtualCard = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // Simple random generation for demo purposes
      const random4 = () => Math.floor(1000 + Math.random() * 9000).toString();
      const generatedNumber = `4${random4().substring(1)} ${random4()} ${random4()} ${random4()}`;
      const expMonth = Math.floor(1 + Math.random() * 12).toString().padStart(2, '0');
      const expYear = (new Date().getFullYear() + 2 + Math.floor(Math.random() * 3)).toString().slice(-2);
      
      const card = Card.builder()
        .setNetwork("VISA")
        .setNumber(generatedNumber)
        .setHolder((user.displayName || "AURORA USER").toUpperCase())
        .setExpires(`${expMonth}/${expYear}`)
        .setCvv(Math.floor(100 + Math.random() * 900).toString())
        .build();

      await addDoc(collection(db, `users/${user.uid}/cards`), card.toFirestore());
      fetchCards(user.uid);
      toast.success("Virtual card generated successfully");
    } catch (error) {
      console.error("Error generating card:", error);
      toast.error("Failed to generate virtual card.");
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
            onClick={handleGenerateVirtualCard}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <CreditCardIcon className="w-4 h-4" />
            Get Virtual Card
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
          <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <CreditCardIcon className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No cards linked to your account.</p>
            <button 
              onClick={handleGenerateVirtualCard}
              className="mt-4 text-blue-600 font-medium hover:underline text-sm"
            >
              Generate your first card
            </button>
          </div>
        )}
      </div>
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

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <CreditCardIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No cards added</h3>
          <p className="text-gray-500 mb-6">Add a credit or debit card to manage your payments.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Add your first card
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <div
              key={card.id}
              className="group relative bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all hover:shadow-md"
            >
              <button
                onClick={() => handleDeleteCard(card.id!)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon className="w-5 h-5" />
              </button>

              <div className={`rounded-2xl p-6 text-white shadow-lg relative overflow-hidden mb-4 ${
                card.network === 'VISA' ? 'bg-blue-900' : card.network === 'MasterCard' ? 'bg-slate-800' : 'bg-indigo-900'
              }`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl" />
                <div className="flex justify-between items-start mb-8 relative z-10">
                  <span className="font-bold text-lg tracking-widest uppercase">
                    {card.network}
                  </span>
                  <div className="w-8 h-5 bg-yellow-400/80 rounded-sm" />
                </div>
                <div className="space-y-4 relative z-10">
                  <div 
                    className="flex items-center gap-3 group/number cursor-pointer" 
                    onClick={() => navigator.clipboard.writeText(card.number)}
                    title="Click to copy"
                  >
                    <p className="font-mono text-xl tracking-widest">{card.number}</p>
                    <ClipboardDocumentIcon className="w-5 h-5 text-white/50 opacity-0 group-hover/number:opacity-100 transition-all" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs opacity-70 mb-1">Card Holder</p>
                      <p className="font-medium tracking-wide uppercase">{card.holder}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70 mb-1">Expires</p>
                      <p className="font-medium">{card.expires}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Status</span>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
