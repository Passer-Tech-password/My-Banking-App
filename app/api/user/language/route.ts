import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { isLocale } from "@/lib/i18n/messages";

export const runtime = "nodejs";

type ApiErrorCode = "invalid_request" | "unauthorized" | "internal_error";

function jsonError(status: number, code: ApiErrorCode, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1];
    if (!idToken) return jsonError(401, "unauthorized", "Missing Authorization bearer token.");

    const body = (await req.json().catch(() => null)) as { language?: unknown } | null;
    const language = typeof body?.language === "string" ? body.language.trim() : "";
    if (!language || !isLocale(language)) {
      return jsonError(400, "invalid_request", "Unsupported language.");
    }

    const adminAuth = getFirebaseAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = String(decoded.uid || "").trim();
    if (!uid) return jsonError(401, "unauthorized", "Invalid token.");

    const adminDb = getFirebaseAdminDb();
    await adminDb.doc(`users/${uid}`).set(
      {
        language,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, language });
  } catch (e) {
    console.error("UPDATE LANGUAGE ERROR:", e);
    const message = e instanceof Error ? e.message : "Internal error";
    const causeCode = typeof (e as any)?.code === "string" ? String((e as any).code) : undefined;
    if (causeCode && causeCode.startsWith("auth/")) {
      return jsonError(401, "unauthorized", "Invalid or expired Firebase ID token.");
    }
    return jsonError(500, "internal_error", message);
  }
}
