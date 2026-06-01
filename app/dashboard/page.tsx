"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  limit,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Transaction } from "@/lib/Transaction";
import { Card } from "@/lib/Card";
import { useToast } from "@/components/ToastProvider";
import { toErrorInfo } from "@/lib/errorInfo";
import { getDefaultAvatarUrl } from "@/lib/config";
import { 
  PlusIcon, 
  MinusIcon, 
  ArrowUpRightIcon, 
  UserCircleIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";

export default function DashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [income, setIncome] = useState(0);
  const [expense, setExpense] = useState(0);
  const [mainCard, setMainCard] = useState<Card | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [recentContacts, setRecentContacts] = useState<string[]>([]);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [depositValue, setDepositValue] = useState("");
  const [withdrawValue, setWithdrawValue] = useState("");
  const [depositMethod, setDepositMethod] = useState("Bank Transfer");
  const [withdrawMethod, setWithdrawMethod] = useState("Bank Transfer");
  const [depositNote, setDepositNote] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");
  const [depositRoutingNumber, setDepositRoutingNumber] = useState("");
  const [depositNarration, setDepositNarration] = useState("");
  const [depositBankName, setDepositBankName] = useState("");
  const [withdrawRoutingNumber, setWithdrawRoutingNumber] = useState("");
  const [withdrawNarration, setWithdrawNarration] = useState("");
  const [withdrawBankName, setWithdrawBankName] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState<number>(0);
  const [monthExpense, setMonthExpense] = useState<number>(0);
  const [dailyTransferLimit, setDailyTransferLimit] = useState<number>(0);
  const [savedContacts, setSavedContacts] = useState<Array<{ id: string; email: string; name: string }>>([]);
  const [userName, setUserName] = useState("");
  const [userImage, setUserImage] = useState("");
  const [cardRequestStatus, setCardRequestStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const transferWidgetRef = useRef<HTMLDivElement>(null);
  const [cardRequestId, setCardRequestId] = useState<string | null>(null);
  const [cardRequestLoading, setCardRequestLoading] = useState(false);
  const [cardRequestError, setCardRequestError] = useState<string | null>(null);
  const [refreshingCards, setRefreshingCards] = useState(false);

  const sendEmail = async (type: string, amount: number, status: string, referenceId: string) => {
    if (!auth.currentUser?.email) return;
    try {
      await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: auth.currentUser?.email,
          userName: userName || "User",
          type,
          amount,
          date: new Date().toISOString(),
          status,
          referenceId,
        }),
      });
    } catch (error) {
      console.error("Failed to send email:", error);
    }
  };

  // Auth check + load user data
  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");

    let isMounted = true;
    let txUnsub: null | (() => void) = null;
    let fallbackTxUnsub: null | (() => void) = null;
    let contactsUnsub: null | (() => void) = null;
    let userProfileUnsub: null | (() => void) = null;
    let cardRequestUnsub: null | (() => void) = null;
    let cardsUnsub: null | (() => void) = null;
    let backfillTimer: ReturnType<typeof setTimeout> | null = null;
    let backfillChain: Promise<void> = Promise.resolve();
    let lastBackfillDisplayName = "";
    let lastBackfillPhotoURL = "";
    
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 15000);

    const unsub = onAuthStateChanged(auth, async user => {
      if (!isMounted) return;
      
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        setUserId(user.uid);

        const userRef = doc(db, "users", user.uid);
        if (userProfileUnsub) {
          userProfileUnsub();
          userProfileUnsub = null;
        }
        const enqueueBackfill = (patch: { displayName?: string; photoURL?: string }) => {
          const nextDisplayName = String(patch.displayName || "");
          const nextPhotoURL = String(patch.photoURL || "");
          if (nextDisplayName === lastBackfillDisplayName && nextPhotoURL === lastBackfillPhotoURL) return;
          lastBackfillDisplayName = nextDisplayName;
          lastBackfillPhotoURL = nextPhotoURL;
          if (backfillTimer) clearTimeout(backfillTimer);
          backfillTimer = setTimeout(() => {
            backfillChain = backfillChain.then(async () => {
              try {
                await runTransaction(db, async (tx) => {
                  const current = await tx.get(userRef);
                  if (!current.exists()) return;
                  const data = current.data() as any;
                  const update: Record<string, unknown> = { updatedAt: serverTimestamp() };
                  let needsWrite = false;
                  if (patch.displayName && !String(data?.displayName || "").trim()) {
                    update.displayName = patch.displayName;
                    needsWrite = true;
                  }
                  if (patch.photoURL && !String(data?.photoURL || "").trim()) {
                    update.photoURL = patch.photoURL;
                    needsWrite = true;
                  }
                  if (needsWrite) {
                    tx.set(userRef, update, { merge: true });
                  }
                });
              } catch (e) {
                console.error("Failed to backfill photoURL:", e);
              }
            });
          }, 250);
        };
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          const displayName =
            String(user.displayName || "").trim() ||
            String(user.email || "").trim().split("@")[0] ||
            "User";
          const photoURL = String(user.photoURL || "").trim() || getDefaultAvatarUrl(displayName || user.email || "");
          await setDoc(userRef, {
            email: user.email ?? "",
            displayName,
            photoURL,
            balance: 0,
            role: "user",
            blocked: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          setBalance(snap.data()?.balance ?? 0);
          setMonthlyBudget(Number(snap.data()?.monthlyBudget || 0));
          setDailyTransferLimit(Number(snap.data()?.dailyTransferLimit || 0));
        }

        userProfileUnsub = onSnapshot(
          userRef,
          (profileSnap) => {
            const data = profileSnap.exists() ? (profileSnap.data() as any) : null;
            const computedName =
              (data?.firstName && data?.lastName ? `${data.firstName} ${data.lastName}` : "") ||
              String(data?.displayName || "").trim() ||
              String(user.displayName || "").trim() ||
              String(user.email || "").trim().split("@")[0] ||
              "User";

            const photoURLRaw =
              String(data?.photoURL || "").trim() ||
              String(data?.image || "").trim() ||
              String(user.photoURL || "").trim();
            const version = Number(data?.photoVersion || 0);
            const photoURLWithVersion =
              photoURLRaw && Number.isFinite(version) && version > 0
                ? `${photoURLRaw}${photoURLRaw.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(version))}`
                : photoURLRaw;
            const photoURL = photoURLWithVersion || getDefaultAvatarUrl(computedName || user.email || "");

            if (isMounted) {
              setUserName(computedName.split(" ")[0]);
              setUserImage(photoURL);
            }

            const needsPhotoURL = !String(data?.photoURL || "").trim();
            const needsDisplayName = !String(data?.displayName || "").trim();
            if (profileSnap.exists() && (needsPhotoURL || needsDisplayName)) {
              const patch: { displayName?: string; photoURL?: string } = {};
              if (needsDisplayName) patch.displayName = computedName;
              if (needsPhotoURL) patch.photoURL = photoURL;
              enqueueBackfill(patch);
            }
          },
          (e) => {
            console.error("User profile stream error:", e);
          },
        );

        if (cardRequestUnsub) {
          cardRequestUnsub();
          cardRequestUnsub = null;
        }
        if (cardsUnsub) {
          cardsUnsub();
          cardsUnsub = null;
        }
        setCardRequestError(null);
        setCardRequestStatus("none");
        setCardRequestId(null);
        const cardReqQ = query(
          collection(db, "cardRequests"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1),
        );
        cardRequestUnsub = onSnapshot(
          cardReqQ,
          (snap) => {
            console.log("Card requests update, empty:", snap.empty, "count:", snap.size);
            if (snap.empty) {
              setCardRequestStatus("none");
              setCardRequestId(null);
              if (cardsUnsub) {
                cardsUnsub();
                cardsUnsub = null;
              }
              setMainCard(null);
              return;
            }
            const row = snap.docs[0]!;
            const data = row.data() as any;
            const status = String(data?.status || "").trim();
            console.log("Card request data:", { id: row.id, status });
            if (status === "pending" || status === "approved" || status === "rejected") {
              setCardRequestStatus(status);
            } else {
              setCardRequestStatus("none");
            }
            setCardRequestId(row.id);

            if (status !== "approved") {
              if (cardsUnsub) {
                cardsUnsub();
                cardsUnsub = null;
              }
              setMainCard(null);
              return;
            }

            if (cardsUnsub) {
              console.log("Cards stream already active, skipping setup");
              return;
            }
            const cardsPath = `users/${user.uid}/cards`;
            console.log("Starting cards stream for path:", cardsPath, "Auth UID:", user.uid);
            const cardsQ = query(
              collection(db, cardsPath),
              limit(1),
            );
            cardsUnsub = onSnapshot(
              cardsQ,
              (cardsSnap) => {
                console.log("Cards stream update, count:", cardsSnap.size, "path:", cardsPath);
                if (cardsSnap.empty) {
                  console.log("Cards stream is empty for user:", user.uid);
                  setMainCard(null);
                  return;
                }
                const d = cardsSnap.docs[0]!;
                const cardData = { id: d.id, ...(d.data() as any) } as Card;
                console.log("Setting main card:", cardData.id, "Number:", cardData.number?.slice(-4));
                setMainCard(cardData);
              },
              (e) => {
                console.error("Cards stream error for path:", cardsPath, "Error code:", e.code, "Message:", e.message);
                setMainCard(null);
                if (cardsUnsub) {
                  cardsUnsub();
                  cardsUnsub = null;
                }
              },
            );
          },
          (e) => {
            console.error("cardRequests stream error details:", {
              code: e.code,
              message: e.message,
              name: e.name
            });
            setCardRequestError("Failed to load card request status.");
          },
        );

        const publicRef = doc(db, "publicUsers", user.uid);
        try {
          const snapData = snap.exists() ? (snap.data() as any) : null;
          const publicName =
            (snapData?.firstName && snapData?.lastName ? `${snapData.firstName} ${snapData.lastName}` : "") ||
            String(snapData?.displayName || "").trim() ||
            String(user.displayName || "").trim() ||
            String(user.email || "").trim().split("@")[0] ||
            "User";
          const publicPhotoURLRaw =
            String(snapData?.photoURL || "").trim() ||
            String(snapData?.image || "").trim() ||
            String(user.photoURL || "").trim();
          const publicPhotoURL = publicPhotoURLRaw || getDefaultAvatarUrl(publicName || user.email || "");
          await setDoc(
            publicRef,
            {
              email: user.email ?? "",
              name: publicName,
              photoURL: publicPhotoURL,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        } catch (e) {
          console.error("publicUsers sync failed:", e);
        }

        if (txUnsub) txUnsub();
        if (fallbackTxUnsub) fallbackTxUnsub();
        const txQuery = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid),
          orderBy("date", "desc"),
          limit(20),
        );

        if (contactsUnsub) contactsUnsub();
        const contactsQuery = query(
          collection(db, `users/${user.uid}/contacts`),
          orderBy("updatedAt", "desc"),
          limit(5),
        );
        contactsUnsub = onSnapshot(
          contactsQuery,
          (snap) => {
            const rows: Array<{ id: string; email: string; name: string }> = [];
            snap.forEach((d) => {
              const data = d.data() as any;
              rows.push({ id: d.id, email: data.email || "", name: data.name || data.email || "" });
            });
            if (isMounted) setSavedContacts(rows);
          },
          (e) => {
            console.error("Contacts stream error:", e);
          },
        );

        txUnsub = onSnapshot(
          txQuery,
          (querySnap) => {
            const txs: Transaction[] = [];
            let inc = 0;
            let exp = 0;
            let expMonth = 0;
            const contactsSet = new Set<string>();

            querySnap.forEach((docSnap) => {
              const data = docSnap.data();
              const tx = { id: docSnap.id, ...data } as Transaction;
              txs.push(tx);

              if (
                tx.status === "completed" &&
                (tx.type === "deposit" || (tx.type === "transfer" && tx.direction === "incoming"))
              ) {
                inc += tx.amount;
              } else if (
                tx.status === "completed" &&
                (tx.type === "withdrawal" || (tx.type === "transfer" && tx.direction === "outgoing"))
              ) {
                exp += tx.amount;
                if (tx.receiverName) contactsSet.add(tx.receiverName);
              }

              // Monthly expense (current month)
              if (tx.status === "completed") {
                const d = new Date(tx.date);
                const now = new Date();
                if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
                  if (tx.type === "withdrawal" || (tx.type === "transfer" && tx.direction === "outgoing")) {
                    expMonth += tx.amount;
                  }
                }
              }
            });

            if (isMounted) {
              setTransactions(txs);
              setIncome(inc);
              setExpense(exp);
              setMonthExpense(expMonth);
              setRecentContacts(Array.from(contactsSet).slice(0, 5));
            }
          },
          (error) => {
            if (!isMounted) return;
            const info = toErrorInfo(error);
            console.error("Dashboard transactions stream error:", info);

            const code = info.code || "unknown";
            if (code === "failed-precondition" || info.message.toLowerCase().includes("requires an index")) {
              if (txUnsub) {
                txUnsub();
                txUnsub = null;
              }
              if (!isMounted) return;
              const fallbackQuery = query(
                collection(db, "transactions"),
                where("userId", "==", user.uid),
                limit(20),
              );
              fallbackTxUnsub = onSnapshot(
                fallbackQuery,
                (fallbackSnap) => {
                  const txs: Transaction[] = [];
                  fallbackSnap.forEach((docSnap) => {
                    const data = docSnap.data();
                    txs.push({ id: docSnap.id, ...data } as Transaction);
                  });
                  txs.sort((a: any, b: any) => String(b?.date || "").localeCompare(String(a?.date || "")));
                  if (isMounted) setTransactions(txs);
                },
                (fallbackError) => {
                  if (!isMounted) return;
                  const fallbackInfo = toErrorInfo(fallbackError);
                  console.error("Dashboard transactions fallback stream error:", fallbackInfo);
                  toast.error(`Failed to load live transactions (${fallbackInfo.code || "unknown"}).`);
                },
              );
              toast.error("Missing Firestore index for transactions. Deploy Firestore indexes.");
              return;
            }

            toast.error(`Failed to load live transactions (${code}).`);
          },
        );

      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        if (isMounted) setLoading(false);
        clearTimeout(safetyTimer);
      }
    });

    return () => {
      isMounted = false;
      if (txUnsub) txUnsub();
      if (fallbackTxUnsub) fallbackTxUnsub();
      if (contactsUnsub) contactsUnsub();
      if (userProfileUnsub) userProfileUnsub();
      if (cardRequestUnsub) cardRequestUnsub();
      if (cardsUnsub) cardsUnsub();
      if (backfillTimer) clearTimeout(backfillTimer);
      clearTimeout(safetyTimer);
      unsub();
    };
  }, [router]);

  const scrollToTransfer = () => {
    console.log("scrollToTransfer called, ref state:", transferWidgetRef.current ? "exists" : "null");
    if (transferWidgetRef.current) {
      transferWidgetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      const el = document.getElementById("transfer-widget");
      console.log("Fallback search for transfer-widget:", el ? "found" : "not found");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        toast.error("Transfer section not found. Please scroll down.");
      }
    }
  };

  const applyForVirtualCard = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("You must be signed in.");
      return;
    }
    if (cardRequestStatus === "pending") {
      toast.info("You already have a pending card request.");
      return;
    }
    try {
      setCardRequestLoading(true);
      setCardRequestError(null);
      const email = String(user.email || "").trim().toLowerCase();
      if (!email) {
        toast.error("Your account has no email.");
        return;
      }
      const existingPendingQ = query(
        collection(db, "cardRequests"),
        where("userId", "==", user.uid),
        where("status", "==", "pending"),
        limit(1),
      );
      const existingPendingSnap = await getDocs(existingPendingQ);
      if (!existingPendingSnap.empty) {
        setCardRequestStatus("pending");
        setCardRequestId(existingPendingSnap.docs[0]!.id);
        toast.info("You already have a pending card request.");
        return;
      }
      const ref = doc(collection(db, "cardRequests"));
      await setDoc(ref, {
        userId: user.uid,
        email,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setCardRequestStatus("pending");
      setCardRequestId(ref.id);
      toast.success("Virtual card request submitted.");
    } catch (e) {
      const info = toErrorInfo(e);
      console.error("Create card request failed:", info);
      setCardRequestError("Failed to submit card request.");
      toast.error(`Failed to submit card request (${info.code || "unknown"}).`);
    } finally {
      setCardRequestLoading(false);
    }
  };

  const saveTransaction = async (
    type: "deposit" | "withdrawal",
    amount: number
  ) => {
    if (!userId) return;

    try {
      const newTx = Transaction.builder()
        .setUserId(userId)
        .setType(type)
        .setAmount(amount)
        .setDate(new Date().toISOString())
        .setStatus("completed")
        .setDescription(`${type.charAt(0).toUpperCase() + type.slice(1)} via Dashboard`)
        .build();

      let createdTxId = "";
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error("User does not exist!");
        }

        const currentBalance = userDoc.data().balance || 0;
        let newBalance = currentBalance;
        
        if (type === "deposit") {
          newBalance += amount;
        } else {
          if (currentBalance < amount) {
             throw new Error("Insufficient funds for atomic transaction");
          }
          newBalance -= amount;
        }

        // Add transaction
        const newTxRef = doc(collection(db, "transactions"));
        createdTxId = newTxRef.id;
        transaction.set(newTxRef, newTx.toFirestore());

        // Update user balance
        transaction.update(userRef, { balance: newBalance });
      });

      // Update local state
      setBalance(prev => {
        if (type === "deposit") return prev + amount;
        return prev - amount;
      });
      setTransactions(prev => [{ ...(newTx as any), id: createdTxId } as Transaction, ...prev]);

      if (type === "deposit") {
        setIncome(prev => prev + amount);
      } else {
        setExpense(prev => prev + amount);
      }

      // Send email notification (only for successful atomic transactions here, mainly instant ones if any)
      // Note: Deposit is usually a request, so we might want to email on request creation instead?
      // But this function saveTransaction is for "completed" transactions mainly? 
      // Actually saveTransaction sets status to "completed" immediately for deposit/withdraw in the original code,
      // but we changed deposit/withdraw to be requests.
      // So this function might only be used for legacy or instant ops.
      // Let's add email here just in case.
      if (type === "deposit" || type === "withdrawal") {
        if (createdTxId) {
          sendEmail(type, amount, "completed", createdTxId);
        }
      }

    } catch (e) {
      console.error("Transaction failed:", e);
      toast.error("Transaction failed: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  const handleQuickTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !recipientEmail || !transferAmount) return;

    try {
      setTransferLoading(true);
      const amount = parseFloat(transferAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      if (amount > balance) throw new Error("Insufficient funds");

      if (dailyTransferLimit > 0) {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const dayQuery = query(
          collection(db, "transactions"),
          where("userId", "==", userId),
          where("type", "==", "transfer"),
          where("direction", "==", "outgoing"),
          where("status", "==", "completed"),
          where("date", ">=", start.toISOString()),
          where("date", "<", end.toISOString()),
          orderBy("date", "desc"),
          limit(200),
        );
        const daySnap = await getDocs(dayQuery);
        let spent = 0;
        daySnap.forEach((d) => {
          spent += Number(d.data()?.amount || 0);
        });
        if (spent + amount > dailyTransferLimit) {
          throw new Error(`Daily transfer limit exceeded ($${dailyTransferLimit.toFixed(2)})`);
        }
      }

      // Find recipient
      const usersQ = query(collection(db, "publicUsers"), where("email", "==", recipientEmail), limit(1));
      const usersSnap = await getDocs(usersQ);
      
      if (usersSnap.empty) {
        toast.error("User not found");
        return;
      }

      const recipientDoc = usersSnap.docs[0];
      const recipientId = recipientDoc.id;
      const recipientName = (recipientDoc.data() as any)?.name || recipientEmail;

      if (recipientId === userId) {
        toast.error("Cannot transfer to yourself");
        return;
      }

      let senderTxId = "";
      await runTransaction(db, async (transaction) => {
        const senderRef = doc(db, "users", userId);
        const receiverRef = doc(db, "users", recipientId);
        
        const senderDoc = await transaction.get(senderRef);
        const receiverDoc = await transaction.get(receiverRef);

        if (!senderDoc.exists() || !receiverDoc.exists()) throw new Error("User error");

        const senderBalance = senderDoc.data().balance || 0;
        const receiverBalance = receiverDoc.data().balance || 0;

        if (senderBalance < amount) throw new Error("Insufficient funds");

        transaction.update(senderRef, { balance: senderBalance - amount });
        transaction.update(receiverRef, { balance: receiverBalance + amount });

        // Create sender transaction
        const senderTxRef = doc(collection(db, "transactions"));
        senderTxId = senderTxRef.id;
        transaction.set(senderTxRef, {
          userId: userId,
          type: "transfer",
          direction: "outgoing",
          amount: amount,
          date: new Date().toISOString(),
          status: "completed",
          description: `Transfer to ${recipientEmail}`,
          receiverName: recipientEmail, // using email as name for simplicity
        });

        // Create receiver transaction
        const receiverTxRef = doc(collection(db, "transactions"));
        transaction.set(receiverTxRef, {
          userId: recipientId,
          type: "transfer",
          direction: "incoming",
          amount: amount,
          date: new Date().toISOString(),
          status: "completed",
          description: `Transfer from ${auth.currentUser?.email}`,
          senderName: auth.currentUser?.email,
        });
      });

      // Update local state
      setBalance(prev => prev - amount);
      setExpense(prev => prev + amount);
      // Add to transactions list
      setTransactions(prev => [{
          id: senderTxId || ("temp-" + Date.now()),
          userId,
          type: "transfer",
          direction: "outgoing",
          amount,
          date: new Date().toISOString(),
          status: "completed",
          description: `Transfer to ${recipientEmail}`,
      } as Transaction, ...prev]);

      setRecipientEmail("");
      setTransferAmount("");
      toast.success("Transfer successful!");
      
      // Send email notification
      if (senderTxId) {
        sendEmail("transfer (outgoing)", amount, "completed", senderTxId);
      }

      try {
        await setDoc(
          doc(db, `users/${userId}/contacts/${recipientId}`),
          {
            userId,
            recipientId,
            email: recipientEmail.toLowerCase(),
            name: recipientName,
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch (e) {
        console.error("Contact upsert failed:", e);
      }

    } catch (error) {
      console.error("Transfer error:", error);
      toast.error(error instanceof Error ? error.message : "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  const refreshCards = async () => {
    if (!userId) return;
    setRefreshingCards(true);
    try {
      const q = query(collection(db, `users/${userId}/cards`), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0]!;
        setMainCard({ id: d.id, ...(d.data() as any) } as Card);
        toast.success("Cards refreshed");
      } else {
        setMainCard(null);
        toast.info("No cards found");
      }
    } catch (e) {
      console.error("Manual cards refresh error:", e);
      toast.error("Failed to refresh cards");
    } finally {
      setRefreshingCards(false);
    }
  };

  const deposit = async () => {
    const amount = parseFloat(depositValue);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid deposit amount");
      return;
    }
    if (!userId) return;
    try {
      const reqRef = doc(collection(db, "fundingRequests"));
      await setDoc(reqRef, {
        userId,
        type: "deposit",
        amount,
        status: "pending",
        method: depositMethod,
        note: depositNote,
        routingNumber: depositRoutingNumber,
        narration: depositNarration,
        bankName: depositBankName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setDepositOpen(false);
      setDepositValue("");
      setDepositNote("");
      setDepositRoutingNumber("");
      setDepositNarration("");
      setDepositBankName("");
      toast.info("Your deposit has been successfully processed. Just wait for the admin approval.");
      
      // Email for deposit request
      sendEmail("deposit", amount, "pending", reqRef.id);
    } catch (e) {
      console.error("Deposit request failed:", e);
      toast.error("Deposit request failed");
    }
  };

  const withdraw = async () => {
    const amount = parseFloat(withdrawValue);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid withdrawal amount");
      return;
    }
    if (!userId) return;
    try {
      let withdrawalTxId = "";
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", userId);
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error("User does not exist!");

        const currentBalance = userDoc.data().balance || 0;
        if (currentBalance < amount) throw new Error("Insufficient funds");

        transaction.update(userRef, { balance: currentBalance - amount });

        const txRef = doc(collection(db, "transactions"));
        withdrawalTxId = txRef.id;

        // Use the Transaction builder for consistency
        const txData = Transaction.builder()
          .setUserId(userId)
          .setType("withdrawal")
          .setAmount(amount)
          .setDirection("outgoing")
          .setStatus("completed")
          .setDescription("Withdrawal completed")
          .setDate(new Date().toISOString())
          .build();

        transaction.set(txRef, txData.toFirestore());

        const reqRef = doc(collection(db, "fundingRequests"));
        transaction.set(reqRef, {
          userId,
          type: "withdrawal",
          amount,
          status: "approved",
          txId: txRef.id,
          method: withdrawMethod,
          note: withdrawNote,
          routingNumber: withdrawRoutingNumber,
          narration: withdrawNarration,
          bankName: withdrawBankName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          approvedAt: serverTimestamp(),
        });
      });

      setBalance((prev) => prev - amount);
      setWithdrawOpen(false);
      setWithdrawValue("");
      setWithdrawNote("");
      setWithdrawRoutingNumber("");
      setWithdrawNarration("");
      setWithdrawBankName("");
      toast.success("Your withdrawal has been successfully completed.");

      // Send email for completed request
      if (withdrawalTxId) {
        sendEmail("withdrawal", amount, "completed", withdrawalTxId);
      }
    } catch (e) {
      console.error("Withdrawal request failed:", e);
      toast.error(e instanceof Error ? e.message : "Withdrawal request failed");
    }
  };

  const exportStatement = () => {
    if (transactions.length === 0) {
      toast.info("No transactions to export");
      return;
    }
    const headers = ["Date", "Description", "Type", "Amount", "Status", "Reference"];
    const sanitize = (str: any) => {
      if (!str && str !== 0) return '""';
      return `"${String(str).replace(/"/g, '""').replace(/^([=+\-@\t\r])/, "'$1")}"`;
    };
    const rows = transactions.map((tx) => [
      sanitize(new Date(tx.date).toLocaleDateString()),
      sanitize(tx.description),
      sanitize(tx.type),
      tx.amount.toFixed(2),
      sanitize(tx.status),
      sanitize(tx.id),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "statement.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {userImage ? (
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-100">
              <img src={userImage} alt="Profile" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              {userName ? userName.charAt(0).toUpperCase() : <UserCircleIcon className="w-8 h-8" />}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500">{greeting || "Welcome back"}, {userName || "User"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setDepositOpen(true)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4 text-green-600" />
            Deposit
          </button>
          <button 
            onClick={() => setWithdrawOpen(true)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <MinusIcon className="w-4 h-4 text-red-600" />
            Withdraw
          </button>
          <button
            onClick={() => router.push(cardRequestStatus === "none" ? "/apply-card" : "/track-card")}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {cardRequestStatus === "approved"
              ? "Manage Virtual Card"
              : cardRequestStatus === "pending"
                ? "Track Virtual Card"
                : "Get Virtual Card"}
          </button>
          <button 
            onClick={scrollToTransfer}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <ArrowUpRightIcon className="w-4 h-4" />
            New Transfer
          </button>
        </div>
      </div>

      {cardRequestError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {cardRequestError}
        </div>
      )}

      {cardRequestStatus === "rejected" && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          Your virtual card request was rejected.
        </div>
      )}

      {cardRequestStatus === "pending" && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          Your virtual card request is under review{cardRequestId ? ` (ID: ${cardRequestId.slice(0, 8)}…)` : ""}.
        </div>
      )}

      {cardRequestStatus === "approved" && !mainCard && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          Your virtual card request is approved. Your card is being provisioned and will appear in My Cards shortly.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">Virtual Card Policy & Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="text-sm font-semibold text-gray-900">Policy</div>
            <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1 mt-2">
              <li>Issued only after admin approval.</li>
              <li>Never share card details or OTP codes.</li>
              <li>Report suspicious activity immediately.</li>
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="text-sm font-semibold text-gray-900">Usage</div>
            <p className="text-sm text-gray-600 mt-2">
              Use your virtual card for online payments and subscriptions. Verify merchant URLs before paying.
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <div className="text-sm font-semibold text-gray-900">Verification</div>
            <p className="text-sm text-gray-600 mt-2">
              Apply via Get Virtual Card. Status updates in real-time on your dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Balance & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Balance Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            
            {/* User Image Overlay in Top Right */}
            {userImage && (
              <div className="absolute top-4 right-4 w-32 h-32 opacity-20 pointer-events-none">
                <img 
                  src={userImage} 
                  alt="" 
                  className="w-full h-full object-cover rounded-xl mask-image-gradient"
                  style={{ maskImage: 'linear-gradient(to bottom left, black, transparent)' }}
                />
              </div>
            )}

            <div className="relative z-10">
              <p className="text-blue-100 text-sm font-medium mb-1">Total Balance</p>
              <h2 className="text-4xl font-bold mb-6">
                ${(balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h2>
              
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-blue-200 text-xs mb-1">Income</p>
                  <p className="font-semibold text-lg flex items-center gap-1">
                    <ArrowUpRightIcon className="w-4 h-4 text-green-300" />
                    ${income.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-blue-200 text-xs mb-1">Expenses</p>
                  <p className="font-semibold text-lg flex items-center gap-1">
                    <ArrowUpRightIcon className="w-4 h-4 text-red-300 rotate-90" />
                    ${expense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-blue-500/30">
                <div className="flex justify-between items-center text-xs text-blue-200 mb-2">
                  <span>Monthly Budget</span>
                  <span>
                    {monthlyBudget > 0 ? Math.min(Math.round((monthExpense / monthlyBudget) * 100), 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-blue-900/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-300 rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${
                        monthlyBudget > 0 ? Math.min((monthExpense / monthlyBudget) * 100, 100) : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button 
              onClick={() => setDepositOpen(true)}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 group-hover:bg-green-100 transition-colors">
                <PlusIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">Deposit</span>
            </button>
            
            <button 
              onClick={() => setWithdrawOpen(true)}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-600 group-hover:bg-red-100 transition-colors">
                <MinusIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">Withdraw</span>
            </button>
            
            <button 
              onClick={scrollToTransfer}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                <ArrowUpRightIcon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-700">Transfer</span>
            </button>
             <Link href="/dashboard/requests" className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center justify-center gap-2 group">
              <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center text-purple-600">
                <span className="font-bold text-lg">...</span>
              </div>
              <span className="text-sm font-medium text-gray-700">More</span>
            </Link>
          </div>

          {depositOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">Make a Deposit</h3>
                  <button onClick={() => setDepositOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={depositValue}
                      onChange={(e) => setDepositValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Bank Transfer</option>
                      <option>Wire Transfer</option>
                      <option>Mobile Money</option>
                      <option>Crypto</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={depositBankName}
                        onChange={(e) => setDepositBankName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Routine number</label>
                      <input
                        type="text"
                        value={depositRoutingNumber}
                        onChange={(e) => setDepositRoutingNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter routine number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Narration</label>
                    <input
                      type="text"
                      value={depositNarration}
                      onChange={(e) => setDepositNarration(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter narration"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea
                      value={depositNote}
                      onChange={(e) => setDepositNote(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Reference number, etc."
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setDepositOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={deposit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Submit Deposit</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {withdrawOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">Withdraw Funds</h3>
                  <button onClick={() => setWithdrawOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={withdrawValue}
                      onChange={(e) => setWithdrawValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Method</label>
                    <select
                      value={withdrawMethod}
                      onChange={(e) => setWithdrawMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Bank Transfer</option>
                      <option>Wire Transfer</option>
                      <option>Mobile Money</option>
                      <option>Crypto</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={withdrawBankName}
                        onChange={(e) => setWithdrawBankName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Routine number</label>
                      <input
                        type="text"
                        value={withdrawRoutingNumber}
                        onChange={(e) => setWithdrawRoutingNumber(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter routine number"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Narration</label>
                    <input
                      type="text"
                      value={withdrawNarration}
                      onChange={(e) => setWithdrawNarration(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter narration"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Details / Notes</label>
                    <textarea
                      value={withdrawNote}
                      onChange={(e) => setWithdrawNote(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      placeholder="Account number, bank name, etc."
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setWithdrawOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={withdraw} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Submit Withdrawal</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Recent Transactions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Transactions</h3>
              <Link href="/dashboard/transactions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                  <tr>
                    <th className="px-4 sm:px-6 py-4">Transaction</th>
                    <th className="px-4 sm:px-6 py-4">Date</th>
                    <th className="px-4 sm:px-6 py-4">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 sm:px-6 py-4 font-medium text-gray-900">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              ["deposit", "credit"].includes(tx.type) ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                            }`}>
                              {["deposit", "credit"].includes(tx.type) ? <PlusIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
                            </div>
                            <span className="truncate">{tx.description || tx.type}</span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">{tx.date}</td>
                        <td className="px-4 sm:px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            tx.status === "completed" ? "bg-green-100 text-green-800" : 
                            tx.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                          }`}>
                            {tx.status || "Completed"}
                          </span>
                        </td>
                        <td className={`px-4 sm:px-6 py-4 text-right font-semibold whitespace-nowrap ${
                          ["deposit", "credit"].includes(tx.type) ? "text-green-600" : "text-gray-900"
                        }`}>
                          {["deposit", "credit"].includes(tx.type) ? "+" : "-"}${tx.amount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column: Cards & Promos */}
        <div className="space-y-6">
          {/* My Cards Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">My Cards</h3>
              <div className="flex gap-3 items-center">
                <button 
                  onClick={refreshCards}
                  disabled={refreshingCards}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                  title="Refresh card data"
                >
                  <svg className={`w-3.5 h-3.5 ${refreshingCards ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {refreshingCards ? '...' : 'Refresh'}
                </button>
                <Link
                  href="/dashboard/cards"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Manage Cards
                </Link>
              </div>
            </div>
            
            {mainCard ? (
              <>
                <div className={`rounded-2xl p-6 text-white shadow-xl mb-4 relative overflow-hidden ${
                  mainCard.network === 'VISA' ? 'bg-blue-900' : mainCard.network === 'MasterCard' ? 'bg-slate-800' : 'bg-indigo-900'
                }`}>
                   <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                   <div className="flex justify-between items-start mb-8 relative z-10">
                     <span className="font-bold text-lg tracking-widest uppercase">{mainCard.network}</span>
                     <div className="w-8 h-5 bg-yellow-400/80 rounded-sm"></div>
                   </div>
                   <div className="mb-4 relative z-10">
                     <p className="text-xs opacity-70 mb-1">Card Number</p>
                     <p className="font-mono text-lg tracking-wider">{mainCard.number}</p>
                   </div>
                   <div className="flex justify-between items-end relative z-10">
                     <div>
                       <p className="text-xs opacity-70 mb-1">Card Holder</p>
                       <p className="font-medium text-sm uppercase">{mainCard.holder}</p>
                     </div>
                     <div>
                       <p className="text-xs opacity-70 mb-1">Expires</p>
                       <p className="font-medium text-sm">{mainCard.expires}</p>
                     </div>
                   </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Card Status</span>
                    <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Active</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-700 mb-1">
                  {cardRequestStatus === "pending"
                    ? "Your request is under review."
                    : cardRequestStatus === "rejected"
                      ? "Your request was rejected."
                      : cardRequestStatus === "approved"
                        ? "Your virtual card is being provisioned."
                        : "Apply for a virtual card to access My Cards."}
                </p>
                <Link
                  href={cardRequestStatus === "none" ? "/apply-card" : "/track-card"}
                  className="text-blue-600 font-medium"
                >
                  {cardRequestStatus === "none"
                    ? "Apply for Card"
                    : cardRequestStatus === "rejected"
                      ? "Re-Apply"
                      : "Track Request"}
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Activity Feed</h3>
              <Link href="/dashboard/transactions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View All
              </Link>
            </div>

            {transactions.length === 0 ? (
              <div className="text-sm text-gray-500">No activity yet.</div>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 6).map((tx, idx) => {
                  const isIncome =
                    tx.type === "deposit" ||
                    tx.type === "credit" ||
                    (tx.type === "transfer" && tx.direction === "incoming");
                  return (
                    <div key={tx.id || idx} className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          isIncome ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {isIncome ? <PlusIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {tx.description || tx.type}
                          </p>
                          <p className={`text-sm font-semibold ${isIncome ? "text-green-700" : "text-gray-900"}`}>
                            {isIncome ? "+" : "-"}${Math.abs(tx.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {tx.date ? new Date(tx.date).toLocaleString() : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Transfer Widget */}
           <div ref={transferWidgetRef} id="transfer-widget" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
             <h3 className="font-semibold text-gray-900 mb-4">Quick Transfer</h3>
             
             {savedContacts.length > 0 && (
               <div className="mb-4">
                 <div className="flex items-center justify-between mb-2">
                   <p className="text-xs font-medium text-gray-500">Saved</p>
                   <Link href="/dashboard/contacts" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                     Manage
                   </Link>
                 </div>
                 <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                   {savedContacts.map((c) => (
                     <button
                       key={c.id}
                       onClick={() => setRecipientEmail(c.email)}
                       type="button"
                       className="flex flex-col items-center gap-1 min-w-[50px] group"
                     >
                       <div
                         className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-110 ${
                           recipientEmail === c.email
                             ? "bg-blue-600 ring-2 ring-blue-200"
                             : "bg-gradient-to-br from-indigo-400 to-indigo-600"
                         }`}
                       >
                         <UserGroupIcon className="w-5 h-5" />
                       </div>
                       <span className="text-[10px] text-gray-600 truncate w-12 text-center">
                         {(c.name || c.email).split("@")[0]}
                       </span>
                     </button>
                   ))}
                 </div>
               </div>
             )}

             {/* Recent Contacts */}
             {recentContacts.length > 0 && (
               <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Recent</p>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                    {recentContacts.map((email) => (
                       <button 
                         key={email} 
                         onClick={() => setRecipientEmail(email)}
                         type="button"
                         className="flex flex-col items-center gap-1 min-w-[50px] group"
                       >
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-110 ${recipientEmail === email ? 'bg-blue-600 ring-2 ring-blue-200' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                           {email.charAt(0).toUpperCase()}
                         </div>
                         <span className="text-[10px] text-gray-600 truncate w-12 text-center">{email.split('@')[0]}</span>
                       </button>
                    ))}
                  </div>
               </div>
             )}

             <form onSubmit={handleQuickTransfer} className="space-y-4">
               <div>
                 <label className="text-xs font-medium text-gray-700 mb-1 block">Recipient Email</label>
                 <input
                   type="email"
                   required
                   placeholder="friend@example.com"
                   value={recipientEmail}
                   onChange={(e) => setRecipientEmail(e.target.value)}
                   className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                 />
               </div>
               
               <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                 <input 
                   type="number" 
                   required
                   min="1"
                   step="0.01"
                   placeholder="0.00"
                   value={transferAmount}
                   onChange={(e) => setTransferAmount(e.target.value)}
                   className="w-full pl-7 pr-4 py-3 bg-gray-50 border-none rounded-xl text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                 />
               </div>

               <button 
                 type="submit"
                 disabled={transferLoading || !recipientEmail || !transferAmount}
                 className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {transferLoading ? "Sending..." : "Send Money"}
               </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
}
