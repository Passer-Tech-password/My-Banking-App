import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { firebaseAdminAuth, firebaseAdminDb } from "@/lib/firebaseAdmin";

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
      error: {
        code,
        message,
        causeCode,
      },
    },
    { status },
  );
}

export async function POST(req: Request) {
  try {
    let requestEmail: string | null = null;
    try {
      const body = (await req.json().catch(() => null)) as null | { email?: unknown };
      if (body && typeof body.email === "string") requestEmail = body.email.trim().toLowerCase();
    } catch {}

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1];
    if (!idToken) {
      return jsonError(401, "unauthorized", "Missing Authorization bearer token.");
    }

    const decoded = await firebaseAdminAuth.verifyIdToken(idToken);
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

    const envBootstrapEmail = String(process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").trim().toLowerCase();

    const securityRef = firebaseAdminDb.doc("config/security");
    const securitySnap = await securityRef.get();

    let bootstrapAdminEmail: string;
    if (securitySnap.exists) {
      const value = securitySnap.data()?.bootstrapAdminEmail;
      if (typeof value !== "string" || !value.trim()) {
        return jsonError(500, "invalid_config", "Admin bootstrap config is invalid: missing bootstrapAdminEmail.");
      }
      bootstrapAdminEmail = value.trim().toLowerCase();
    } else {
      if (!envBootstrapEmail) {
        return jsonError(
          500,
          "missing_env",
          "Admin bootstrap is not configured. Set NEXT_PUBLIC_ADMIN_EMAIL or initialize config/security via server.",
        );
      }
      if (tokenEmail !== envBootstrapEmail) {
        return jsonError(
          403,
          "email_mismatch",
          "Email does not match bootstrap admin configuration. Sign in with NEXT_PUBLIC_ADMIN_EMAIL.",
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
      const userRef = firebaseAdminDb.doc(`users/${decoded.uid}`);
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
    const message = e instanceof Error ? e.message : "Internal error";
    const causeCode = typeof e?.code === "string" ? e.code : undefined;
    return jsonError(500, "internal_error", message, causeCode);
  }
}
