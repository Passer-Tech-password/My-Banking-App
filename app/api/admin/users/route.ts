import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminUserRow = {
  uid: string;
  firstName: string;
  middleName: string;
  lastName: string;
  displayName: string;
  email: string;
  photoURL?: string;
  accountNumber: string;
  balance: number;
  accountStatus: "ACTIVE" | "inactive" | "SUSPENDED" | "CLOSED";
  blocked: boolean;
  closedAt?: string;
  suspendedAt?: string;
  closedReason?: string;
  suspendedReason?: string;
  createdAt?: string;
  updatedAt?: string;
  role: string;
};

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false as const, error: message }, { status });
}

function toDateStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (
    typeof v === "object" &&
    v !== null &&
    "toDate" in v &&
    typeof (v as { toDate?: unknown }).toDate === "function"
  ) {
    try {
      const d = (v as { toDate: () => Date }).toDate();
      return d instanceof Date ? d.toISOString() : undefined;
    } catch {
      return undefined;
    }
  }
  if (
    typeof v === "object" &&
    v !== null &&
    "_seconds" in v &&
    typeof (v as { _seconds?: unknown })._seconds === "number"
  ) {
    const s = (v as { _seconds: number })._seconds;
    const ns =
      "_nanoseconds" in v && typeof (v as { _nanoseconds?: unknown })._nanoseconds === "number"
        ? (v as { _nanoseconds: number })._nanoseconds
        : 0;
    return new Date(s * 1000 + Math.floor(ns / 1_000_000)).toISOString();
  }
  return undefined;
}

function toAccountStatus(raw: unknown): AdminUserRow["accountStatus"] {
  if (raw === "SUSPENDED" || raw === "CLOSED") return raw;
  if (raw === "inactive") return "inactive";
  return "ACTIVE";
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySession(token);
    if (!session.ok) {
      return jsonError(401, "Admin session required.");
    }

    const adminDb = getFirebaseAdminDb();
    const snap = await adminDb.collection("users").orderBy("createdAt", "desc").limit(500).get();
    const rows: AdminUserRow[] = [];

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown> | undefined;
      if (!data) continue;

      const firstName = typeof data.firstName === "string" ? data.firstName : "";
      const middleName = typeof data.middleName === "string" ? data.middleName : "";
      const lastName = typeof data.lastName === "string" ? data.lastName : "";
      const displayName =
        typeof data.displayName === "string" && data.displayName.trim()
          ? data.displayName
          : [firstName, middleName, lastName].filter(Boolean).join(" ") ||
            (typeof data.email === "string" ? data.email : doc.id);

      const balanceNum =
        typeof data.balance === "number"
          ? data.balance
          : typeof data.balance === "string" && !Number.isNaN(Number(data.balance))
            ? Number(data.balance)
            : 0;

      const accountNumber =
        typeof data.accountNumber === "string" && /^\d{10}$/.test(data.accountNumber)
          ? data.accountNumber
          : "";

      let baseStatus = toAccountStatus(data.accountStatus);
      const suspendedAt = toDateStr(data.suspendedAt);
      const closedAt = toDateStr(data.closedAt);
      if (closedAt) baseStatus = "CLOSED";
      else if (suspendedAt && baseStatus !== "CLOSED") baseStatus = "SUSPENDED";

      const blocked =
        typeof data.blocked === "boolean"
          ? data.blocked
          : baseStatus === "SUSPENDED" || baseStatus === "CLOSED" || baseStatus === "inactive";

      rows.push({
        uid: doc.id,
        firstName,
        middleName,
        lastName,
        displayName,
        email: typeof data.email === "string" ? data.email : "",
        photoURL: typeof data.photoURL === "string" ? data.photoURL : undefined,
        accountNumber,
        balance: Math.round(balanceNum * 100) / 100,
        accountStatus: baseStatus,
        blocked,
        suspendedAt,
        closedAt,
        suspendedReason: typeof data.suspendedReason === "string" ? data.suspendedReason : undefined,
        closedReason: typeof data.closedReason === "string" ? data.closedReason : undefined,
        createdAt: toDateStr(data.createdAt),
        updatedAt: toDateStr(data.updatedAt),
        role: typeof data.role === "string" ? data.role : "user",
      });
    }

    return NextResponse.json({
      ok: true as const,
      users: rows,
      admin: { email: session.email },
    });
  } catch (e) {
    console.error("ADMIN LIST USERS: top-level error:", e);
    return jsonError(500, "Failed to list user accounts.");
  }
}
