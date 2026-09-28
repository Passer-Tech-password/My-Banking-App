const TOKEN_VERSION = "v1";
const FALLBACK_SECRET_STR =
  "admin_fallback_secret_please_set_env_48chars_minimum";

let cachedKey: CryptoKey | null | undefined = undefined;
let cachedSecretStr: string | null = null;

function getSecretString(): string {
  try {
    const configured =
      typeof process !== "undefined" &&
      process &&
      typeof process.env === "object" &&
      process.env !== null
        ? (process.env as Record<string, string | undefined>).ADMIN_SESSION_SECRET
        : undefined;
    if (configured && String(configured).trim().length >= 16) {
      return String(configured).trim();
    }
  } catch {
    // ignore
  }
  return FALLBACK_SECRET_STR;
}

async function importSigningKey(): Promise<CryptoKey> {
  const secret = getSecretString();
  if (cachedKey && cachedSecretStr === secret) {
    return cachedKey;
  }
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const imported = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  cachedKey = imported;
  cachedSecretStr = secret;
  return imported;
}

function b64urlToBytes(input: string): Uint8Array | null {
  try {
    const s = String(input).replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s + pad;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

interface SessionPayload {
  v: string;
  email: string;
  iat: number;
  exp: number;
  nonce: string;
}

export interface VerifySessionEdgeResult {
  ok: boolean;
  email?: string;
  expired?: boolean;
}

export async function verifySessionEdge(
  token: unknown,
): Promise<VerifySessionEdgeResult> {
  if (!token || typeof token !== "string") return { ok: false };
  const dot = token.indexOf(".");
  if (dot <= 0 || dot >= token.length - 1) return { ok: false };
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  const payloadBytes = b64urlToBytes(payloadB64);
  const sigBytes = b64urlToBytes(sigB64);
  if (!payloadBytes || !sigBytes) return { ok: false };
  const key = await importSigningKey();
  try {
    const encoder = new TextEncoder();
    const dataToVerify = encoder.encode(payloadB64);
    const sigOk = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes as unknown as Uint8Array<ArrayBuffer>,
      dataToVerify as unknown as Uint8Array<ArrayBuffer>,
    );
    if (!sigOk) return { ok: false };
  } catch {
    return { ok: false };
  }
  let payload: SessionPayload;
  try {
    const decoder = new TextDecoder("utf8", { fatal: false });
    payload = JSON.parse(decoder.decode(payloadBytes)) as SessionPayload;
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
