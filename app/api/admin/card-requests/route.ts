import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";

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

    const nextStatus = action === "approve" ? "approved" : "rejected";
    await ref.set(
      {
        status: nextStatus,
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

