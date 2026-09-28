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
