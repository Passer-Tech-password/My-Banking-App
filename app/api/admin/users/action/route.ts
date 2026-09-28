import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Action = "suspend" | "close" | "delete" | "reactivate" | "block" | "activate";

function jsonError(status: number, message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false as const, error: message, ...(details ? { details } : {}) },
    { status },
  );
}

function isAction(v: unknown): v is Action {
  return v === "suspend" || v === "close" || v === "delete" || v === "reactivate" || v === "block" || v === "activate";
}

async function writeAudit(args: {
  adminDb: ReturnType<typeof getFirebaseAdminDb>;
  adminEmail: string;
  action: Action;
  targetUid: string;
  targetEmail: string;
  reason: string;
}) {
  const { adminDb, adminEmail, action, targetUid, targetEmail, reason } = args;
  const payload: Record<string, unknown> = {
    action,
    performedByEmail: adminEmail,
    targetUid,
    targetEmail,
    reason: reason || "",
    createdAt: FieldValue.serverTimestamp(),
  };
  try {
    await adminDb.collection("adminAudits").add(payload);
  } catch (e) {
    console.error("ADMIN ACTION AUDIT WRITE FAILED:", e, payload);
  }
}

export async function POST(req: NextRequest, ctx: { params?: unknown }) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySession(token);
    if (!session.ok) return jsonError(401, "Admin session required.");

    let raw = "";
    try {
      raw = await req.text();
    } catch {
      return jsonError(400, "Could not read request body.");
    }
    let body: null | { uid?: unknown; action?: unknown; reason?: unknown } = null;
    try {
      body = raw ? (JSON.parse(raw) as { uid?: unknown; action?: unknown; reason?: unknown }) : {};
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const uid = typeof body?.uid === "string" ? body.uid.trim() : "";
    const action = isAction(body?.action) ? body.action : undefined;
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (!uid) return jsonError(400, "User uid is required.");
    if (!action) return jsonError(400, "Invalid action. Must be suspend, close, delete, reactivate, block, or activate.");

    const adminAuth = getFirebaseAdminAuth();
    const adminDb = getFirebaseAdminDb();
    const userDoc = adminDb.doc(`users/${uid}`);
    const publicDoc = adminDb.doc(`publicUsers/${uid}`);
    const snap = await userDoc.get();
    if (!snap.exists) return jsonError(404, "User account not found.");
    const existing = (snap.data() ?? {}) as Record<string, unknown>;
    const targetEmail =
      typeof existing.email === "string" ? existing.email : "unknown-email@example.invalid";
    const existingClosed =
      existing.closedAt !== undefined &&
      existing.closedAt !== null &&
      !(typeof existing.closedAt === "string" && existing.closedAt.trim() === "");

    if (action === "delete") {
      await Promise.allSettled([
        userDoc.delete(),
        publicDoc.delete().catch(() => void 0),
      ]);
      try {
        await adminAuth.deleteUser(uid);
      } catch (e) {
        console.warn(`ADMIN deleteUser auth cleanup missing for uid=${uid}:`, e);
      }
      await writeAudit({
        adminDb,
        adminEmail: (session.email ?? "admin@aurora.bank"),
        action,
        targetUid: uid,
        targetEmail,
        reason,
      });
      return NextResponse.json({
        ok: true as const,
        action,
        uid,
        message: "User account and associated data permanently deleted.",
      });
    }

    if (action === "reactivate") {
      const suspendedAt = existing.suspendedAt;
      const hasSuspension =
        suspendedAt !== undefined &&
        suspendedAt !== null &&
        !(typeof suspendedAt === "string" && suspendedAt.trim() === "");
      const isClosed =
        existingClosed;
      if (isClosed) {
        return jsonError(409, "Cannot reactivate a permanently closed account.");
      }
      if (!hasSuspension && existing.accountStatus !== "SUSPENDED") {
        return jsonError(409, "This account is not suspended; nothing to reactivate.");
      }
      await userDoc.set(
        {
          accountStatus: "ACTIVE",
          blocked: false,
          reactivatedAt: FieldValue.serverTimestamp(),
          reactivatedReason: (reason || "Reactivated by admin.") as string,
          suspendedAt: FieldValue.delete(),
          suspendedReason: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      try {
        await adminAuth.updateUser(uid, { disabled: false });
      } catch (e) {
        console.warn(`ADMIN reactivate auth updateUser disabled=false failed uid=${uid}:`, e);
      }
      await writeAudit({
        adminDb,
        adminEmail: (session.email ?? "admin@aurora.bank"),
        action,
        targetUid: uid,
        targetEmail,
        reason,
      });
      return NextResponse.json({
        ok: true as const,
        action,
        uid,
        message: "User account reactivated. Login access restored; suspension cleared.",
      });
    }

    if (action === "suspend") {
      await userDoc.set(
        {
          accountStatus: "SUSPENDED",
          blocked: true,
          suspendedAt: FieldValue.serverTimestamp(),
          suspendedReason: (reason || "Suspended by admin.") as string,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      try {
        await adminAuth.updateUser(uid, { disabled: true });
      } catch (e) {
        console.warn(`ADMIN suspend auth updateUser disabled failed uid=${uid}:`, e);
      }
      await writeAudit({
        adminDb,
        adminEmail: (session.email ?? "admin@aurora.bank"),
        action,
        targetUid: uid,
        targetEmail,
        reason,
      });
      return NextResponse.json({
        ok: true as const,
        action,
        uid,
        message: "User account suspended. Login access revoked; data preserved.",
      });
    }

    if (action === "block") {
      if (existingClosed) {
        return jsonError(409, "Cannot block a permanently closed account.");
      }
      await userDoc.set(
        {
          blocked: true,
          blockedAt: FieldValue.serverTimestamp(),
          blockedReason: (reason || "Blocked by admin.") as string,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      try {
        await adminAuth.updateUser(uid, { disabled: true });
      } catch (e) {
        console.warn(`ADMIN block auth updateUser disabled failed uid=${uid}:`, e);
      }
      await writeAudit({
        adminDb,
        adminEmail: (session.email ?? "admin@aurora.bank"),
        action,
        targetUid: uid,
        targetEmail,
        reason,
      });
      return NextResponse.json({
        ok: true as const,
        action,
        uid,
        message: "User account blocked. Login access revoked; account status preserved.",
      });
    }

    if (action === "activate") {
      if (existingClosed) {
        return jsonError(409, "Cannot activate a permanently closed account.");
      }
      await userDoc.set(
        {
          accountStatus: "ACTIVE",
          blocked: false,
          activatedAt: FieldValue.serverTimestamp(),
          activatedReason: (reason || "Activated by admin.") as string,
          suspendedAt: FieldValue.delete(),
          suspendedReason: FieldValue.delete(),
          blockedAt: FieldValue.delete(),
          blockedReason: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      try {
        await adminAuth.updateUser(uid, { disabled: false });
      } catch (e) {
        console.warn(`ADMIN activate auth updateUser disabled=false failed uid=${uid}:`, e);
      }
      await writeAudit({
        adminDb,
        adminEmail: (session.email ?? "admin@aurora.bank"),
        action,
        targetUid: uid,
        targetEmail,
        reason,
      });
      return NextResponse.json({
        ok: true as const,
        action,
        uid,
        message: "User account activated. Login access restored; all restrictions cleared.",
      });
    }

    // action === "close"
    if (existingClosed) {
      return jsonError(409, "User account is already closed.");
    }
    await userDoc.set(
      {
        accountStatus: "CLOSED",
        blocked: true,
        closedAt: FieldValue.serverTimestamp(),
        closedReason: (reason || "Closed by admin.") as string,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    try {
      await adminAuth.updateUser(uid, { disabled: true });
    } catch (e) {
      console.warn(`ADMIN close auth updateUser disabled failed uid=${uid}:`, e);
    }
    await writeAudit({
      adminDb,
      adminEmail: (session.email ?? "admin@aurora.bank"),
      action,
      targetUid: uid,
      targetEmail,
      reason,
    });
    return NextResponse.json({
      ok: true as const,
      action,
      uid,
      message: "User account closed permanently; historical data retained for audit.",
    });
  } catch (e) {
    console.error("ADMIN USER ACTION FAILED:", e);
    return jsonError(500, "Failed to perform admin action on user account.");
  }
}
