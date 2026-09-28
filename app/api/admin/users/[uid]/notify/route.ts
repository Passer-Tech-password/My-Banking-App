import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/admin/session";
import { getFirebaseAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

function jsonError(status: number, message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false as const, error: message, ...(details ? { details } : {}) },
    { status },
  );
}

function emailAvatarHtml(args: {
  displayName: string;
  avatarUrl: string;
  bankName: string;
  year: number;
}) {
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><title>${args.bankName} — Your Profile Picture</title></head>
<body style="margin:0;background:#f6f7fb;font-family:Inter,system-ui,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="padding:32px 16px 48px 16px;">
      <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1d4ed8,#0ea5e9);color:#fff;padding:24px 28px;">
          <div style="font-weight:700;letter-spacing:0.2px;font-size:18px;">${args.bankName}</div>
          <div style="opacity:0.9;font-size:13px;margin-top:2px;">Profile picture updated by your account manager</div>
        </td></tr>
        <tr><td style="padding:28px;">
          <div style="font-size:16px;font-weight:600;margin:0 0 8px 0;">Hi ${args.displayName},</div>
          <p style="margin:0 0 20px 0;font-size:14px;line-height:1.55;color:#374151;">
            Your account manager has updated your profile picture. You can preview it here or copy the direct link below to use elsewhere.
          </p>
          <div style="text-align:center;padding:20px;background:#f9fafb;border:1px dashed #d1d5db;border-radius:12px;margin-bottom:20px;">
            <img src="${args.avatarUrl}" alt="Your profile picture" style="display:block;width:160px;height:160px;object-fit:cover;border-radius:50%;margin:0 auto 12px auto;border:4px solid #fff;box-shadow:0 4px 18px rgba(0,0,0,0.08);" />
            <div style="font-size:12px;color:#6b7280;">Profile picture preview (160×160)</div>
          </div>
          <div style="margin:0 0 20px 0;">
            <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">Direct URL</div>
            <div style="word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;padding:10px 12px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;color:#111827;">${args.avatarUrl}</div>
          </div>
          <a href="${args.avatarUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:11px 18px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;line-height:1;">Open image in new tab</a>
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #f3f4f6;color:#6b7280;font-size:12px;line-height:1.5;">
          If you did not request this change, reply to this email or contact support immediately. &copy; ${args.year} ${args.bankName}. All rights reserved.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailAvatarText(args: {
  displayName: string;
  avatarUrl: string;
  bankName: string;
  year: number;
}) {
  return `${args.bankName} — Your profile picture has been updated.\n\nHi ${args.displayName},\n\nYour account manager has updated your profile picture. You can access the image directly using this link:\n${args.avatarUrl}\n\nIf you did not request this change, reply to this email or contact support immediately.\n\n© ${args.year} ${args.bankName}`;
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

    let rawBody = "";
    try {
      rawBody = await req.text();
    } catch {
      rawBody = "";
    }
    let parsed: null | { sendChannel?: unknown; customMessage?: unknown } = null;
    if (rawBody) {
      try {
        parsed = JSON.parse(rawBody) as { sendChannel?: unknown; customMessage?: unknown };
      } catch {
        return jsonError(400, "Invalid JSON body.");
      }
    }

    const sendChannel =
      typeof parsed?.sendChannel === "string" && parsed.sendChannel.length > 0
        ? parsed.sendChannel
        : "email";
    if (sendChannel !== "email") {
      return jsonError(400, `Unsupported send channel: ${sendChannel}. Only "email" is currently enabled.`);
    }
    const customMessage =
      typeof parsed?.customMessage === "string" ? parsed.customMessage.trim().slice(0, 1000) : "";

    const apiKey = String(process.env.RESEND_API_KEY || "").trim();
    if (!apiKey) {
      return jsonError(400, "RESEND_API_KEY is not configured on the server.");
    }

    const adminDb = getFirebaseAdminDb();
    const snap = await adminDb.doc(`users/${uid}`).get();
    if (!snap.exists) return jsonError(404, "User account not found.");
    const data = (snap.data() ?? {}) as Record<string, unknown>;
    const email = typeof data.email === "string" ? data.email.trim() : "";
    if (!email) return jsonError(400, "User has no email on file.");

    const photoURL = typeof data.photoURL === "string" ? data.photoURL.trim() : "";
    if (!photoURL) {
      return jsonError(400, "No profile picture is set for this user yet. Upload one first, then send it.");
    }

    const firstName = typeof data.firstName === "string" ? data.firstName : "";
    const lastName = typeof data.lastName === "string" ? data.lastName : "";
    const middleName = typeof data.middleName === "string" ? data.middleName : "";
    const displayName =
      typeof data.displayName === "string" && data.displayName.trim()
        ? data.displayName
        : [firstName, middleName, lastName].filter(Boolean).join(" ") || email;

    const resend = new Resend(apiKey);
    const subject = "Your Aurora Bank profile picture has been updated";
    const { data: resendData, error } = await resend.emails.send({
      from: "Aurora Bank <onboarding@resend.dev>",
      to: [email],
      subject,
      html: emailAvatarHtml({
        displayName,
        avatarUrl: photoURL,
        bankName: "Aurora Bank",
        year: new Date().getFullYear(),
      }),
      text: emailAvatarText({
        displayName,
        avatarUrl: photoURL,
        bankName: "Aurora Bank",
        year: new Date().getFullYear(),
      }),
      replyTo: session.email,
    });

    if (error) {
      console.error("ADMIN NOTIFY AVATAR SEND FAILED:", error);
      return jsonError(502, "Failed to deliver avatar notification via email.", {
        providerError: String(error.message || String(error)),
      });
    }

    await adminDb.collection("adminAudits").add({
      action: "notify_avatar",
      performedByEmail: session.email,
      targetUid: uid,
      targetEmail: email,
      sendChannel,
      customMessage,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true as const,
      sent: true,
      channel: sendChannel,
      to: email,
      messageId: resendData && typeof (resendData as { id?: unknown }).id === "string" ? (resendData as { id: string }).id : undefined,
    });
  } catch (e) {
    console.error("ADMIN NOTIFY AVATAR FAILED:", e);
    const msg = e instanceof Error ? e.message : "Unknown error.";
    if (msg.startsWith("Missing environment variable:")) {
      return jsonError(500, `Server configuration missing: ${msg}`);
    }
    return jsonError(500, msg);
  }
}
