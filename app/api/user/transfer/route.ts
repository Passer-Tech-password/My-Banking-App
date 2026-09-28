import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminAuth, getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { decryptString } from "@/lib/admin/encryption";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TransferBody {
  recipientAccountNumber?: unknown;
  amount?: unknown;
  pin?: unknown;
  transferCode?: unknown;
  reference?: unknown;
}

type ApiErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "not_eligible"
  | "invalid_pin"
  | "invalid_transfer_code"
  | "insufficient_balance"
  | "recipient_not_found"
  | "self_transfer"
  | "account_restricted"
  | "internal_error";

function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      ok: false as const,
      code,
      message,
      ...(details ? { details } : {}),
    },
    { status },
  );
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

function safeEqual(a: string, b: string): boolean {
  try {
    const len = Math.max(64, a.length, b.length);
    const bufA = Buffer.alloc(len, 0);
    const bufB = Buffer.alloc(len, 0);
    bufA.write(a);
    bufB.write(b);
    return crypto.timingSafeEqual(bufA, bufB) && a === b;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const adminAuth = getFirebaseAdminAuth();
  const adminDb = getFirebaseAdminDb();

  let uid: string | null = null;
  try {
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    const idToken = match?.[1];
    if (!idToken) {
      return jsonError(401, "unauthorized", "Missing Authorization bearer token.");
    }

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken);
    } catch {
      return jsonError(401, "unauthorized", "Invalid or expired Firebase ID token.");
    }
    uid = String(decoded.uid || "").trim();
    if (!uid) {
      return jsonError(401, "unauthorized", "Invalid token payload.");
    }
  } catch (e) {
    console.error("[TRANSFER] Auth preamble failed:", e);
    return jsonError(500, "internal_error", "Failed to authenticate request.");
  }

  let body: TransferBody | null = null;
  try {
    const raw = await req.text();
    body = raw ? (JSON.parse(raw) as TransferBody) : {};
  } catch {
    return jsonError(400, "invalid_request", "Invalid JSON body.");
  }

  const recipientAccountNumber =
    typeof body?.recipientAccountNumber === "string"
      ? body.recipientAccountNumber.trim()
      : "";
  const amountRaw = body?.amount;
  const pinInput = typeof body?.pin === "string" ? body.pin.trim() : "";
  const transferCodeInput =
    typeof body?.transferCode === "string" ? body.transferCode.trim() : "";
  const referenceNote =
    typeof body?.reference === "string" ? body.reference.trim().slice(0, 200) : "";

  const fieldErrors: Record<string, string> = {};
  if (!isAccountNumber(recipientAccountNumber)) {
    fieldErrors.recipientAccountNumber =
      "Recipient account number must be exactly 10 digits.";
  }
  let amount = 0;
  if (amountRaw === undefined || amountRaw === null || amountRaw === "") {
    fieldErrors.amount = "Amount is required.";
  } else {
    const n = typeof amountRaw === "number" ? amountRaw : Number(String(amountRaw));
    if (!Number.isFinite(n) || n <= 0) {
      fieldErrors.amount = "Amount must be greater than zero.";
    } else {
      amount = Math.round(n * 100) / 100;
    }
  }
  if (!isPin(pinInput)) {
    fieldErrors.pin = "PIN must be exactly 6 digits.";
  }
  if (!isTransferCode(transferCodeInput)) {
    fieldErrors.transferCode = "Transfer code must be exactly 6 digits.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return jsonError(400, "invalid_request", "Validation failed.", {
      fields: fieldErrors,
    });
  }

  try {
    const senderRef = adminDb.doc(`users/${uid}`);
    const senderSnap = await senderRef.get();
    if (!senderSnap.exists) {
      return jsonError(401, "unauthorized", "Sender profile not found.");
    }
    const senderData = senderSnap.data() as Record<string, unknown> | undefined;
    if (!senderData) {
      return jsonError(500, "internal_error", "Sender profile is empty.");
    }

    const senderAccountNumber = String(senderData.accountNumber || "").trim();
    const encryptedPin = String(senderData.accountPin || "");
    const encryptedTransferCode = String(senderData.transferCode || "");

    if (
      !isAccountNumber(senderAccountNumber) ||
      !encryptedPin ||
      !encryptedTransferCode
    ) {
      return jsonError(
        403,
        "not_eligible",
        "This account is not eligible for peer transfers. Transfers are only available for accounts generated through the Admin Portal with a registered account number, PIN, and transfer code.",
      );
    }

    const blocked = senderData.blocked === true || senderData.blocked === "true";
    const statusRaw = String(senderData.accountStatus || "ACTIVE").toUpperCase();
    if (blocked || statusRaw !== "ACTIVE") {
      return jsonError(
        403,
        "account_restricted",
        "Your account is currently restricted and cannot send transfers.",
      );
    }

    if (recipientAccountNumber === senderAccountNumber) {
      return jsonError(
        400,
        "self_transfer",
        "You cannot transfer funds to your own account number.",
      );
    }

    const balanceRaw = senderData.balance;
    const currentBalance =
      typeof balanceRaw === "number"
        ? balanceRaw
        : Number(String(balanceRaw ?? "0"));
    if (!Number.isFinite(currentBalance)) {
      return jsonError(500, "internal_error", "Could not read account balance.");
    }
    if (currentBalance < amount) {
      return jsonError(
        400,
        "insufficient_balance",
        "Insufficient funds to complete this transfer.",
        {
          available: Math.round(currentBalance * 100) / 100,
          requested: amount,
        },
      );
    }

    let storedPin = "";
    let storedTransferCode = "";
    try {
      storedPin = decryptString(encryptedPin);
      storedTransferCode = decryptString(encryptedTransferCode);
    } catch (e) {
      console.error("[TRANSFER] Credential decryption failed:", e);
      return jsonError(
        500,
        "internal_error",
        "Unable to verify account credentials at this time.",
      );
    }

    const pinOk = isPin(storedPin) && safeEqual(pinInput, storedPin);
    const transferCodeOk =
      isTransferCode(storedTransferCode) &&
      safeEqual(transferCodeInput, storedTransferCode);
    if (!pinOk && !transferCodeOk) {
      return jsonError(
        401,
        "invalid_pin",
        "Incorrect account PIN and transfer code.",
      );
    }
    if (!pinOk) {
      return jsonError(401, "invalid_pin", "Incorrect account PIN.");
    }
    if (!transferCodeOk) {
      return jsonError(
        401,
        "invalid_transfer_code",
        "Incorrect transfer code.",
      );
    }

    const recipientQ = await adminDb
      .collection("users")
      .where("accountNumber", "==", recipientAccountNumber)
      .limit(1)
      .get();
    if (recipientQ.empty) {
      return jsonError(
        404,
        "recipient_not_found",
        "No account found with the provided recipient account number.",
      );
    }
    const recipientDoc = recipientQ.docs[0]!;
    const recipientUid = recipientDoc.id;
    const recipientData = recipientDoc.data() as Record<string, unknown> | undefined;
    const recipientBlocked =
      recipientData?.blocked === true || recipientData?.blocked === "true";
    const recipientStatusRaw = String(
      recipientData?.accountStatus || "ACTIVE",
    ).toUpperCase();
    if (recipientBlocked || recipientStatusRaw !== "ACTIVE") {
      return jsonError(
        403,
        "account_restricted",
        "The recipient account is restricted and cannot receive transfers at this time.",
      );
    }
    const recipientName =
      (recipientData?.firstName && recipientData?.lastName
        ? `${String(recipientData.firstName)} ${String(recipientData.lastName)}`
        : "") ||
      String(recipientData?.displayName || recipientData?.name || "") ||
      "Account Holder";
    const senderName =
      (senderData.firstName && senderData.lastName
        ? `${String(senderData.firstName)} ${String(senderData.lastName)}`
        : "") ||
      String(senderData.displayName || senderData.name || "") ||
      "Account Holder";

    const recipientRef = adminDb.doc(`users/${recipientUid}`);

    const txId = crypto.randomBytes(16).toString("hex");
    const dateIso = new Date().toISOString();
    const description = referenceNote
      ? `Transfer to ${recipientAccountNumber} — ${referenceNote}`
      : `Transfer to account ${recipientAccountNumber}`;
    const incomingDescription = referenceNote
      ? `Transfer from ${senderAccountNumber} — ${referenceNote}`
      : `Transfer from account ${senderAccountNumber}`;

    await adminDb.runTransaction(async (tx) => {
      const s = await tx.get(senderRef);
      const r = await tx.get(recipientRef);
      if (!s.exists) {
        throw Object.assign(new Error("Sender missing during atomic commit"), {
          code: "sender_missing",
        });
      }
      if (!r.exists) {
        throw Object.assign(new Error("Recipient missing during atomic commit"), {
          code: "recipient_missing",
        });
      }
      const sData = s.data() as Record<string, unknown> | undefined;
      const rData = r.data() as Record<string, unknown> | undefined;
      const sBal =
        typeof sData?.balance === "number"
          ? sData.balance
          : Number(String(sData?.balance ?? "0"));
      const rBal =
        typeof rData?.balance === "number"
          ? rData.balance
          : Number(String(rData?.balance ?? "0"));
      if (!Number.isFinite(sBal) || sBal < amount) {
        throw Object.assign(new Error("Insufficient balance at commit time"), {
          code: "insufficient_balance_atomically",
        });
      }
      const newSenderBal = Math.round((sBal - amount) * 100) / 100;
      const newRecipientBal = Math.round((rBal + amount) * 100) / 100;
      tx.set(
        senderRef,
        { balance: newSenderBal, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      tx.set(
        recipientRef,
        { balance: newRecipientBal, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );

      const outgoingTx: Record<string, unknown> = {
        userId: uid,
        type: "transfer",
        direction: "outgoing",
        amount,
        date: dateIso,
        description,
        status: "completed",
        senderName,
        receiverName: recipientName,
        counterpartyAccountNumber: recipientAccountNumber,
        counterpartyUid: recipientUid,
        reference: referenceNote || null,
        transferId: txId,
        createdAt: FieldValue.serverTimestamp(),
      };

      const incomingTx: Record<string, unknown> = {
        userId: recipientUid,
        type: "transfer",
        direction: "incoming",
        amount,
        date: dateIso,
        description: incomingDescription,
        status: "completed",
        senderName,
        receiverName: recipientName,
        counterpartyAccountNumber: senderAccountNumber,
        counterpartyUid: uid,
        reference: referenceNote || null,
        transferId: txId,
        createdAt: FieldValue.serverTimestamp(),
      };

      tx.set(adminDb.collection("transactions").doc(), outgoingTx);
      tx.set(adminDb.collection("transactions").doc(), incomingTx);
    });

    const newBalanceSnap = await senderRef.get();
    const updatedBalance =
      Number((newBalanceSnap.data() as Record<string, unknown> | undefined)?.balance ?? 0) ||
      0;

    return NextResponse.json({
      ok: true as const,
      transferId: txId,
      amount,
      amountFormatted: `$${amount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      recipientAccountNumber,
      recipientName,
      balance: Math.round(updatedBalance * 100) / 100,
      balanceFormatted: `$${updatedBalance.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      reference: referenceNote || null,
      date: dateIso,
    });
  } catch (e: any) {
    const code = typeof e?.code === "string" ? String(e.code) : "";
    if (code === "insufficient_balance_atomically") {
      return jsonError(
        400,
        "insufficient_balance",
        "Insufficient funds to complete this transfer.",
      );
    }
    if (code === "sender_missing" || code === "recipient_missing") {
      return jsonError(
        404,
        "recipient_not_found",
        "One of the accounts was not available at the time of transfer. Please try again.",
      );
    }
    console.error("[TRANSFER] Top-level failure:", e);
    const msg = e instanceof Error ? e.message : "Transfer failed unexpectedly.";
    return jsonError(500, "internal_error", msg);
  }
}
