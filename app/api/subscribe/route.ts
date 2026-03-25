import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type ApiErrorCode = "invalid_request" | "rate_limited" | "internal_error";

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

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

function toRateLimitId(prefix: string, ip: string, windowStartMs: number): string {
  return Buffer.from(`${prefix}|${ip}|${windowStartMs}`, "utf8").toString("base64url");
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
    const ip = getClientIp(req);
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const windowStartMs = Math.floor(now / windowMs) * windowMs;
    const windowEndMs = windowStartMs + windowMs;
    const rlRef = adminDb.doc(`rateLimits/${toRateLimitId("subscribe", ip, windowStartMs)}`);
    const rlResult = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(rlRef);
      const current = snap.exists ? Number((snap.data() as any)?.count || 0) : 0;
      if (current >= 20) return { allowed: false, count: current };
      const next = current + 1;
      tx.set(
        rlRef,
        {
          keyPrefix: "subscribe",
          ip,
          windowStartMs,
          windowMs,
          count: next,
          updatedAt: FieldValue.serverTimestamp(),
          expiresAt: new Date(windowEndMs + 60_000),
        },
        { merge: true },
      );
      return { allowed: true, count: next };
    });
    if (!rlResult.allowed) {
      const resetSeconds = Math.max(1, Math.ceil((windowEndMs - Date.now()) / 1000));
      return jsonError(429, "rate_limited", `Too many requests. Try again in ${resetSeconds}s.`);
    }

    const id = toSubscriberId(email);
    const ref = adminDb.doc(`subscribers/${id}`);
    const snap = await ref.get();
    if (snap.exists) {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }

    await ref.set({
      email,
      ip: ip !== "unknown" ? ip : null,
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
