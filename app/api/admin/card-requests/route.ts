import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import crypto from "crypto";

export const runtime = "nodejs";

type ApiErrorCode = "invalid_request" | "unauthorized" | "forbidden" | "not_found" | "internal_error";

function jsonError(status: number, code: ApiErrorCode, message: string) {
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
    },
    { status },
  );
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1];
    if (!idToken) {
      return jsonError(401, "unauthorized", "Missing Authorization bearer token.");
    }

    const body = (await req.json().catch(() => null)) as
      | null
      | {
          requestId?: unknown;
          action?: unknown;
        };
    const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
    const action = typeof body?.action === "string" ? body.action.trim() : "";
    if (!requestId || (action !== "approve" && action !== "reject")) {
      return jsonError(400, "invalid_request", "Missing or invalid request fields.");
    }

    const adminAuth = getFirebaseAdminAuth();
    const adminDb = getFirebaseAdminDb();

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = String(decoded.uid || "").trim();
    if (!uid) {
      return jsonError(401, "unauthorized", "Invalid token.");
    }

    const profileSnap = await adminDb.doc(`users/${uid}`).get();
    const role = profileSnap.exists ? String(profileSnap.data()?.role || "") : "";
    const isAdmin = profileSnap.exists ? profileSnap.data()?.isAdmin === true : false;
    if (role !== "admin" && !isAdmin) {
      return jsonError(403, "forbidden", "Admin privileges required.");
    }

    const ref = adminDb.doc(`cardRequests/${requestId}`);
    const snap = await ref.get();
    if (!snap.exists) {
      return jsonError(404, "not_found", "Card request not found.");
    }

    const currentStatus = String(snap.data()?.status || "").trim();
    if (currentStatus && currentStatus !== "pending") {
      return jsonError(400, "invalid_request", "Request already processed");
    }

    const nextStatus = action === "approve" ? "approved" : "rejected";
    const data = snap.data() as any;
    const requestedUserId = String(data?.userId || "").trim();
    if (!requestedUserId) {
      return jsonError(400, "invalid_request", "Invalid card request (missing userId).");
    }

    let cardId: string | null = typeof data?.cardId === "string" ? data.cardId : null;
    if (action === "approve") {
      if (!cardId) {
        const digits = Array.from({ length: 16 }, () => String(crypto.randomInt(0, 10))).join("");
        const formatted = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12)}`;
        const cvv = String(crypto.randomInt(0, 1000)).padStart(3, "0");
        const now = new Date();
        const expMonth = String(((now.getMonth() + 1 + 24) % 12) || 12).padStart(2, "0");
        const expYear = String((now.getFullYear() + 2) % 100).padStart(2, "0");
        const holder = String(data?.email || "").trim() || "AURORA MEMBER";
        const cardRef = adminDb.collection(`users/${requestedUserId}/cards`).doc();
        cardId = cardRef.id;
        await cardRef.set({
          network: "VISA",
          number: formatted,
          holder,
          expires: `${expMonth}/${expYear}`,
          cvv,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    await ref.set(
      {
        status: nextStatus,
        ...(cardId ? { cardId } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, requestId, status: nextStatus });
  } catch (e) {
    console.error("CARD REQUESTS ADMIN ERROR:", e);
    const message = e instanceof Error ? e.message : "Internal error";
    const causeCode = typeof (e as any)?.code === "string" ? String((e as any).code) : undefined;
    if (causeCode && causeCode.startsWith("auth/")) {
      return jsonError(401, "unauthorized", "Invalid or expired Firebase ID token.");
    }
    return jsonError(500, "internal_error", message);
  }
}
