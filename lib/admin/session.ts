import crypto from "node:crypto";

// IMPORTANT: ADMIN_EMAIL / ADMIN_PASSWORD are read from process.env at import time.
// If you change these values in .env.local, you MUST restart the Next.js dev server
// (and the production Node.js process) for the new values to take effect. There is
// no hot-reload for server-side environment variables.
const CREDENTIAL_ERROR = "Invalid email or password";
const CONFIG_WARN_PREFIX = "[ADMIN AUTH CONFIG]";
const TOKEN_VERSION = "v1";
const TOKEN_MAX_AGE_SEC = 8 * 60 * 60;
const COOKIE_MAX_AGE_SEC = 2 * 60 * 60;
const FALLBACK_SECRET_STR =
  "admin_fallback_secret_please_set_env_48chars_minimum";

let adminEnvDiagnosticEmitted = false;
type AdminEnvStatus =
  | { ok: true; expectedEmail: string; expectedPassword: string }
  | { ok: false; reason: "missing-email" | "missing-password" | "weak-password" | "bad-email-format" };

function getAdminEnvStatus(): AdminEnvStatus {
  const expectedEmailRaw = String(process.env.ADMIN_EMAIL || "").trim();
  const expectedPasswordRaw = String(process.env.ADMIN_PASSWORD || "");
  if (!expectedEmailRaw) {
    if (!adminEnvDiagnosticEmitted) {
      console.warn(
        `${CONFIG_WARN_PREFIX} ADMIN_EMAIL is not set in the server environment. Admin login will always fail. Restart the server after setting ADMIN_EMAIL in .env.local.`,
      );
      adminEnvDiagnosticEmitted = true;
    }
    return { ok: false, reason: "missing-email" };
  }
  if (!expectedPasswordRaw) {
    if (!adminEnvDiagnosticEmitted) {
      console.warn(
        `${CONFIG_WARN_PREFIX} ADMIN_PASSWORD is not set in the server environment. Admin login will always fail. Restart the server after setting ADMIN_PASSWORD in .env.local.`,
      );
      adminEnvDiagnosticEmitted = true;
    }
    return { ok: false, reason: "missing-password" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(expectedEmailRaw)) {
    if (!adminEnvDiagnosticEmitted) {
      console.warn(
        `${CONFIG_WARN_PREFIX} ADMIN_EMAIL="${expectedEmailRaw}" does not look like a valid email address.`,
      );
      adminEnvDiagnosticEmitted = true;
    }
    return { ok: false, reason: "bad-email-format" };
  }
  if (expectedPasswordRaw.length < 8) {
    if (!adminEnvDiagnosticEmitted) {
      console.warn(
        `${CONFIG_WARN_PREFIX} ADMIN_PASSWORD is shorter than 8 characters. It will be rejected by the server-side complexity check. Value is not logged for security.`,
      );
      adminEnvDiagnosticEmitted = true;
    }
    return { ok: false, reason: "weak-password" };
  }
  return { ok: true, expectedEmail: expectedEmailRaw, expectedPassword: expectedPasswordRaw };
}

let fallbackSecret: Buffer | null = null;

function getSigningSecret(): Buffer {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured && String(configured).trim().length >= 16) {
    return Buffer.from(String(configured).trim(), "utf8");
  }
  if (!fallbackSecret) {
    fallbackSecret = Buffer.from(FALLBACK_SECRET_STR, "utf8");
  }
  return fallbackSecret;
}

function padOrHashToLen(input: string, length: number): Buffer {
  const digest = crypto.createHash("sha256").update(input).digest();
  if (length <= digest.length) return digest.subarray(0, length);
  const out = Buffer.alloc(length);
  digest.copy(out);
  return out;
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const expectedLen = 64;
  const bufA = padOrHashToLen(a, expectedLen);
  const bufB = padOrHashToLen(b, expectedLen);
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export interface VerifyCredentialsResult {
  ok: boolean;
  email?: string;
  error?: string;
  reason?: "missing_env" | "invalid_credentials";
}

export function verifyCredentials(params: {
  email: string;
  password: string;
}): VerifyCredentialsResult {
  const envStatus = getAdminEnvStatus();
  if (!envStatus.ok) {
    return {
      ok: false,
      error: CREDENTIAL_ERROR,
      reason: "missing_env",
    };
  }
  const expectedEmailRaw = envStatus.expectedEmail;
  const expectedPasswordRaw = envStatus.expectedPassword;

  const inputEmail = String(params.email || "").trim().toLowerCase();
  const expectedEmail = expectedEmailRaw.toLowerCase();
  const inputPassword = String(params.password || "");
  const expectedPassword = expectedPasswordRaw;

  const emailOk = timingSafeEqualStrings(inputEmail, expectedEmail);
  const passwordOk = timingSafeEqualStrings(inputPassword, expectedPassword);

  if (emailOk && passwordOk) {
    return { ok: true, email: expectedEmailRaw };
  }
  return { ok: false, error: CREDENTIAL_ERROR, reason: "invalid_credentials" };
}

interface SessionPayload {
  v: string;
  email: string;
  iat: number;
  exp: number;
  nonce: string;
}

function b64urlEncode(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer | null {
  try {
    const s = String(input).replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    return Buffer.from(s + pad, "base64");
  } catch {
    return null;
  }
}

function computeHMAC(payloadBuf: Buffer): Buffer {
  const secret = getSigningSecret();
  return crypto.createHmac("sha256", secret).update(payloadBuf).digest();
}

export function issueSession(options?: {
  email?: string;
  maxAgeSec?: number;
}): string {
  const email =
    String(options?.email || process.env.ADMIN_EMAIL || "").trim() ||
    "ffclimmigration@gmail.com";
  const maxAgeSec = Math.max(
    60,
    Math.min(TOKEN_MAX_AGE_SEC, Number(options?.maxAgeSec) || COOKIE_MAX_AGE_SEC),
  );
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    v: TOKEN_VERSION,
    email,
    iat: now,
    exp: now + maxAgeSec,
    nonce: crypto.randomBytes(12).toString("hex"),
  };
  const payloadBuf = Buffer.from(JSON.stringify(payload), "utf8");
  const payloadB64 = b64urlEncode(payloadBuf);
  const sigBuf = computeHMAC(Buffer.from(payloadB64, "utf8"));
  const sigB64 = b64urlEncode(sigBuf);
  return `${payloadB64}.${sigB64}`;
}

export interface VerifySessionResult {
  ok: boolean;
  email?: string;
  expired?: boolean;
}

export function verifySession(token: unknown): VerifySessionResult {
  if (!token || typeof token !== "string") return { ok: false };
  const dot = token.indexOf(".");
  if (dot <= 0 || dot >= token.length - 1) return { ok: false };
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  const payloadBuf = b64urlDecode(payloadB64);
  const sigBuf = b64urlDecode(sigB64);
  if (!payloadBuf || !sigBuf) return { ok: false };
  const expected = computeHMAC(Buffer.from(payloadB64, "utf8"));
  if (expected.length !== sigBuf.length) return { ok: false };
  try {
    if (!crypto.timingSafeEqual(expected, sigBuf)) return { ok: false };
  } catch {
    return { ok: false };
  }
  let payload: SessionPayload;
  try {
    payload = JSON.parse(payloadBuf.toString("utf8")) as SessionPayload;
  } catch {
    return { ok: false };
  }
  if (!payload || payload.v !== TOKEN_VERSION) return { ok: false };
  if (typeof payload.exp !== "number" || typeof payload.email !== "string") {
    return { ok: false };
  }
  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp) return { ok: false, expired: true };
  return { ok: true, email: payload.email };
}

export const SESSION_COOKIE_NAME = "admin_session";
export const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAgeSec: COOKIE_MAX_AGE_SEC,
};
