import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { uploadKycDocument } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const ALLOWED_DOC_TYPES = new Set([
  "application/pdf",
]);

const ALLOWED_TYPES = new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOC_TYPES]);

const MAX_BYTES = 10 * 1024 * 1024;

type KycDocumentType = "id_front" | "id_back" | "passport" | "proof_of_address" | "other";

function isKycDocType(v: unknown): v is KycDocumentType {
  return (
    v === "id_front" ||
    v === "id_back" ||
    v === "passport" ||
    v === "proof_of_address" ||
    v === "other"
  );
}

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false as const, error: message }, { status });
}

export async function POST(req: NextRequest, ctx: { params?: unknown }) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = verifySession(token);
    if (!session.ok) return jsonError(401, "Admin session required.");

    const paramsPromise = (ctx?.params ?? Promise.resolve({})) as Promise<{ uid?: unknown }>;
    const params = await paramsPromise;
    const uid = typeof params?.uid === "string" ? params.uid.trim() : "";
    if (!uid) return jsonError(400, "User uid missing from request path.");

    const adminDb = getFirebaseAdminDb();
    const doc = adminDb.doc(`users/${uid}`);
    const existing = await doc.get();
    if (!existing.exists) return jsonError(404, "User account not found.");

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError(400, "Could not parse upload form.");
    }

    const file = form.get("file");
    if (!(file instanceof File)) return jsonError(400, "Missing `file` form field.");

    const docTypeRaw = form.get("documentType");
    const docTypeStr = typeof docTypeRaw === "string" ? docTypeRaw.trim() : "other";
    const documentType: KycDocumentType = isKycDocType(docTypeStr) ? docTypeStr : "other";

    const declared = file.type || "";
    if (!ALLOWED_TYPES.has(declared)) {
      return jsonError(
        400,
        `Invalid file type. Allowed: JPG, PNG, GIF, WEBP, PDF. Got: ${declared || file.name || "unknown"}`,
      );
    }

    if (file.size > MAX_BYTES) {
      return jsonError(
        400,
        `File too large. Max size: 10MB (${MAX_BYTES.toLocaleString()} bytes). Got: ${file.size.toLocaleString()} bytes.`,
      );
    }
    if (file.size <= 0) return jsonError(400, "Empty file received.");

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch {
      return jsonError(400, "Could not read uploaded file.");
    }

    const upload = await uploadKycDocument({
      uid,
      buffer,
      fileName: file.name,
      contentType: declared,
      documentType,
    });

    const url = typeof upload.secure_url === "string" ? upload.secure_url.trim() : "";
    if (!url) return jsonError(500, "Upload succeeded but returned no URL.");

    const version =
      typeof upload.version === "number" && Number.isFinite(upload.version) && upload.version > 0
        ? upload.version
        : Date.now();

    const kyckey = `kyc_${documentType}`;
    await doc.set(
      {
        [kyckey]: {
          url,
          version,
          format: upload.format,
          bytes: upload.bytes,
          fileName: file.name,
          uploadedAt: FieldValue.serverTimestamp(),
          uploadedBy: session.email,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({
      ok: true as const,
      url,
      version,
      documentType,
      format: upload.format,
      bytes: upload.bytes,
      kyckey,
    });
  } catch (e) {
    console.error("ADMIN KYC UPLOAD FAILED:", e);
    const msg = e instanceof Error ? e.message : "Upload failed.";
    if (msg.startsWith("Missing environment variable:")) {
      return jsonError(
        500,
        `Server configuration missing: ${msg}. Restart dev server after updating .env.local.`,
      );
    }
    return jsonError(500, msg);
  }
}
