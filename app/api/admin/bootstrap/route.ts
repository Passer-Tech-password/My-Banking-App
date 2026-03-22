import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type ApiErrorCode =
  | "missing_env"
  | "unauthorized"
  | "email_mismatch"
  | "invalid_config"
  | "internal_error";

function jsonError(status: number, code: ApiErrorCode, message: string, causeCode?: string) {
  return NextResponse.json(
    {
      ok: false,
      error: "Bootstrap failed",
      message,
      code,
      causeCode,
    },
    { status },
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as null | { email?: unknown };
    const requestEmail = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!requestEmail) {
      return jsonError(400, "invalid_config", "Missing request body field: email");
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1];
    if (!idToken) {
      return jsonError(401, "unauthorized", "Missing Authorization bearer token.");
    }

    const adminAuth = getFirebaseAdminAuth();
    const adminDb = getFirebaseAdminDb();

    const decoded = await adminAuth.verifyIdToken(idToken);
    const tokenEmail = String(decoded.email || "").trim().toLowerCase();
    const emailVerified = decoded.email_verified === true;
    if (!tokenEmail) {
      return jsonError(401, "unauthorized", "Authenticated user has no email.");
    }
    if (!emailVerified) {
      return jsonError(403, "unauthorized", "Email must be verified to access admin bootstrap.");
    }
    if (requestEmail && requestEmail !== tokenEmail) {
      return jsonError(403, "email_mismatch", "Email mismatch between request and authenticated user.");
    }

    const envBootstrapEmail = String(process.env.ADMIN_BOOTSTRAP_EMAIL || "").trim().toLowerCase();

    const securityRef = adminDb.doc("config/security");
    const securitySnap = await securityRef.get();

    let bootstrapAdminEmail: string;
    if (securitySnap.exists) {
      const value = securitySnap.data()?.bootstrapAdminEmail;
      if (typeof value !== "string" || !value.trim()) {
        return jsonError(400, "invalid_config", "Admin bootstrap config is invalid: missing bootstrapAdminEmail.");
      }
      bootstrapAdminEmail = value.trim().toLowerCase();
    } else {
      if (!envBootstrapEmail) {
        return jsonError(
          400,
          "missing_env",
          "Admin bootstrap is not configured. Set ADMIN_BOOTSTRAP_EMAIL or initialize config/security via server.",
        );
      }
      if (tokenEmail !== envBootstrapEmail) {
        return jsonError(
          403,
          "email_mismatch",
          "Email does not match bootstrap admin configuration. Sign in with ADMIN_BOOTSTRAP_EMAIL.",
        );
      }

      await securityRef.set(
        {
          bootstrapAdminEmail: tokenEmail,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: false },
      );
      bootstrapAdminEmail = tokenEmail;
    }

    const isBootstrapAdmin = tokenEmail === bootstrapAdminEmail;
    let userPromoted = false;

    if (isBootstrapAdmin) {
      const userRef = adminDb.doc(`users/${decoded.uid}`);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        await userRef.set(
          {
            email: tokenEmail,
            role: "admin",
            isAdmin: true,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } else {
        await userRef.set(
          {
            email: tokenEmail,
            role: "admin",
            isAdmin: true,
            blocked: false,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: false },
        );
      }
      userPromoted = true;
    }

    return NextResponse.json({
      ok: true,
      bootstrapAdminEmail,
      isBootstrapAdmin,
      userPromoted,
    });
  } catch (e: any) {
    console.error("BOOTSTRAP ERROR:", e);
    const message = e instanceof Error ? e.message : "Internal error";
    const causeCode = typeof e?.code === "string" ? e.code : undefined;

    if (typeof message === "string" && message.startsWith("Missing environment variable: ")) {
      return jsonError(400, "missing_env", message);
    }

    if (typeof causeCode === "string" && causeCode.startsWith("auth/")) {
      return jsonError(401, "unauthorized", "Invalid or expired Firebase ID token.", causeCode);
    }

    return jsonError(500, "internal_error", message, causeCode);
  }
}
