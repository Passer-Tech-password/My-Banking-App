import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { ContactMessage } from "@/lib/ContactMessage";

export const runtime = "nodejs";

type ApiErrorCode = "invalid_request" | "unauthorized" | "rate_limited" | "internal_error";

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

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

async function enforceRateLimit(params: {
  adminDb: ReturnType<typeof getFirebaseAdminDb>;
  keyPrefix: string;
  ip: string;
  maxRequests: number;
  windowMs: number;
}): Promise<{ allowed: boolean; remaining: number; resetAtMs: number }> {
  const now = Date.now();
  const windowStartMs = Math.floor(now / params.windowMs) * params.windowMs;
  const windowEndMs = windowStartMs + params.windowMs;
  const key = toBase64Url(`${params.keyPrefix}|${params.ip}|${windowStartMs}`);
  const ref = params.adminDb.doc(`rateLimits/${key}`);

  const result = await params.adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number((snap.data() as any)?.count || 0) : 0;
    if (current >= params.maxRequests) {
      return { allowed: false, count: current };
    }
    const next = current + 1;
    tx.set(
      ref,
      {
        keyPrefix: params.keyPrefix,
        ip: params.ip,
        windowStartMs,
        windowMs: params.windowMs,
        count: next,
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: new Date(windowEndMs + 60_000),
      },
      { merge: true },
    );
    return { allowed: true, count: next };
  });

  return {
    allowed: result.allowed,
    remaining: Math.max(0, params.maxRequests - result.count),
    resetAtMs: windowEndMs,
  };
}

async function verifyTurnstile(params: { secret: string; token: string; ip: string }): Promise<boolean> {
  const body = new URLSearchParams();
  body.set("secret", params.secret);
  body.set("response", params.token);
  if (params.ip && params.ip !== "unknown") body.set("remoteip", params.ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json().catch(() => null)) as null | { success?: unknown };
  return data?.success === true;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as
      | null
      | {
          name?: unknown;
          email?: unknown;
          subject?: unknown;
          message?: unknown;
          website?: unknown;
          turnstileToken?: unknown;
        };
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const website = typeof body?.website === "string" ? body.website.trim() : "";
    if (!name || !email || !message) {
      return jsonError(400, "invalid_request", "Missing required fields: name, email, message.");
    }
    if (website) {
      return jsonError(400, "invalid_request", "Invalid request.");
    }

    const adminAuth = getFirebaseAdminAuth();
    const adminDb = getFirebaseAdminDb();
    const ip = getClientIp(req);

    const rl = await enforceRateLimit({
      adminDb,
      keyPrefix: "contact",
      ip,
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) {
      const resetSeconds = Math.max(1, Math.ceil((rl.resetAtMs - Date.now()) / 1000));
      return jsonError(429, "rate_limited", `Too many requests. Try again in ${resetSeconds}s.`);
    }

    const turnstileSecret = String(process.env.TURNSTILE_SECRET_KEY || "").trim();
    if (turnstileSecret) {
      const token = typeof body?.turnstileToken === "string" ? body.turnstileToken.trim() : "";
      if (!token) return jsonError(400, "invalid_request", "CAPTCHA required.");
      const ok = await verifyTurnstile({ secret: turnstileSecret, token, ip });
      if (!ok) return jsonError(400, "invalid_request", "CAPTCHA verification failed.");
    }

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1];
    const uid =
      idToken
        ? await adminAuth
            .verifyIdToken(idToken)
            .then((d) => String(d.uid || "").trim())
            .catch(() => "")
        : "";

    const ref = adminDb.collection("contactMessages").doc();
    const contact = ContactMessage.builder()
      .setUserId(uid || null)
      .setName(name)
      .setEmail(email)
      .setSubject(subject)
      .setMessage(message)
      .setIp(ip !== "unknown" ? ip : null)
      .setCreatedAt(FieldValue.serverTimestamp())
      .setUpdatedAt(FieldValue.serverTimestamp())
      .build();
    await ref.set(contact.toFirestore());

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (e) {
    console.error("CONTACT API ERROR:", e);
    const message = e instanceof Error ? e.message : "Internal error";
    const causeCode = typeof (e as any)?.code === "string" ? String((e as any).code) : undefined;
    if (causeCode && causeCode.startsWith("auth/")) {
      return jsonError(401, "unauthorized", "Invalid or expired Firebase ID token.");
    }
    return jsonError(500, "internal_error", message);
  }
}
