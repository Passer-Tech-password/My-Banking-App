import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";
import { getFirebaseAdminDb, getFirebaseAdminAuth, getFirebaseAdminApp } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { encryptString, decryptString } from "@/lib/admin/encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function toAccountStatus(raw: unknown): "ACTIVE" | "inactive" | "SUSPENDED" | "CLOSED" {
  if (raw === "SUSPENDED" || raw === "CLOSED") return raw;
  if (raw === "inactive") return "inactive";
  return "ACTIVE";
}

function decryptOptional(v: unknown): string | undefined {
  if (typeof v !== "string" || !v) return undefined;
  try {
    return decryptString(v);
  } catch (e) {
    console.warn("DETAIL PAGE: credential decrypt failed (corrupted/missing key) — treating as undefined:", e);
    return undefined;
  }
}

export async function GET(req: NextRequest, ctx: { params?: unknown }) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySession(token);
    if (!session.ok) return jsonError(401, "Admin session required.");

    const paramsPromise = (ctx?.params ?? Promise.resolve({})) as Promise<{ uid?: unknown }>;
    const params = await paramsPromise;
    const uid = typeof params?.uid === "string" ? params.uid.trim() : "";
    if (!uid) return jsonError(400, "User uid missing from request path.");

    const adminDb = getFirebaseAdminDb();
    const snap = await adminDb.doc(`users/${uid}`).get();
    if (!snap.exists) return jsonError(404, "User account not found.");

    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const firstName = typeof data.firstName === "string" ? data.firstName : "";
    const middleName = typeof data.middleName === "string" ? data.middleName : "";
    const lastName = typeof data.lastName === "string" ? data.lastName : "";
    const displayName =
      typeof data.displayName === "string" && data.displayName.trim()
        ? data.displayName
        : [firstName, middleName, lastName].filter(Boolean).join(" ") ||
          (typeof data.email === "string" ? data.email : uid);

    const balanceRaw = data.balance;
    const balance =
      typeof balanceRaw === "number"
        ? balanceRaw
        : typeof balanceRaw === "string" && !Number.isNaN(Number(balanceRaw))
          ? Number(balanceRaw)
          : 0;

    const accountNumber =
      typeof data.accountNumber === "string" && /^\d{10}$/.test(data.accountNumber)
        ? data.accountNumber
        : "";

    let status = toAccountStatus(data.accountStatus);
    const closedAt = toDateStr(data.closedAt);
    const suspendedAt = toDateStr(data.suspendedAt);
    const reactivatedAt = toDateStr(data.reactivatedAt);
    if (closedAt) status = "CLOSED";
    else if (suspendedAt) status = "SUSPENDED";

    const blocked =
      typeof data.blocked === "boolean"
        ? data.blocked
        : status === "SUSPENDED" || status === "CLOSED" || status === "inactive";

    const optionalString = (v: unknown) => (typeof v === "string" ? v : undefined);
    const stringOrEmpty = (v: unknown) => (typeof v === "string" ? v : "");

    const kycKeys = ["id_front", "id_back", "passport", "proof_of_address", "other"];
    const kycDocuments: Record<string, unknown> = {};
    for (const k of kycKeys) {
      const kk = `kyc_${k}`;
      if (data[kk] && typeof data[kk] === "object" && data[kk] !== null) {
        const d = data[kk] as Record<string, unknown>;
        kycDocuments[k] = {
          url: typeof d.url === "string" ? d.url : "",
          version: typeof d.version === "number" ? d.version : undefined,
          format: typeof d.format === "string" ? d.format : undefined,
          bytes: typeof d.bytes === "number" ? d.bytes : undefined,
          fileName: typeof d.fileName === "string" ? d.fileName : undefined,
          uploadedAt: toDateStr(d.uploadedAt),
          uploadedBy: typeof d.uploadedBy === "string" ? d.uploadedBy : undefined,
        };
      }
    }

    const rawLocation =
      data.location && typeof data.location === "object" && !Array.isArray(data.location)
        ? (data.location as Record<string, unknown>)
        : null;
    const location = rawLocation
      ? {
          country: typeof rawLocation.country === "string" ? rawLocation.country : "",
          region: typeof rawLocation.region === "string" ? rawLocation.region : "",
          city: typeof rawLocation.city === "string" ? rawLocation.city : "",
          postalCode: typeof rawLocation.postalCode === "string" ? rawLocation.postalCode : "",
          addressLine: typeof rawLocation.addressLine === "string" ? rawLocation.addressLine : "",
          latitude:
            typeof rawLocation.latitude === "number"
              ? rawLocation.latitude
              : Number.isFinite(Number(rawLocation.latitude))
                ? Number(rawLocation.latitude)
                : undefined,
          longitude:
            typeof rawLocation.longitude === "number"
              ? rawLocation.longitude
              : Number.isFinite(Number(rawLocation.longitude))
                ? Number(rawLocation.longitude)
                : undefined,
        }
      : { country: "", region: "", city: "", postalCode: "", addressLine: "" };

    return NextResponse.json({
      ok: true as const,
      user: {
        uid: snap.id,
        firstName,
        middleName,
        lastName,
        displayName,
        email: stringOrEmpty(data.email),
        photoURL: optionalString(data.photoURL),
        accountNumber,
        balance: Math.round(balance * 100) / 100,
        accountStatus: status,
        blocked,
        createdAt: toDateStr(data.createdAt),
        updatedAt: toDateStr(data.updatedAt),
        closedAt,
        suspendedAt,
        reactivatedAt,
        closedReason: optionalString(data.closedReason),
        suspendedReason: optionalString(data.suspendedReason),
        reactivatedReason: optionalString(data.reactivatedReason),
        photoVersion:
          typeof data.photoVersion === "number" ? data.photoVersion : undefined,
        role: typeof data.role === "string" ? data.role : "user",
        address: stringOrEmpty(data.address),
        city: stringOrEmpty(data.city),
        state: stringOrEmpty(data.state),
        zipCode: stringOrEmpty(data.zipCode),
        dob: stringOrEmpty(data.dob),
        mobile: stringOrEmpty(data.mobile),
        phone: optionalString(data.phone),
        language: typeof data.language === "string" ? data.language : "",
        location,
        kycDocuments,
        accountPinPlain: decryptOptional(data.accountPin),
        transferCodePlain: decryptOptional(data.transferCode),
        passwordPlain: decryptOptional(data.password),
      },
      admin: { email: session.email },
    });
  } catch (e) {
    console.error("ADMIN GET USER FAILED:", e);
    return jsonError(500, "Failed to load user detail.");
  }
}

type PatchBody = {
  firstName?: unknown;
  middleName?: unknown;
  lastName?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zipCode?: unknown;
  dob?: unknown;
  mobile?: unknown;
  phone?: unknown;
  language?: unknown;
  location?: unknown;
  blocked?: unknown;
  accountStatus?: unknown;
  email?: unknown;
  password?: unknown;
  accountNumber?: unknown;
  accountPin?: unknown;
  transferCode?: unknown;
};

export async function PATCH(req: NextRequest, ctx: { params?: unknown }) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySession(token);
    if (!session.ok) return jsonError(401, "Admin session required.");

    const paramsPromise = (ctx?.params ?? Promise.resolve({})) as Promise<{ uid?: unknown }>;
    const params = await paramsPromise;
    const uid = typeof params?.uid === "string" ? params.uid.trim() : "";
    if (!uid) return jsonError(400, "User uid missing from request path.");

    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return jsonError(400, "Could not read request body.");
    }
    let body: PatchBody | null = null;
    try {
      body = raw ? (JSON.parse(raw) as PatchBody) : {};
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const adminDb = getFirebaseAdminDb();
    const docRef = adminDb.doc(`users/${uid}`);
    const publicRef = adminDb.doc(`publicUsers/${uid}`);
    const existing = await docRef.get();
    if (!existing.exists) return jsonError(404, "User account not found.");

    const updatePayload: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    const stringFields = [
      "firstName",
      "middleName",
      "lastName",
      "address",
      "city",
      "state",
      "zipCode",
      "dob",
      "mobile",
      "phone",
      "language",
    ] as const;
    for (const k of stringFields) {
      const rv = body?.[k];
      if (typeof rv === "string") updatePayload[k] = rv.trim();
    }

    if (body?.location && typeof body.location === "object" && !Array.isArray(body.location)) {
      const l = body.location as Record<string, unknown>;
      const loc: Record<string, unknown> = {};
      for (const k of ["country", "region", "city", "postalCode", "addressLine"]) {
        if (typeof l[k] === "string") loc[k] = l[k];
      }
      for (const k of ["latitude", "longitude"]) {
        const rv = l[k];
        const n = typeof rv === "number" ? rv : Number(String(rv ?? ""));
        if (Number.isFinite(n)) loc[k] = n;
      }
      updatePayload.location = loc;
    }

    const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
    if (body?.email !== undefined) {
      const v = typeof body.email === "string" ? body.email.trim() : "";
      if (!v) return jsonError(400, "Login Email cannot be empty.");
      if (!isEmail(v)) return jsonError(400, "Login Email must be a valid email address.");
      updatePayload.email = v;
    }
    if (typeof body?.password === "string" && body.password !== "") {
      const pw = body.password;
      if (pw.length < 8) return jsonError(400, "Password must be at least 8 characters long.");
      const strong = /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw);
      if (!strong) return jsonError(400, "Password must contain uppercase, lowercase, and a number.");
      try {
        const adminAuth = getFirebaseAdminAuth();
        await adminAuth.updateUser(uid, { password: pw });
      } catch (e) {
        console.error("ADMIN PATCH: Firebase Auth updateUser password failed:", e);
        return jsonError(400, "Unable to update login password (Firebase Auth constraint).");
      }
      updatePayload.password = encryptString(pw);
    }
    if (body?.accountNumber !== undefined) {
      const v = typeof body.accountNumber === "string" ? body.accountNumber.trim() : "";
      if (!/^\d{10}$/.test(v)) return jsonError(400, "Account Number must be exactly 10 digits.");
      const acctQ = await adminDb.collection("users").where("accountNumber", "==", v).limit(2).get();
      const collisionExists = !acctQ.empty && [...acctQ.docs].some((d) => d.id !== uid);
      if (collisionExists) return jsonError(409, "Account Number already belongs to another user.");
      updatePayload.accountNumber = v;
    }
    if (body?.accountPin !== undefined && body.accountPin !== "") {
      const v = typeof body.accountPin === "string" ? body.accountPin.trim() : "";
      if (!/^\d{6}$/.test(v)) return jsonError(400, "Account PIN must be exactly 6 digits.");
      updatePayload.accountPin = encryptString(v);
    }
    if (body?.transferCode !== undefined && body.transferCode !== "") {
      const v = typeof body.transferCode === "string" ? body.transferCode.trim() : "";
      if (!/^\d{6}$/.test(v)) return jsonError(400, "Transfer Code must be exactly 6 digits.");
      updatePayload.transferCode = encryptString(v);
    }

    if (typeof body?.accountStatus === "string") {
      const s = body.accountStatus;
      if (s === "ACTIVE" || s === "inactive" || s === "SUSPENDED" || s === "CLOSED") {
        updatePayload.accountStatus = s;
      }
    }
    if (typeof body?.blocked === "boolean") {
      updatePayload.blocked = body.blocked;
    }

    const updateFirst = typeof updatePayload.firstName === "string" ? updatePayload.firstName : "";
    const updateLast = typeof updatePayload.lastName === "string" ? updatePayload.lastName : "";
    const existingData = (existing.data() ?? {}) as Record<string, unknown>;
    const efn = typeof existingData.firstName === "string" ? existingData.firstName : "";
    const eln = typeof existingData.lastName === "string" ? existingData.lastName : "";
    const finalFirst = updateFirst || efn;
    const finalLast = updateLast || eln;
    if (finalFirst || finalLast) {
      const display = [finalFirst, finalLast].filter(Boolean).join(" ");
      updatePayload.displayName = display;
    }

    for (const k of Object.keys(updatePayload)) {
      if (updatePayload[k] === undefined) delete updatePayload[k];
    }

    const sensitiveKeys = [
      "email",
      "accountNumber",
      "accountPin",
      "transferCode",
      "password",
    ] as const;
    const changedSensitive: string[] = [];
    for (const k of sensitiveKeys) {
      if (k in updatePayload) changedSensitive.push(k);
    }

    await docRef.set(updatePayload, { merge: true });

    if (changedSensitive.length > 0) {
      try {
        const existingData = (existing.data() ?? {}) as Record<string, unknown>;
        const oldAcct =
          typeof existingData.accountNumber === "string"
            ? existingData.accountNumber
            : "unknown";
        const targetEmail =
          typeof updatePayload.email === "string"
            ? updatePayload.email
            : typeof existingData.email === "string"
              ? existingData.email
              : "";
        const fieldList = changedSensitive
          .map((f) =>
            f === "accountPin"
              ? "Account PIN (encrypted)"
              : f === "transferCode"
                ? "Transfer Code (encrypted)"
                : f === "password"
                  ? "Login Password"
                  : f === "email"
                    ? "Login Email"
                    : f === "accountNumber"
                      ? `Account Number (was #${oldAcct}, now #${updatePayload.accountNumber})`
                      : f,
          )
          .join(", ");
        const adminDbForAudit = getFirebaseAdminDb();
        const auditPayload: Record<string, unknown> = {
          action: "edit_credentials",
          performedByEmail: session.email ?? "admin@aurora.bank",
          targetUid: uid,
          targetEmail,
          reason: `Admin modified credentials: ${fieldList}`,
          fieldsChanged: changedSensitive,
          createdAt: FieldValue.serverTimestamp(),
        };
        await adminDbForAudit.collection("adminAudits").add(auditPayload);
      } catch (auditErr) {
        console.error(
          "ADMIN PATCH: credential edit audit log write failed (non-fatal):",
          auditErr,
        );
      }
    }

    try {
      const publicPayload: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
      let syncedAny = false;
      if ("firstName" in updatePayload) { publicPayload.firstName = updatePayload.firstName; syncedAny = true; }
      if ("middleName" in updatePayload) { publicPayload.middleName = updatePayload.middleName; syncedAny = true; }
      if ("lastName" in updatePayload) { publicPayload.lastName = updatePayload.lastName; syncedAny = true; }
      if ("displayName" in updatePayload) { publicPayload.displayName = updatePayload.displayName; syncedAny = true; }
      if ("accountNumber" in updatePayload) { publicPayload.accountNumber = updatePayload.accountNumber; syncedAny = true; }
      if ("accountStatus" in updatePayload) { publicPayload.accountStatus = updatePayload.accountStatus; syncedAny = true; }
      if ("blocked" in updatePayload) { publicPayload.blocked = updatePayload.blocked; syncedAny = true; }
      if ("photoURL" in updatePayload) { publicPayload.photoURL = updatePayload.photoURL; syncedAny = true; }
      if ("photoVersion" in updatePayload) { publicPayload.photoVersion = updatePayload.photoVersion; syncedAny = true; }
      if (syncedAny) {
        await publicRef.set(publicPayload, { merge: true });
      }
    } catch (e) {
      console.warn("ADMIN PATCH: Failed to sync publicUsers for uid", uid, e);
    }

    if (updatePayload.email && typeof updatePayload.email === "string") {
      try {
        const adminAuth = getFirebaseAdminAuth();
        await adminAuth.updateUser(uid, { email: updatePayload.email });
      } catch (e) {
        console.error("ADMIN PATCH: Firebase Auth updateUser email failed:", e);
      }
    }

    const snap = await docRef.get();
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      ok: true as const,
      user: {
        uid: snap.id,
        firstName: typeof data.firstName === "string" ? data.firstName : "",
        middleName: typeof data.middleName === "string" ? data.middleName : "",
        lastName: typeof data.lastName === "string" ? data.lastName : "",
        displayName: typeof data.displayName === "string" ? data.displayName : "",
        email: typeof data.email === "string" ? data.email : "",
        accountNumber: typeof data.accountNumber === "string" ? data.accountNumber : "",
        language: typeof data.language === "string" ? data.language : "",
        location: data.location ?? {},
        address: typeof data.address === "string" ? data.address : "",
        city: typeof data.city === "string" ? data.city : "",
        state: typeof data.state === "string" ? data.state : "",
        zipCode: typeof data.zipCode === "string" ? data.zipCode : "",
        dob: typeof data.dob === "string" ? data.dob : "",
        mobile: typeof data.mobile === "string" ? data.mobile : "",
        phone: typeof data.phone === "string" ? data.phone : undefined,
        blocked: typeof data.blocked === "boolean" ? data.blocked : false,
        accountStatus:
          typeof data.accountStatus === "string" ? data.accountStatus : "ACTIVE",
        accountPinPlain: decryptOptional(data.accountPin),
        transferCodePlain: decryptOptional(data.transferCode),
        passwordPlain: decryptOptional(data.password),
      },
    });
  } catch (e) {
    console.error("ADMIN PATCH USER FAILED:", e);
    const msg = e instanceof Error ? e.message : "Failed to update user.";
    return jsonError(500, msg);
  }
}

