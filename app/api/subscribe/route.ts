import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type ApiErrorCode = "invalid_request" | "internal_error";

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

function toSubscriberId(email: string): string {
  const normalized = email.trim().toLowerCase();
  return Buffer.from(normalized, "utf8").toString("base64url");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | null
      | {
          email?: unknown;
        };
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return jsonError(400, "invalid_request", "Missing required field: email");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError(400, "invalid_request", "Email must be valid");
    }

    const adminDb = getFirebaseAdminDb();
    const id = toSubscriberId(email);
    const ref = adminDb.doc(`subscribers/${id}`);
    const snap = await ref.get();
    if (snap.exists) {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }

    await ref.set({
      email,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, alreadySubscribed: false });
  } catch (e) {
    console.error("SUBSCRIBE API ERROR:", e);
    const message = e instanceof Error ? e.message : "Internal error";
    return jsonError(500, "internal_error", message);
  }
}

