"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { CreditCardIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Card } from "@/lib/Card";
import { useToast } from "@/components/ToastProvider";

export default function CardsPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardRequestStatus, setCardRequestStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [refreshing, setRefreshing] = useState(false);

  const refreshCards = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setRefreshing(true);
    try {
      const q = query(collection(db, `users/${user.uid}/cards`));
      const snap = await getDocs(q);
      const fetchedCards: Card[] = [];
      snap.forEach((doc) => {
        fetchedCards.push({ id: doc.id, ...doc.data() } as Card);
      });
      setCards(fetchedCards);
      toast.success("Cards refreshed");
    } catch (err) {
      console.error("Refresh error:", err);
      toast.error("Failed to refresh cards");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cardsUnsub: (() => void) | null = null;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      try {
        const reqQ = query(
          collection(db, "cardRequests"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1),
        );
        
        const requestUnsub = onSnapshot(reqQ, (snap) => {
          console.log("Card requests update in My Cards, size:", snap.size);
          const nextStatus = (() => {
            if (snap.empty) return "none" as const;
            const s = String((snap.docs[0]!.data() as any)?.status || "pending");
            console.log("Card request status in My Cards:", s);
            return s === "approved" || s === "rejected" ? (s as any) : ("pending" as const);
          })();
          
          setCardRequestStatus(nextStatus);
          
          if (nextStatus === "approved") {
            if (cardsUnsub) {
              console.log("Cards stream already active in My Cards");
              return;
            }
            const q = query(collection(db, `users/${user.uid}/cards`));
            console.log("Starting cards stream in My Cards for UID:", user.uid);
            cardsUnsub = onSnapshot(q, (snapshot) => {
              console.log("Cards update in My Cards, size:", snapshot.size);
              const fetchedCards: Card[] = [];
              snapshot.forEach((doc) => {
                fetchedCards.push({ id: doc.id, ...doc.data() } as Card);
              });
              setCards(fetchedCards);
              setLoading(false);
            }, (err) => {
              console.error("Cards stream error in My Cards - Code:", err.code, "Message:", err.message, "Path:", `users/${user.uid}/cards`);
              setLoading(false);
            });
          } else {
            if (cardsUnsub) {
              cardsUnsub();
              cardsUnsub = null;
            }
            setCards([]);
            setLoading(false);
          }
        }, (err) => {
          console.error("Card request status error in My Cards details:", {
            code: err.code,
            message: err.message,
            name: err.name
          });
          setLoading(false);
        });

        return () => {
          requestUnsub();
          if (cardsUnsub) cardsUnsub();
        };
      } catch (e) {
        console.error("Failed to load card request status:", e);
        setCardRequestStatus("none");
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

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
            onClick={refreshCards}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={() => router.push(cardRequestStatus === "none" ? "/apply-card" : "/track-card")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <CreditCardIcon className="w-4 h-4" />
            {cardRequestStatus === "approved" ? "Manage Virtual Card" : cardRequestStatus === "pending" ? "Track Request" : "Get Virtual Card"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cardRequestStatus !== "approved" && (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <CreditCardIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Virtual card not available</h3>
            <p className="text-gray-500 mb-6">
              {cardRequestStatus === "pending"
                ? "Your request is under review."
                : cardRequestStatus === "rejected"
                  ? "Your request was rejected."
                  : "Apply for a virtual card to access My Cards."}
            </p>
            <button
              type="button"
              onClick={() => router.push(cardRequestStatus === "none" ? "/apply-card" : "/track-card")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {cardRequestStatus === "pending" ? "Track Request" : cardRequestStatus === "rejected" ? "Re-Apply" : "Apply for Virtual Card"}
            </button>
          </div>
        )}

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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
