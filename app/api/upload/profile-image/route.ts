import { NextResponse } from "next/server";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { uploadProfileImage } from "@/lib/cloudinary";

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
    if (!idToken) {
      return jsonError(401, "unauthorized", "Missing Authorization bearer token.");
    }

    const adminAuth = getFirebaseAdminAuth();
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = String(decoded.uid || "").trim();
    if (!uid) {
      return jsonError(401, "unauthorized", "Invalid token.");
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return jsonError(400, "invalid_request", "Missing file.");
    }
    if (!file.type || !file.type.startsWith("image/")) {
      return jsonError(400, "invalid_request", "File must be an image.");
    }
    if (file.size > 5 * 1024 * 1024) {
      return jsonError(400, "invalid_request", "Image must be <= 5MB.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadProfileImage({ uid, buffer, contentType: file.type });
    const url = String(result.secure_url || "").trim();
    const version = Number((result as any)?.version || 0);
    const photoVersion = Number.isFinite(version) && version > 0 ? version : Date.now();
    if (!url) {
      return jsonError(500, "internal_error", "Upload failed.");
    }

    const adminDb = getFirebaseAdminDb();
    await adminDb.doc(`users/${uid}`).set(
      {
        photoURL: url,
        photoVersion,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true, url, photoVersion });
  } catch (e) {
    console.error("PROFILE IMAGE UPLOAD ERROR:", e);
    const message = e instanceof Error ? e.message : "Internal error";
    const causeCode = typeof (e as any)?.code === "string" ? String((e as any).code) : undefined;
    if (causeCode && causeCode.startsWith("auth/")) {
      return jsonError(401, "unauthorized", "Invalid or expired Firebase ID token.");
    }
    return jsonError(500, "internal_error", message);
  }
}
