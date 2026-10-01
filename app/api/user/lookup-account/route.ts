import { NextRequest, NextResponse } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(
  status: number,
  code: "invalid_request" | "unauthorized" | "not_found" | "internal_error",
  message: string,
) {
  return NextResponse.json(
    { ok: false as const, code, message },
    { status },
  );
}

function isAccountNumber(v: string): boolean {
  return /^\d{10}$/.test(v);
}

export async function POST(req: NextRequest) {
  const adminAuth = getFirebaseAdminAuth();
  const adminDb = getFirebaseAdminDb();

  let uid: string | null = null;
  try {
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1];
    if (!idToken) {
      return jsonError(401, "unauthorized", "Missing Authorization bearer token.");
    }
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return jsonError(401, "unauthorized", "Invalid or expired Firebase ID token.");
    }
    uid = String(decoded.uid || "").trim();
    if (!uid) {
      return jsonError(401, "unauthorized", "Invalid token payload.");
    }
  } catch (e) {
    console.error("[LOOKUP-ACCOUNT] Auth preamble failed:", e);
    return jsonError(500, "internal_error", "Failed to authenticate request.");
  }

  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return jsonError(400, "invalid_request", "Invalid JSON payload.");
    }

    const accountNumber = String(body?.accountNumber || "").trim();
    if (!isAccountNumber(accountNumber)) {
      return jsonError(400, "invalid_request", "Account number must be exactly 10 digits.");
    }

    const q = await adminDb
      .collection("users")
      .where("accountNumber", "==", accountNumber)
      .limit(1)
      .get();

    if (q.empty) {
      return jsonError(404, "not_found", "No account matches this account number.");
    }

    const doc = q.docs[0]!;
    const data = doc.data() as any;
    if (String(data?.blocked) === "true" || data?.accountStatus === "closed") {
      return jsonError(404, "not_found", "This account is no longer available for transfers.");
    }
    if (doc.id === uid) {
      return jsonError(400, "invalid_request", "You cannot look up your own account.");
    }

    const firstName = String(data?.firstName || "").trim();
    const lastName = String(data?.lastName || "").trim();
    const displayName = String(data?.displayName || "").trim();
    const accountName =
      firstName && lastName
        ? `${firstName} ${lastName}`
        : displayName ||
          String(data?.email || "").trim().split("@")[0] ||
          "Account Holder";

    return NextResponse.json({
      ok: true as const,
      accountName,
      accountNumber,
      recipientUid: doc.id,
    });
  } catch (e) {
    console.error("[LOOKUP-ACCOUNT] Lookup failed:", e);
    return jsonError(500, "internal_error", "Unable to look up account at this time.");
  }
}
