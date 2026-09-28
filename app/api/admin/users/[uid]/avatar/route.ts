import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { uploadProfileImage } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export type AvatarSize = 256 | 512;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_BYTES = 5 * 1024 * 1024;

const JPEG_EXT = ["jpg", "jpeg", "JPG", "JPEG"];
const PNG_EXT = ["png", "PNG"];
const GIF_EXT = ["gif", "GIF"];
const WEBP_EXT = ["webp", "WEBP"];

function inferTypeFromName(name: string): string | undefined {
  const lower = name.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  return undefined;
}

function inferTypeFromExtOrType(fileName: string, declared: string): string | undefined {
  const byName = inferTypeFromName(fileName);
  if (!byName) return ALLOWED_CONTENT_TYPES.has(declared) ? declared : undefined;
  if (ALLOWED_CONTENT_TYPES.has(declared) && declared === byName) return declared;
  // trust file extension more when there is a mismatch (browser mime detection is best-effort)
  return byName;
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
    if (!(file instanceof File)) {
      return jsonError(400, "Missing `file` form field.");
    }

    const declared = file.type || "";
    const resolvedType = inferTypeFromExtOrType(file.name, declared);
    if (!resolvedType) {
      return jsonError(
        400,
        `Invalid file type. Allowed types: JPG, PNG, GIF, WEBP. Got: ${declared || file.name || "unknown"}`,
      );
    }
    if (!ALLOWED_CONTENT_TYPES.has(resolvedType)) {
      return jsonError(400, `Unsupported image format: ${resolvedType}`);
    }

    if (file.size > MAX_BYTES) {
      return jsonError(
        400,
        `File too large. Max size: 5MB (${MAX_BYTES.toLocaleString()} bytes). Got: ${file.size.toLocaleString()} bytes.`,
      );
    }
    if (file.size <= 0) {
      return jsonError(400, "Empty file received.");
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch {
      return jsonError(400, "Could not read uploaded file.");
    }

    // Secondary server-side magic-byte validation (catches extension-spoofed uploads with wrong bytes)
    const head = buffer.subarray(0, Math.min(16, buffer.length));
    const magic = {
      jpeg: head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff,
      png:
        head.length >= 8 &&
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47 &&
        head[4] === 0x0d &&
        head[5] === 0x0a &&
        head[6] === 0x1a &&
        head[7] === 0x0a,
      gif:
        head.length >= 6 &&
        head[0] === 0x47 &&
        head[1] === 0x49 &&
        head[2] === 0x46 &&
        head[3] === 0x38 &&
        (head[4] === 0x37 || head[4] === 0x39) &&
        head[5] === 0x61,
      webp:
        head.length >= 12 &&
        head[0] === 0x52 &&
        head[1] === 0x49 &&
        head[2] === 0x46 &&
        head[3] === 0x46 &&
        head[8] === 0x57 &&
        head[9] === 0x45 &&
        head[10] === 0x42 &&
        head[11] === 0x50,
    };
    const typeMatchesMagic =
      (resolvedType === "image/jpeg" && magic.jpeg) ||
      (resolvedType === "image/png" && magic.png) ||
      (resolvedType === "image/gif" && magic.gif) ||
      (resolvedType === "image/webp" && magic.webp);
    if (!typeMatchesMagic) {
      return jsonError(
        400,
        "Uploaded file does not match its declared format. Re-export the image in JPG/PNG/GIF/WEBP and try again.",
      );
    }

    const upload = await uploadProfileImage({ uid, buffer, contentType: resolvedType });
    const url = typeof upload.secure_url === "string" ? upload.secure_url.trim() : "";
    if (!url) return jsonError(500, "Upload succeeded but returned no URL.");

    const photoVersion =
      typeof upload.version === "number" && Number.isFinite(upload.version) && upload.version > 0
        ? upload.version
        : Date.now();

    await doc.set(
      {
        photoURL: url,
        photoVersion,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await adminDb
      .doc(`publicUsers/${uid}`)
      .set({ photoURL: url, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

    return NextResponse.json({
      ok: true as const,
      url,
      photoVersion,
      contentType: resolvedType,
      bytes: buffer.length,
    });
  } catch (e) {
    console.error("ADMIN AVATAR UPLOAD FAILED:", e);
    const msg = e instanceof Error ? e.message : "Upload failed.";
    if (msg.startsWith("Missing environment variable:")) {
      return jsonError(500, `Server configuration missing: ${msg}. Restart dev server after updating .env.local.`);
    }
    return jsonError(500, msg);
  }
}
