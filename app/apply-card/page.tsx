 "use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { useToast } from "@/components/ToastProvider";

export default function ApplyCardPage() {
  const router = useRouter();
  const toast = useToast();
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthChecking(false);
        router.push("/login");
        return;
      }
      try {
        setError(null);
        const existingQ = query(
          collection(db, "cardRequests"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(1),
        );
        const snap = await getDocs(existingQ);
        if (!snap.empty) {
          const d = snap.docs[0]!;
          const s = String((d.data() as any)?.status || "pending");
          setStatus(s === "approved" || s === "rejected" ? (s as any) : "pending");
          setRequestId(d.id);
        } else {
          setStatus("none");
          setRequestId(null);
        }
      } catch (e) {
        console.error(\"Check existing card request failed:\", e);
        setError(\"Failed to check your card request status.\");
      } finally {
        setAuthChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  const submitRequest = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    if (status === "pending") {
      toast.info("You already have a pending request.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const email = String(user.email || "").trim().toLowerCase();
      if (!email) {
        toast.error("Your account has no email.");
        return;
      }
      const pendingQ = query(
        collection(db, "cardRequests"),
        where("userId", "==", user.uid),
        where("status", "==", "pending"),
        limit(1),
      );
      const pendingSnap = await getDocs(pendingQ);
      if (!pendingSnap.empty) {
        setStatus("pending");
        setRequestId(pendingSnap.docs[0]!.id);
        toast.info("You already have a pending request.");
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
      setStatus("pending");
      setRequestId(ref.id);
      toast.success("Your request has been submitted.");
      router.push("/dashboard");
    } catch (e) {
      console.error(\"Submit card request failed:\", e);
      setError(\"Failed to submit card request.\");
      toast.error(\"Submission failed. Please try again.\");
    } finally {
      setLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div className=\"flex items-center justify-center min-h-[60vh]\">
        <div className=\"animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600\"></div>
      </div>
    );
  }

  return (
    <main className="w-full min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-1 px-6 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Apply for Virtual Card</h1>
          <p className="text-sm text-gray-600 mb-6">
            Submit a request to get your Aurora Bank virtual card. You will be notified once an admin reviews your application.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="space-y-3">
            {status === "approved" && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                Your request is already approved. View your card in the dashboard.
              </div>
            )}
            {status === "rejected" && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                Your request was rejected.
              </div>
            )}
            {status === "pending" && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
                Your request is under review{requestId ? ` (ID: ${requestId})` : ""}.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={submitRequest}
              disabled={loading || status === "pending" || status === "approved"}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {status === "pending" ? "Awaiting approval" : loading ? "Submitting..." : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-gray-900">Card Policy</h2>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1 mt-2">
                <li>Card access is reviewed and approved by an administrator.</li>
                <li>Never share your card details or verification codes.</li>
                <li>Report suspicious activity immediately.</li>
              </ul>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-gray-900">Card Usage</h2>
              <p className="text-sm text-gray-600 mt-2">
                Use your virtual card for online payments and subscriptions. Verify merchant URLs and keep your device secure.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-gray-900">Verification</h2>
              <p className="text-sm text-gray-600 mt-2">
                After submitting, the request moves to pending. Once approved, your virtual card becomes available in the dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
