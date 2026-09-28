import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";
import { getFirebaseAdminDb, getFirebaseAdminAuth } from "@/lib/firebaseAdmin";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(status: number, message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false as const, error: message, ...(details ? { details } : {}) },
    { status },
  );
}

function isAccountNumber(v: string): boolean {
  return /^\d{10}$/.test(v);
}

function randomDigits(len: number): string {
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    out.push(String(crypto.randomInt(0, 10)));
  }
  return out.join("");
}

type CheckBody = {
  field?: unknown;
  value?: unknown;
  excludeUid?: unknown;
  generate?: unknown;
};

const VALID_FIELDS = ["accountNumber", "email"] as const;
type ValidField = (typeof VALID_FIELDS)[number];

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySession(token);
    if (!session.ok) return jsonError(401, "Admin session required.");

    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return jsonError(400, "Could not read request body.");
    }
    let body: CheckBody | null = null;
    try {
      body = raw ? (JSON.parse(raw) as CheckBody) : {};
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const shouldGenerate =
      body?.generate === true || body?.generate === "true";
    const excludeUid =
      typeof body?.excludeUid === "string" ? body.excludeUid.trim() : "";

    const fieldRaw = typeof body?.field === "string" ? body.field.trim() : "";
    const field = VALID_FIELDS.includes(fieldRaw as ValidField)
      ? (fieldRaw as ValidField)
      : shouldGenerate
        ? "accountNumber"
        : "";

    if (!field) return jsonError(400, "Missing or invalid 'field'. Supported: accountNumber, email.");

    const adminDb = getFirebaseAdminDb();

    if (shouldGenerate) {
      if (field === "accountNumber") {
        const MAX_RETRIES = 8;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          const candidate = randomDigits(10);
          if (!isAccountNumber(candidate)) continue;
          const q = await adminDb
            .collection("users")
            .where("accountNumber", "==", candidate)
            .limit(1)
            .get();
          if (q.empty) {
            return NextResponse.json({
              ok: true as const,
              field,
              value: candidate,
              unique: true,
            });
          }
        }
        return jsonError(500, "Failed to generate a unique account number after multiple attempts. Please try again.");
      }
      if (field === "email") {
        return jsonError(400, "Email generation is not supported. Use 'value' check mode only.");
      }
    }

    const value = typeof body?.value === "string" ? body.value.trim() : "";
    if (!value) return jsonError(400, "Missing 'value' to check.");

    if (field === "accountNumber") {
      if (!isAccountNumber(value)) {
        return jsonError(400, "Account number must be exactly 10 digits.");
      }
      const q = await adminDb
        .collection("users")
        .where("accountNumber", "==", value)
        .limit(2)
        .get();
      const collision =
        !q.empty &&
        [...q.docs].some((d) => d.id !== excludeUid);
      return NextResponse.json({
        ok: true as const,
        field,
        value,
        unique: !collision,
      });
    }

    if (field === "email") {
      const email = value.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonError(400, "Email format is invalid.");
      }
      const q = await adminDb
        .collection("users")
        .where("email", "==", email)
        .limit(2)
        .get();
      const collision =
        !q.empty &&
        [...q.docs].some((d) => d.id !== excludeUid);
      if (collision) {
        return NextResponse.json({
          ok: true as const,
          field,
          value: email,
          unique: false,
        });
      }
      try {
        const adminAuth = getFirebaseAdminAuth();
        await adminAuth.getUserByEmail(email);
        return NextResponse.json({
          ok: true as const,
          field,
          value: email,
          unique: false,
        });
      } catch {
        return NextResponse.json({
          ok: true as const,
          field,
          value: email,
          unique: true,
        });
      }
    }

    return jsonError(400, `Unsupported field: ${field}`);
  } catch (e) {
    console.error("CHECK-UNIQUE ADMIN API FAILED:", e);
    return jsonError(500, "Failed to check uniqueness.");
  }
}
