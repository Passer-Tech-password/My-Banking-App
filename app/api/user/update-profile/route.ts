import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { stripQueryParam } from "@/lib/url";

export const runtime = "nodejs";

type ApiErrorCode = "invalid_request" | "unauthorized" | "internal_error";

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
    if (!idToken) return jsonError(401, "unauthorized", "Missing Authorization bearer token.");

    const body = (await req.json().catch(() => null)) as
      | null
      | {
          displayName?: unknown;
          photoURL?: unknown;
          phone?: unknown;
          address?: unknown;
        };

    const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
    const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
    const address = typeof body?.address === "string" ? body.address.trim() : "";
    const photoURLRaw = typeof body?.photoURL === "string" ? body.photoURL.trim() : "";
    const photoURL = stripQueryParam(photoURLRaw, "v");

    if (!displayName) return jsonError(400, "invalid_request", "Display name is required.");

    const adminAuth = getFirebaseAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = String(decoded.uid || "").trim();
    if (!uid) return jsonError(401, "unauthorized", "Invalid token.");

    const adminDb = getFirebaseAdminDb();
    await adminDb.doc(`users/${uid}`).set(
      {
        displayName,
        phone,
        address,
        photoURL: photoURL || null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await adminAuth.updateUser(uid, {
      displayName,
      ...(photoURL ? { photoURL } : {}),
    });

    return NextResponse.json({ ok: true, displayName, photoURL: photoURL || "" });
  } catch (e) {
    console.error("UPDATE PROFILE ERROR:", e);
    const message = e instanceof Error ? e.message : "Internal error";
    const causeCode = typeof (e as any)?.code === "string" ? String((e as any).code) : undefined;
    if (causeCode && causeCode.startsWith("auth/")) {
      return jsonError(401, "unauthorized", "Invalid or expired Firebase ID token.");
    }
    return jsonError(500, "internal_error", message);
  }
}

