import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";
import { signUploadParams, type SignedUploadParams } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignRequestBody = {
  uploadType?: unknown;
  uid?: unknown;
  resource_type?: unknown;
};

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false as const, error: message }, { status });
}

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
    let body: SignRequestBody | null = null;
    try {
      body = raw ? (JSON.parse(raw) as SignRequestBody) : {};
    } catch {
      return jsonError(400, "Invalid JSON body.");
    }

    const uploadTypeRaw = body?.uploadType;
    const uid = typeof body?.uid === "string" ? body.uid.trim() : "";
    if (!uid) return jsonError(400, "User uid is required.");

    let params: SignedUploadParams;
    if (uploadTypeRaw === "kyc") {
      params = {
        folder: "user_kyc",
        public_id: `${uid}_kyc_${Date.now()}`,
        resource_type: "auto",
        type: "authenticated",
        allowed_formats: ["jpg", "jpeg", "png", "pdf", "webp", "gif"],
      };
    } else if (uploadTypeRaw === "profile") {
      params = {
        folder: "user_profiles",
        public_id: `user_${uid}`,
        resource_type: "image",
        type: "upload",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      };
    } else {
      return jsonError(400, "Invalid uploadType. Must be 'profile' or 'kyc'.");
    }

    const signed = signUploadParams(params);
    return NextResponse.json({ ok: true as const, ...signed });
  } catch (e) {
    console.error("SIGN UPLOAD PARAMS FAILED:", e);
    const msg = e instanceof Error ? e.message : "Failed to sign upload.";
    if (msg.startsWith("Missing environment variable:")) {
      return jsonError(
        500,
        `Server configuration missing: ${msg}. Restart dev server after updating .env.local.`,
      );
    }
    return jsonError(500, msg);
  }
}
