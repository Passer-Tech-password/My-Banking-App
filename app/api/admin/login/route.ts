import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_OPTIONS,
  SESSION_COOKIE_NAME,
  issueSession,
  verifyCredentials,
} from "@/lib/admin/session";
import {
  checkRateLimit,
  clearRateLimit,
  getClientIp,
} from "@/lib/admin/rate-limit";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

function validateEmailFormat(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validatePasswordComplexity(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

function maskEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return "";
  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return trimmed;
  if (local.length <= 2) {
    return `${local.slice(0, 1)}••@${domain}`;
  }
  const first = local.slice(0, 2);
  const last = local.slice(-1);
  const middle = "•••";
  return `${first}${middle}${last}@${domain}`;
}

function passwordHint(password: string): { ok: boolean; reason?: string } {
  if (!password) return { ok: false, reason: "not set" };
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const len = password.length;
  if (len < 8) return { ok: false, reason: `length=${len} must be >= 8` };
  if (!hasUpper) return { ok: false, reason: "missing uppercase letter" };
  if (!hasLower) return { ok: false, reason: "missing lowercase letter" };
  if (!hasDigit) return { ok: false, reason: "missing digit" };
  return { ok: true };
}

export async function GET(_req: NextRequest) {
  const email = String(process.env.ADMIN_EMAIL || "").trim();
  const password = String(process.env.ADMIN_PASSWORD || "");
  const secretRaw = String(process.env.ADMIN_SESSION_SECRET || "").trim();
  const encryptionKey = String(process.env.ENCRYPTION_KEY || "").trim();
  const fbProject = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  const fbClient = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const fbKey = String(process.env.FIREBASE_PRIVATE_KEY || "").trim();

  const emailStatus = email && validateEmailFormat(email) ? "ok" : email ? "invalid_format" : "missing";
  const pwdInfo = passwordHint(password);
  const secretStatus = secretRaw.length >= 16 ? "ok" : secretRaw ? "too_short" : "missing";
  const encStatus = encryptionKey ? "ok" : "missing";
  const firebaseStatus = fbProject && fbClient && fbKey.startsWith("-----BEGIN")
    ? "ok"
    : "missing_or_invalid";

  const checks = {
    email: { status: emailStatus, hint: email ? maskEmail(email) : undefined },
    password: { status: pwdInfo.ok ? "ok" : pwdInfo.reason === "not set" ? "missing" : "rejected", reason: pwdInfo.reason },
    sessionSecret: { status: secretStatus, minCharsRequired: 16 },
    encryptionKey: { status: encStatus },
    firebaseAdmin: { status: firebaseStatus, projectId: fbProject || undefined },
  };

  const allOk =
    checks.email.status === "ok" &&
    checks.password.status === "ok" &&
    checks.sessionSecret.status === "ok";

  let fingerprint = "";
  try {
    const payload = [email, password.length, secretRaw.length, encryptionKey.length, fbProject, fbClient].join("|");
    fingerprint = crypto.createHash("sha1").update(payload, "utf8").digest("hex").slice(0, 10);
  } catch {}

  const missingVars: string[] = [];
  if (checks.email.status !== "ok") missingVars.push("ADMIN_EMAIL");
  if (checks.password.status !== "ok") missingVars.push("ADMIN_PASSWORD");
  if (checks.sessionSecret.status !== "ok") missingVars.push("ADMIN_SESSION_SECRET");
  if (checks.encryptionKey.status !== "ok") missingVars.push("ENCRYPTION_KEY");
  if (checks.firebaseAdmin.status !== "ok") missingVars.push("FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY");

  return NextResponse.json(
    {
      ok: allOk,
      adminConfigured: allOk,
      fingerprint,
      checks,
      missingVars,
      note: allOk
        ? "Admin portal is correctly configured on this server instance."
        : "Admin credentials are not configured in this server's environment. If deploying on Vercel, add the missing vars under Project → Settings → Environment Variables, then Redeploy. Environment variables are read only at boot time — a server restart / redeploy is required after changing them.",
      vercelSteps: [
        "Open https://vercel.com/ → select your project → Settings → Environment Variables.",
        "Add each variable below with environment Production checked (and Preview/Development if desired).",
        "After saving, go to Deployments → click the ⋯ menu on the latest successful deployment → Redeploy.",
        "Wait for the new deployment to finish building, then reload /admin/login.",
      ],
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Admin-Config-Status": allOk ? "ok" : "env-missing",
      },
    },
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateCheck = checkRateLimit(ip, "admin-login");

  if (!rateCheck.allowed) {
    const retryAfterSec = Math.ceil(rateCheck.resetMs / 1000);
    return NextResponse.json(
      {
        ok: false as const,
        error: `Too many login attempts. Please try again in ${retryAfterSec} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil((Date.now() + rateCheck.resetMs) / 1000)),
        },
      },
    );
  }

  let body: LoginBody | null = null;
  try {
    const raw = await req.text();
    body = raw ? (JSON.parse(raw) as LoginBody) : {};
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !validateEmailFormat(email)) {
    return NextResponse.json(
      { ok: false as const, error: "Please enter a valid email address" },
      { status: 400 },
    );
  }

  if (!password || !validatePasswordComplexity(password)) {
    return NextResponse.json(
      {
        ok: false as const,
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, and numbers",
      },
      { status: 400 },
    );
  }

  await new Promise((r) => setTimeout(r, 250 + Math.random() * 250));

  const result = verifyCredentials({ email, password });
  if (!result.ok || !result.email) {
    const isEnvIssue = result.reason === "missing_env";
    if (isEnvIssue) {
      console.warn(
        `[ADMIN LOGIN] verifyCredentials failed with reason=missing_env. ` +
          `This indicates ADMIN_EMAIL/ADMIN_PASSWORD were not loaded into the server process. ` +
          `Restart the Next.js dev/prod server after editing .env.local so new env values take effect.`,
      );
    } else {
      console.warn(
        `[ADMIN LOGIN] verifyCredentials failed for email="${email.slice(0, 3)}…" (input length=${email.length}).`,
      );
    }
    return NextResponse.json(
      { ok: false as const, error: "Invalid email or password" },
      {
        status: 401,
        headers: {
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          ...(isEnvIssue
            ? {
                "X-Admin-Config-Status": "env-missing",
                "X-Admin-Config-Restart-Hint":
                  "Server env vars not loaded. Restart the Next.js server after updating .env.local (environment variables are read only at boot time).",
              }
            : {}),
        },
      },
    );
  }

  clearRateLimit(ip, "admin-login");

  const token = issueSession({ email: result.email });
  const secure = req.nextUrl.protocol === "https:";

  const res = NextResponse.json({
    ok: true as const,
    redirectTo: "/admin/dashboard",
  });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: COOKIE_OPTIONS.httpOnly,
    sameSite: COOKIE_OPTIONS.sameSite,
    path: COOKIE_OPTIONS.path,
    maxAge: COOKIE_OPTIONS.maxAgeSec,
    secure,
  });
  return res;
}
