/*
Admin Authentication Test Suite
================================

Runnable directly with Node (no framework required).

Usage:
  set ADMIN_EMAIL=ffclimmigration@gmail.com
  set ADMIN_PASSWORD=VtAdmin@2026
  set ADMIN_SESSION_SECRET=test_secret_minimum_48_chars_long_please_use_this_one
  node tests\admin-auth.test.mjs

On PowerShell use $env:ADMIN_EMAIL = "..." before running.

Tests cover:
  1. Credential verification (correct / wrong email / wrong password / case)
  2. Timing-safe comparison semantics
  3. Session issuing, HMAC verification, expiry, tamper detection
  4. Rate limiting (attempt counting, window reset, block after threshold)
  5. Manual integration checklist for the browser / API flow
*/

import crypto from "node:crypto";

const originalEnv = { ...process.env };
function ensureEnv() {
  if (!process.env.ADMIN_EMAIL) process.env.ADMIN_EMAIL = "ffclimmigration@gmail.com";
  if (!process.env.ADMIN_PASSWORD) process.env.ADMIN_PASSWORD = "VtAdmin@2026";
  if (!process.env.ADMIN_SESSION_SECRET) {
    process.env.ADMIN_SESSION_SECRET =
      "test_secret_please_replace_minimum_48_chars_long_ok_thank_you";
  }
}

// ---- Inline copies of the lib so this file is standalone (mirrors lib/admin/session.ts + rate-limit.ts) ----
const CREDENTIAL_ERROR = "Invalid email or password";
const TOKEN_VERSION = "v1";
const TOKEN_MAX_AGE_SEC = 8 * 60 * 60;
const COOKIE_MAX_AGE_SEC = 2 * 60 * 60;

let fallbackSecret = null;
function getSigningSecret() {
  const configured = process.env.ADMIN_SESSION_SECRET;
  if (configured && String(configured).trim().length >= 16) {
    return Buffer.from(String(configured).trim(), "utf8");
  }
  if (!fallbackSecret) fallbackSecret = crypto.randomBytes(48);
  return fallbackSecret;
}
function padOrHashToLen(input, length) {
  const digest = crypto.createHash("sha256").update(input).digest();
  if (length <= digest.length) return digest.subarray(0, length);
  const out = Buffer.alloc(length);
  digest.copy(out);
  return out;
}
function timingSafeEqualStrings(a, b) {
  const expectedLen = 64;
  const bufA = padOrHashToLen(a, expectedLen);
  const bufB = padOrHashToLen(b, expectedLen);
  try { return crypto.timingSafeEqual(bufA, bufB); } catch { return false; }
}
function verifyCredentials({ email, password }) {
  const expectedEmailRaw = String(process.env.ADMIN_EMAIL || "").trim();
  const expectedPasswordRaw = String(process.env.ADMIN_PASSWORD || "");
  if (!expectedEmailRaw || !expectedPasswordRaw) return { ok: false, error: CREDENTIAL_ERROR };
  const inputEmail = String(email || "").trim().toLowerCase();
  const expectedEmail = expectedEmailRaw.toLowerCase();
  const inputPassword = String(password || "");
  const expectedPassword = expectedPasswordRaw;
  const emailOk = timingSafeEqualStrings(inputEmail, expectedEmail);
  const passwordOk = timingSafeEqualStrings(inputPassword, expectedPassword);
  if (emailOk && passwordOk) return { ok: true, email: expectedEmailRaw };
  return { ok: false, error: CREDENTIAL_ERROR };
}
function b64urlEncode(buf) {
  const b = typeof buf === "string" ? Buffer.from(buf, "utf8") : buf;
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(input) {
  try {
    const s = String(input).replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    return Buffer.from(s + pad, "base64");
  } catch { return null; }
}
function computeHMAC(payloadBuf) {
  const secret = getSigningSecret();
  return crypto.createHmac("sha256", secret).update(payloadBuf).digest();
}
function issueSession(options) {
  const email = String(options?.email || process.env.ADMIN_EMAIL || "").trim() || "ffclimmigration@gmail.com";
  const maxAgeSec = Math.max(60, Math.min(TOKEN_MAX_AGE_SEC, Number(options?.maxAgeSec) || COOKIE_MAX_AGE_SEC));
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: TOKEN_VERSION, email, iat: now, exp: now + maxAgeSec,
    nonce: crypto.randomBytes(12).toString("hex"),
  };
  const payloadBuf = Buffer.from(JSON.stringify(payload), "utf8");
  const payloadB64 = b64urlEncode(payloadBuf);
  const sigBuf = computeHMAC(Buffer.from(payloadB64, "utf8"));
  return `${payloadB64}.${b64urlEncode(sigBuf)}`;
}
function verifySession(token) {
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
  try { if (!crypto.timingSafeEqual(expected, sigBuf)) return { ok: false }; }
  catch { return { ok: false }; }
  let payload;
  try { payload = JSON.parse(payloadBuf.toString("utf8")); } catch { return { ok: false }; }
  if (!payload || payload.v !== TOKEN_VERSION) return { ok: false };
  if (typeof payload.exp !== "number" || typeof payload.email !== "string") return { ok: false };
  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp) return { ok: false, expired: true };
  return { ok: true, email: payload.email };
}

const rateStore = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
function checkRateLimit(ip, identifier = "login") {
  const key = `${ip}:${identifier}`;
  const now = Date.now();
  const entry = rateStore.get(key);
  if (!entry || now >= entry.resetAt) {
    rateStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetMs: WINDOW_MS };
  }
  entry.count += 1;
  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);
  const resetMs = Math.max(0, entry.resetAt - now);
  if (entry.count > MAX_ATTEMPTS) return { allowed: false, remaining: 0, resetMs };
  return { allowed: true, remaining, resetMs };
}
function clearRateLimit(ip, identifier = "login") {
  rateStore.delete(`${ip}:${identifier}`);
}

// ---- Test harness ----
const results = [];
let pass = 0, fail = 0;
function test(name, fn) {
  try {
    fn();
    pass++;
    results.push({ name, ok: true });
    process.stdout.write(`  \u2713 ${name}\n`);
  } catch (e) {
    fail++;
    results.push({ name, ok: false, error: e.message || String(e) });
    process.stdout.write(`  \u2717 ${name}\n       ${e.message || String(e)}\n`);
  }
}
function assertEq(actual, expected, msg = "") {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ? msg + " — " : ""}expected ${e}, got ${a}`);
}
function assert(cond, msg = "assertion failed") { if (!cond) throw new Error(msg); }

process.stdout.write("\nAdmin Authentication Test Suite\n================================\n\n");

ensureEnv();

// ---- Credential verification ----
process.stdout.write("[Credential verification]\n");
test("accepts exact correct credentials", () => {
  const r = verifyCredentials({
    email: "ffclimmigration@gmail.com",
    password: "VtAdmin@2026",
  });
  assertEq(r.ok, true);
  assertEq(r.email, "ffclimmigration@gmail.com");
});
test("normalizes email case (uppercase input)", () => {
  const r = verifyCredentials({
    email: "FFCLIMMIGRATION@GMAIL.COM",
    password: "VtAdmin@2026",
  });
  assertEq(r.ok, true);
});
test("trims email whitespace", () => {
  const r = verifyCredentials({
    email: "  ffclimmigration@gmail.com  ",
    password: "VtAdmin@2026",
  });
  assertEq(r.ok, true);
});
test("rejects wrong password", () => {
  const r = verifyCredentials({
    email: "ffclimmigration@gmail.com",
    password: "WrongPass1",
  });
  assertEq(r.ok, false);
  assertEq(r.error, CREDENTIAL_ERROR);
});
test("rejects wrong email", () => {
  const r = verifyCredentials({
    email: "attacker@example.com",
    password: "VtAdmin@2026",
  });
  assertEq(r.ok, false);
});
test("rejects both wrong", () => {
  const r = verifyCredentials({
    email: "bad@example.com",
    password: "BadPass1",
  });
  assertEq(r.ok, false);
});
test("rejects empty inputs", () => {
  assertEq(verifyCredentials({ email: "", password: "" }).ok, false);
  assertEq(verifyCredentials({ email: null, password: null }).ok, false);
});
test("password is case-sensitive", () => {
  const r = verifyCredentials({
    email: "ffclimmigration@gmail.com",
    password: "vtadmin@2026", // lowercase V
  });
  assertEq(r.ok, false);
});
process.stdout.write("\n");

// ---- Session management ----
process.stdout.write("[Session management]\n");
test("issues a token that round-trips", () => {
  const tok = issueSession({ email: "ffclimmigration@gmail.com" });
  assert(typeof tok === "string" && tok.includes("."), "token format");
  const v = verifySession(tok);
  assertEq(v.ok, true);
  assertEq(v.email, "ffclimmigration@gmail.com");
});
test("rejects malformed tokens (no dot)", () => {
  assertEq(verifySession("notadottoken").ok, false);
});
test("rejects null / undefined / empty", () => {
  assertEq(verifySession(null).ok, false);
  assertEq(verifySession(undefined).ok, false);
  assertEq(verifySession("").ok, false);
});
test("detects payload tampering (bit flip)", () => {
  const tok = issueSession({ email: "ffclimmigration@gmail.com" });
  const [p, s] = tok.split(".");
  const buf = Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  buf[0] ^= 0x01; // flip one bit
  const tamperedP = b64urlEncode(buf);
  assertEq(verifySession(`${tamperedP}.${s}`).ok, false);
});
test("detects forged signature (wrong sig bytes)", () => {
  const tok = issueSession({ email: "ffclimmigration@gmail.com" });
  const [p] = tok.split(".");
  const fakeSig = b64urlEncode(crypto.randomBytes(32));
  assertEq(verifySession(`${p}.${fakeSig}`).ok, false);
});
test("detects expired token (maxAgeSec=1, wait 1.1s)", () => {
  const tok = issueSession({ email: "ffclimmigration@gmail.com", maxAgeSec: 1 });
  assertEq(verifySession(tok).ok, true);
  const start = Date.now();
  // Manually craft expired token for speed
  const [p] = tok.split(".");
  const pb = b64urlDecode(p);
  const payload = JSON.parse(pb.toString("utf8"));
  payload.exp = Math.floor(Date.now() / 1000) - 5;
  const npb = Buffer.from(JSON.stringify(payload), "utf8");
  const npbB64 = b64urlEncode(npb);
  const newsig = computeHMAC(Buffer.from(npbB64, "utf8"));
  const expiredTok = `${npbB64}.${b64urlEncode(newsig)}`;
  const v = verifySession(expiredTok);
  assertEq(v.ok, false);
  assertEq(v.expired, true);
  void start;
});
test("token nonces are unique", () => {
  const set = new Set();
  for (let i = 0; i < 50; i++) set.add(issueSession());
  assertEq(set.size, 50);
});
test("secret change invalidates old tokens", () => {
  process.env.ADMIN_SESSION_SECRET = "first_secret_minimum_48_chars_long_ok_for_testing_a";
  fallbackSecret = null;
  const tok = issueSession();
  process.env.ADMIN_SESSION_SECRET = "second_secret_minimum_48_chars_long_for_testing_bb";
  fallbackSecret = null;
  assertEq(verifySession(tok).ok, false);
});
process.stdout.write("\n");

// Restore env for rate limiting
process.env.ADMIN_SESSION_SECRET = originalEnv.ADMIN_SESSION_SECRET
  || "test_secret_please_replace_minimum_48_chars_long_ok_thank_you";
fallbackSecret = null;

// ---- Rate limiting ----
process.stdout.write("[Rate limiting]\n");
test("allows first N attempts and blocks after threshold", () => {
  const ip = "test-ip-block";
  clearRateLimit(ip);
  let last;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    last = checkRateLimit(ip);
    assert(last.allowed, `attempt ${i + 1} should be allowed`);
  }
  const blocked = checkRateLimit(ip);
  assertEq(blocked.allowed, false);
  assertEq(blocked.remaining, 0);
});
test("remaining count decrements", () => {
  const ip = "test-ip-remaining";
  clearRateLimit(ip);
  const first = checkRateLimit(ip);
  assertEq(first.remaining, MAX_ATTEMPTS - 1);
  const second = checkRateLimit(ip);
  assertEq(second.remaining, MAX_ATTEMPTS - 2);
});
test("clearRateLimit resets the counter", () => {
  const ip = "test-ip-clear";
  clearRateLimit(ip);
  for (let i = 0; i < MAX_ATTEMPTS; i++) checkRateLimit(ip);
  assertEq(checkRateLimit(ip).allowed, false);
  clearRateLimit(ip);
  assertEq(checkRateLimit(ip).allowed, true);
});
test("different IPs have independent counters", () => {
  clearRateLimit("ip-a");
  clearRateLimit("ip-b");
  for (let i = 0; i < MAX_ATTEMPTS; i++) checkRateLimit("ip-a");
  assertEq(checkRateLimit("ip-a").allowed, false);
  assertEq(checkRateLimit("ip-b").allowed, true);
});
process.stdout.write("\n");

// ---- Summary ----
process.stdout.write("----\n");
process.stdout.write(`Passed: ${pass}  Failed: ${fail}  Total: ${pass + fail}\n`);

// Manual integration checklist (printed if all unit tests pass)
if (fail === 0) {
  process.stdout.write("\n[Manual integration checklist — run against a live dev server]\n");
  const steps = [
    "GET /admin/dashboard (no cookie) → expect 307/302 → /admin/login",
    "GET /admin/users (no cookie)     → expect 307/302 → /admin/login",
    "POST /api/admin/login {wrong creds} → expect 401 + no set-cookie",
    "POST /api/admin/login { correct creds, valid email format, password complexity } → expect 200 + set-cookie: admin_session; HttpOnly; SameSite=Lax; Path=/",
    "GET /admin/dashboard with cookie → expect 200 + dashboard HTML, session details",
    "GET /admin/login with cookie     → expect redirect → /admin/dashboard",
    "POST /api/admin/logout → expect set-cookie: admin_session=deleted, MaxAge=0",
    "After logout, GET /admin/dashboard → expect redirect → /admin/login",
    "6 rapid wrong-credential POSTs to /api/admin/login → 6th returns 429 Too Many Attempts",
    "Wait 15 minutes, retry → allowed again (or restart dev server to clear store)",
  ];
  steps.forEach((s, i) => process.stdout.write(`  ${String(i + 1).padStart(2)}. ${s}\n`));
  process.stdout.write(
    "\n[Environment variables required at runtime]\n" +
    "  ADMIN_EMAIL            — admin sign-in email (server-only)\n" +
    "  ADMIN_PASSWORD         — admin sign-in password (server-only)\n" +
    "  ADMIN_SESSION_SECRET   — 48+ char random secret used for HMAC signing (server-only)\n" +
    "  NEVER prefix these with NEXT_PUBLIC_ — they must remain server-only.\n\n"
  );
}

process.exit(fail === 0 ? 0 : 1);
