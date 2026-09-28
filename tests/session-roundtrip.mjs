process.env.ADMIN_SESSION_SECRET = "012345678901234567890123456789012345678901234567";
import crypto from "node:crypto";

const TOKEN_VERSION = "v1";
const TOKEN_MAX_AGE_SEC = 8 * 60 * 60;
const COOKIE_MAX_AGE_SEC = 2 * 60 * 60;

function getSecretBuf() {
  const s = String(process.env.ADMIN_SESSION_SECRET || "").trim();
  if (s.length >= 16) return Buffer.from(s, "utf8");
  throw new Error("Secret too short");
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
function computeHMAC(inputBuf) {
  return crypto.createHmac("sha256", getSecretBuf()).update(inputBuf).digest();
}
function issueSession({ email = "a@b.test", maxAgeSec = COOKIE_MAX_AGE_SEC } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: TOKEN_VERSION, email, iat: now, exp: now + maxAgeSec,
    nonce: crypto.randomBytes(12).toString("hex"),
  };
  const payloadBuf = Buffer.from(JSON.stringify(payload), "utf8");
  const payloadB64 = b64urlEncode(payloadBuf);
  // THE FIX: sign the b64url string bytes, NOT the raw JSON buffer.
  const sigBuf = computeHMAC(Buffer.from(payloadB64, "utf8"));
  return `${payloadB64}.${b64urlEncode(sigBuf)}`;
}
function verifyNode(token) {
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
// Faithful reimplementation of the Edge verifier (Web Crypto API semantics but
// runs on Node crypto for testability with identical invariants:
//   dataToVerify = UTF-8 bytes of payloadB64 string
//   sig = HMAC-SHA256(secret, dataToVerify)
function verifyEdgeLike(token) {
  if (!token || typeof token !== "string") return { ok: false };
  const dot = token.indexOf(".");
  if (dot <= 0 || dot >= token.length - 1) return { ok: false };
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);
  const payloadBytes = b64urlDecode(payloadB64);
  const sigBytes = b64urlDecode(sigB64);
  if (!payloadBytes || !sigBytes) return { ok: false };
  // Mirror session-edge.ts line 92-98:
  //   encoder = new TextEncoder(); dataToVerify = encoder.encode(payloadB64)
  //   crypto.subtle.verify(HMAC, key, sigBytes, dataToVerify)
  const dataToVerify = Buffer.from(payloadB64, "utf8"); // <-- THE KEY AGREEMENT
  const expected = computeHMAC(dataToVerify);
  if (expected.length !== sigBytes.length) return { ok: false };
  try { if (!crypto.timingSafeEqual(expected, sigBytes)) return { ok: false }; }
  catch { return { ok: false }; }
  let payload;
  try { payload = JSON.parse(payloadBytes.toString("utf8")); } catch { return { ok: false }; }
  if (!payload || payload.v !== TOKEN_VERSION) return { ok: false };
  if (typeof payload.exp !== "number" || typeof payload.email !== "string") return { ok: false };
  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp) return { ok: false, expired: true };
  return { ok: true, email: payload.email };
}

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { console.log(`  PASS  ${name}`); pass++; }
  else { console.log(`  FAIL  ${name}  ${detail ?? ""}`); fail++; }
}

console.log("== Session roundtrip AC-1 (admin-like, 48-char secret) ==");
const t1 = issueSession({ email: "a@b.test" });
check("token format (2 segments)", typeof t1 === "string" && t1.split(".").length === 2, `len=${t1?.length}`);
const n1 = verifyNode(t1);
check("Node verify ok+email", n1.ok === true && n1.email === "a@b.test", JSON.stringify(n1));
const e1 = verifyEdgeLike(t1);
check("Edge verify ok+email (matches)", e1.ok === true && e1.email === "a@b.test", JSON.stringify(e1));

const tampered = t1.slice(0, -2) + "XX";
check("tampered fails Node", verifyNode(tampered).ok === false);
check("tampered fails Edge", verifyEdgeLike(tampered).ok === false);

console.log("\n== Cross-alignment check: Node AND Edge must agree on 50 random tokens ==");
let allAgree = true;
for (let i = 0; i < 50; i++) {
  const t = issueSession({ email: `u${i}@bank.test`, maxAgeSec: 3600 });
  const n = verifyNode(t);
  const e = verifyEdgeLike(t);
  if (!(n.ok === true && e.ok === true && n.email === e.email && n.email === `u${i}@bank.test`)) {
    allAgree = false;
    console.log(`  MISMATCH i=${i}  Node=${JSON.stringify(n)}  Edge=${JSON.stringify(e)}`);
    fail++;
  }
}
check("50/50 tokens Node&Edge aligned (ok=true + email match)", allAgree);

console.log("\n== Old buggy-signing vs fixed verifier: OLD tokens must FAIL (they did before fix) ==");
function issueSessionBUGGY({ email = "a@b.test" } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { v: TOKEN_VERSION, email, iat: now, exp: now + 3600, nonce: crypto.randomBytes(12).toString("hex") };
  const payloadBuf = Buffer.from(JSON.stringify(payload), "utf8");
  const sigBuf = computeHMAC(payloadBuf); // BUG: signs raw JSON buf bytes, NOT b64 string
  return `${b64urlEncode(payloadBuf)}.${b64urlEncode(sigBuf)}`;
}
const buggyTok = issueSessionBUGGY({ email: "bug@test" });
check("BUGGY-signed token rejected by fixed Node verify", verifyNode(buggyTok).ok === false, JSON.stringify(verifyNode(buggyTok)));
check("BUGGY-signed token rejected by fixed Edge verify", verifyEdgeLike(buggyTok).ok === false, JSON.stringify(verifyEdgeLike(buggyTok)));

console.log(`\nSCRIPT TOTAL: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
