import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { encryptString } from "@/lib/admin/encryption";
import { User } from "@/lib/User";
import { getDefaultAvatarUrl } from "@/lib/config";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateUserBody = {
  customerName?: unknown;
  accountNumber?: unknown;
  balance?: unknown;
  accountStatus?: unknown;
  email?: unknown;
  password?: unknown;
  pin?: unknown;
  transferCode?: unknown;
  photoURL?: unknown;
  location?: unknown;
  language?: unknown;
  kycDocuments?: unknown;
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
};

function jsonError(status: number, message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false as const, error: message, ...(details ? { details } : {}) },
    { status },
  );
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function isAccountNumber(v: string): boolean {
  return /^\d{10}$/.test(v);
}

function isPin(v: string): boolean {
  return /^\d{6}$/.test(v);
}

function isTransferCode(v: string): boolean {
  return /^\d{6}$/.test(v);
}

function isPasswordComplex(v: string): boolean {
  if (v.length < 8) return false;
  if (!/[A-Z]/.test(v)) return false;
  if (!/[a-z]/.test(v)) return false;
  if (!/[0-9]/.test(v)) return false;
  if (!/[^A-Za-z0-9]/.test(v)) return false;
  return true;
}

function isAccountStatus(v: string): v is "ACTIVE" | "inactive" {
  return v === "ACTIVE" || v === "inactive";
}

function randomDigits(len: number): string {
  const out: string[] = [];
  for (let i = 0; i < len; i++) {
    out.push(String(crypto.randomInt(0, 10)));
  }
  return out.join("");
}

function isMissingEnvError(e: unknown): string | null {
  if (e instanceof Error && /Missing environment variable:\s+(\w+)/.test(e.message)) {
    const m = e.message.match(/Missing environment variable:\s+(\w+)/);
    return m ? m[1]! : null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySession(token);
    if (!session.ok) {
      return jsonError(401, "Admin session required.");
    }

    let raw: string;
    try {
      raw = await req.text();
    } catch {
      return jsonError(400, "Could not read request body.");
    }
    let body: CreateUserBody | null = null;
    try {
      body = raw ? (JSON.parse(raw) as CreateUserBody) : {};
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "";
    const accountNumberRaw = typeof body?.accountNumber === "string" ? body.accountNumber.trim() : "";
    const balanceRaw = body?.balance;
    const accountStatusRaw = typeof body?.accountStatus === "string" ? body.accountStatus.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const pinRaw = typeof body?.pin === "string" ? body.pin.trim() : "";
    const transferCodeRaw = typeof body?.transferCode === "string" ? body.transferCode.trim() : "";

    const photoURLIn = typeof body?.photoURL === "string" ? body.photoURL.trim() : "";
    const firstNameIn = typeof body?.firstName === "string" ? body.firstName.trim() : "";
    const middleNameIn = typeof body?.middleName === "string" ? body.middleName.trim() : "";
    const lastNameIn = typeof body?.lastName === "string" ? body.lastName.trim() : "";
    const addressIn = typeof body?.address === "string" ? body.address.trim() : "";
    const cityIn = typeof body?.city === "string" ? body.city.trim() : "";
    const stateIn = typeof body?.state === "string" ? body.state.trim() : "";
    const zipCodeIn = typeof body?.zipCode === "string" ? body.zipCode.trim() : "";
    const dobIn = typeof body?.dob === "string" ? body.dob.trim() : "";
    const mobileIn = typeof body?.mobile === "string" ? body.mobile.trim() : "";
    const phoneIn = typeof body?.phone === "string" ? body.phone.trim() : "";
    const languageIn = typeof body?.language === "string" ? body.language.trim() : "";

    let locationIn: Record<string, unknown> | null = null;
    if (body?.location && typeof body.location === "object" && !Array.isArray(body.location)) {
      const l = body.location as Record<string, unknown>;
      locationIn = {};
      for (const k of ["country", "region", "city", "postalCode", "addressLine"]) {
        if (typeof l[k] === "string") locationIn[k] = l[k];
      }
      for (const k of ["latitude", "longitude"]) {
        const raw = l[k];
        const n = typeof raw === "number" ? raw : Number(String(raw ?? ""));
        if (Number.isFinite(n)) locationIn[k] = n;
      }
    }

    let kycDocumentsIn: Record<string, unknown> | null = null;
    if (body?.kycDocuments && typeof body.kycDocuments === "object" && !Array.isArray(body.kycDocuments)) {
      const k = body.kycDocuments as Record<string, unknown>;
      kycDocumentsIn = {};
      for (const key of Object.keys(k)) {
        const doc = k[key];
        if (doc && typeof doc === "object" && typeof (doc as any).url === "string") {
          kycDocumentsIn[key] = doc;
        }
      }
    }

    const errors: Record<string, string> = {};
    if (!customerName) errors.customerName = "Customer name is required.";
    if (!email) errors.email = "Login email is required.";
    else if (!isEmail(email)) errors.email = "Login email format is invalid.";
    if (!password) errors.password = "Login password is required.";
    else if (!isPasswordComplex(password))
      errors.password =
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character.";

    let accountNumber = accountNumberRaw;
    if (!accountNumber) {
      accountNumber = randomDigits(10);
    }
    if (!isAccountNumber(accountNumber))
      errors.accountNumber = "Account number must be exactly 10 digits.";

    let balance = 0;
    if (balanceRaw === undefined || balanceRaw === null || balanceRaw === "") {
      errors.balance = "Account balance is required.";
    } else {
      const n = typeof balanceRaw === "number" ? balanceRaw : Number(String(balanceRaw));
      if (!Number.isFinite(n) || n < 0) {
        errors.balance = "Account balance must be a non-negative number.";
      } else {
        balance = Math.round(n * 100) / 100;
      }
    }
    const accountStatusUnchecked = accountStatusRaw || "ACTIVE";
    const accountStatus = isAccountStatus(accountStatusUnchecked)
      ? accountStatusUnchecked
      : ("ACTIVE" as const);
    if (!isAccountStatus(accountStatusUnchecked))
      errors.accountStatus = "Account status must be ACTIVE or inactive.";
    const pin = pinRaw || randomDigits(6);
    if (!isPin(pin)) errors.pin = "Account PIN must be exactly 6 digits.";
    const transferCode = transferCodeRaw || randomDigits(6);
    if (!isTransferCode(transferCode))
      errors.transferCode = "Transfer code must be exactly 6 digits.";

    if (Object.keys(errors).length > 0) {
      return jsonError(400, "Validation failed.", { fields: errors });
    }

    const adminAuth = getFirebaseAdminAuth();
    const adminDb = getFirebaseAdminDb();

    try {
      const MAX_ACCT_RETRIES = accountNumberRaw ? 1 : 8;
      let acctCollision = true;
      for (let attempt = 0; attempt < MAX_ACCT_RETRIES && acctCollision; attempt++) {
        const existingAcctQ = await adminDb
          .collection("users")
          .where("accountNumber", "==", accountNumber)
          .limit(1)
          .get();
        acctCollision = !existingAcctQ.empty;
        if (acctCollision) {
          if (accountNumberRaw) {
            return jsonError(409, "Account number already in use. Use a different account number.", {
              fields: { accountNumber: "Account number is already assigned." },
            });
          }
          accountNumber = randomDigits(10);
        }
      }
      if (acctCollision) {
        return jsonError(500, "Failed to generate a unique account number. Please try again.");
      }
    } catch (e) {
      console.error("CREATE USER: existing account check failed:", e);
      return jsonError(500, "Failed to verify account number availability.");
    }

    const nameParts = customerName.split(/\s+/);
    const firstName = firstNameIn || nameParts[0] || customerName;
    const lastName = lastNameIn || (nameParts.length > 1 ? nameParts.slice(-1)[0]! : "");
    const middleName = middleNameIn || (nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : undefined);
    const displayName = customerName || [firstName, middleName, lastName].filter(Boolean).join(" ");

    let encryptedPin = "";
    let encryptedTransferCode = "";
    try {
      encryptedPin = encryptString(pin);
      encryptedTransferCode = encryptString(transferCode);
    } catch (e) {
      console.error("CREATE USER: encryption failed:", e);
      const missingVar = isMissingEnvError(e);
      if (missingVar) {
        return jsonError(500,
          `Failed to secure sensitive credentials: server env ${missingVar} is not set. ` +
          `Set ${missingVar} in .env.local, then fully restart the Next.js server (environment variables are loaded once at boot).`,
        );
      }
      return jsonError(500, "Failed to secure sensitive account credentials.");
    }

    let uid: string | null = null;
    try {
      const authPhotoURL = photoURLIn || getDefaultAvatarUrl(displayName || email);
      const authUser = await adminAuth.createUser({
        email,
        emailVerified: true,
        password,
        displayName,
        photoURL: authPhotoURL,
        disabled: accountStatus === "inactive",
      });
      uid = authUser.uid;
    } catch (e: any) {
      const code = typeof e?.code === "string" ? String(e.code) : "";
      if (code === "auth/email-already-exists" || code === "auth/email-already-in-use") {
        return jsonError(409, "A user with this login email already exists.", {
          fields: { email: "Email is already registered." },
        });
      }
      if (code === "auth/invalid-password") {
        return jsonError(400, "Firebase rejected the password. Ensure it meets minimum length.", {
          fields: { password: "Password does not meet provider requirements." },
        });
      }
      console.error("CREATE USER: Firebase Auth create failed:", e);
      return jsonError(500, "Failed to create user login credentials.");
    }

    try {
    const effectivePhotoURL = photoURLIn || getDefaultAvatarUrl(displayName || email);
    const userBuilder = User.builder()
      .setFirstName(firstName)
      .setLastName(lastName)
      .setEmail(email)
      .setRole("user")
      .setAccountNumber(accountNumber)
      .setBalance(balance)
      .setAccountStatus(accountStatus)
      .setAccountPin(encryptedPin)
      .setTransferCode(encryptedTransferCode)
      .setPhotoURL(effectivePhotoURL)
      .setAddress(addressIn)
      .setCity(cityIn)
      .setState(stateIn)
      .setZipCode(zipCodeIn)
      .setDob(dobIn)
      .setMobile(mobileIn);
    if (middleName) userBuilder.setMiddleName(middleName);
    if (phoneIn) userBuilder.setPhone(phoneIn);
    if (languageIn) userBuilder.setLanguage(languageIn);
    if (locationIn) userBuilder.setLocation(locationIn as any);
    if (kycDocumentsIn) userBuilder.setKycDocuments(kycDocumentsIn as any);

    const newUser = userBuilder.build();

    const profilePayload: Record<string, unknown> = {
      firstName: newUser.firstName,
      middleName: typeof newUser.middleName === "string" ? newUser.middleName : "",
      lastName: newUser.lastName,
      address: addressIn || newUser.address || "",
      state: stateIn || newUser.state || "",
      city: cityIn || newUser.city || "",
      zipCode: zipCodeIn || newUser.zipCode || "",
      dob: dobIn || newUser.dob || "",
      mobile: mobileIn || newUser.mobile || "",
      phone: phoneIn || (typeof newUser.phone === "string" ? newUser.phone : ""),
      email: newUser.email,
      accountType: newUser.accountType || "",
      currency: newUser.currency || "",
      ssnPin: newUser.ssnPin || "",
      passportUrl: typeof newUser.passportUrl === "string" ? newUser.passportUrl : "",
      photoURL: effectivePhotoURL,
      role: newUser.role || "user",
      accountNumber,
      balance,
      accountStatus,
      accountPin: encryptedPin,
      transferCode: encryptedTransferCode,
      displayName,
      blocked: accountStatus === "inactive",
      language: languageIn || "",
      location: locationIn || {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (kycDocumentsIn) {
      for (const k of Object.keys(kycDocumentsIn)) {
        profilePayload[`kyc_${k}`] = kycDocumentsIn[k];
      }
    }

    for (const k of Object.keys(profilePayload)) {
      if (profilePayload[k] === undefined) delete profilePayload[k];
    }

    await adminDb.doc(`users/${uid}`).create(profilePayload);

    const publicPayload: Record<string, unknown> = {
      email,
      name: displayName,
      photoURL: effectivePhotoURL,
      accountNumber,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    for (const k of Object.keys(publicPayload)) {
      if (publicPayload[k] === undefined) delete publicPayload[k];
    }
    await adminDb.doc(`publicUsers/${uid}`).set(publicPayload, { merge: true });

    try {
      const auditPayload: Record<string, unknown> = {
        action: "create",
        performedByEmail: session.email ?? "admin@aurora.bank",
        targetUid: uid,
        targetEmail: email,
        reason: `Created account #${accountNumber} with opening balance $${balance.toFixed(2)}`,
        createdAt: FieldValue.serverTimestamp(),
      };
      await adminDb.collection("adminAudits").add(auditPayload);
    } catch (auditErr) {
      console.error("CREATE USER: audit log write failed (non-fatal):", auditErr);
    }
  } catch (e) {
    console.error("CREATE USER: Firestore write failed, rolling back auth user:", e);
    try {
      if (uid) await adminAuth.deleteUser(uid);
    } catch (rb) {
      console.error("CREATE USER: rollback failed for auth user:", uid, rb);
    }
    return jsonError(500, "Failed to persist account profile. Changes rolled back.");
  }

    return NextResponse.json({
      ok: true as const,
      user: {
        uid,
        customerName,
        displayName,
        email,
        accountNumber,
        balance,
        balanceFormatted: `$${balance.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
        accountStatus,
        password,
        pin,
        transferCode,
      },
    });
  } catch (e) {
    console.error("CREATE USER: top-level uncaught error:", e);
    const missingVar = isMissingEnvError(e);
    if (missingVar) {
      return jsonError(500,
        `Server configuration error: ${missingVar} is not set. Set ${missingVar} in .env.local, ` +
        `then fully restart the Next.js dev/prod server. Environment variables are read only at boot time.`,
      );
    }
    if (e instanceof Error && e.message) {
      return jsonError(500, `Server error: ${e.message}`);
    }
    return jsonError(500, "An unexpected server error occurred. Please try again.");
  }
}
