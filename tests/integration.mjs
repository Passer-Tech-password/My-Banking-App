import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:3000";
const ADMIN_EMAIL = "ffclimmigration@gmail.com";
const ADMIN_PASSWORD = "VtAdmin@2026";

let pass = 0, fail = 0, cases = [];
function record(name, ok, detail) {
  cases.push({ name, ok, detail });
  if (ok) { console.log("  PASS  " + name); pass++; }
  else { console.log("  FAIL  " + name + (detail ? "  (" + detail + ")" : "")); fail++; }
}
async function withRetries(label, fn, attempts = 2, sleepMs = 2000) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; if (i < attempts - 1) await new Promise(r => setTimeout(r, sleepMs)); }
  }
  throw lastErr;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Simple cookie jar using tough-cookie-like Map of Set-Cookie header parsing
class Jar {
  constructor() { this.cookies = new Map(); }
  applySetCookie(setCookieArr, host) {
    if (!setCookieArr) return;
    for (const sc of setCookieArr) {
      const [kv, ...rest] = sc.split(";").map(s => s.trim());
      const eq = kv.indexOf("=");
      if (eq <= 0) continue;
      const name = kv.slice(0, eq);
      const value = kv.slice(eq + 1);
      const flags = { value };
      for (const r of rest) {
        const leq = r.indexOf("=");
        const k = (leq >= 0 ? r.slice(0, leq) : r).toLowerCase();
        const v = leq >= 0 ? r.slice(leq + 1) : true;
        flags[k] = v;
      }
      this.cookies.set(name, flags);
    }
  }
  cookieHeader(host) {
    return [...this.cookies.entries()].map(([n, f]) => `${n}=${f.value}`).join("; ");
  }
  get(name) { return this.cookies.get(name); }
}

async function main() {
  // ============================================================
  console.log("== AC-6: Public pages smoke (200) ==");
  for (const u of ["/","/about","/services","/contact-us","/privacy-policy","/login","/register"]) {
    try {
      const r = await withRetries(u, () => fetch(BASE + u, { redirect: "follow" }), 2, 4000);
      record(`AC-6  GET ${u}`, r.status === 200, `status=${r.status}`);
      // Grab branding check on home / about
      if ((u === "/" || u === "/about") && r.status === 200) {
        const t = await r.text();
        const hasBranding = /Aurora Bank/.test(t);
        record(`AC-6  ${u} HTML contains 'Aurora Bank'`, hasBranding, hasBranding ? "" : "no aurora branding in first fetch body");
      }
    } catch (e) {
      record(`AC-6  GET ${u}`, false, e.message.slice(0, 120));
    }
  }

  // ============================================================
  console.log("\n== AC-3: Unauthenticated admin redirects (307 → /admin/login) ==");
  const adminPages = ["/admin/", "/admin/dashboard", "/admin/users", "/admin/transactions", "/admin/requests"];
  for (const u of adminPages) {
    try {
      const r = await withRetries(u, () => fetch(BASE + u, { redirect: "manual" }), 2, 5000);
      const loc = r.headers.get("location") || "";
      const codeOk = (r.status === 307 || r.status === 302 || r.status === 303);
      const pointsToLogin = /\/admin\/login(\?|$)/.test(loc);
      record(`AC-3  GET ${u}`, codeOk && pointsToLogin, `status=${r.status} Location=${loc}`);
    } catch (e) { record(`AC-3  GET ${u}`, false, e.message.slice(0,120)); }
  }
  // API guard: no cookie → 401 JSON
  try {
    const r = await withRetries("/api/admin/session", () => fetch(BASE + "/api/admin/session", { redirect: "manual" }), 2, 5000);
    const body = await r.text();
    let parsed = null; try { parsed = JSON.parse(body); } catch {}
    record(`AC-3  GET /api/admin/session (no cookie)`,
      r.status === 401 && parsed && parsed.ok === false && parsed.authenticated === false,
      `status=${r.status} body=${body.slice(0,120)}`);
  } catch (e) { record(`AC-3  GET /api/admin/session (no cookie)`, false, e.message.slice(0,120)); }

  // ============================================================
  console.log("\n== AC-2 / T4: Valid-cred login flow cookie jar ==");
  const jar = new Jar();

  // Step 1: POST /api/admin/login {valid creds}
  try {
    const r = await withRetries("POST /api/admin/login", () =>
      fetch(BASE + "/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cookie": jar.cookieHeader() },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
        redirect: "manual"
      }), 2, 8000);
    jar.applySetCookie(r.headers.getSetCookie ? r.headers.getSetCookie() : (r.headers.get("set-cookie") || "").split(",").map(s => s.trim()).filter(Boolean), "127.0.0.1");
    const body = await r.text();
    let p = null; try { p = JSON.parse(body); } catch {}
    record(`AC-2 Step1: POST /api/admin/login → 200 ok:true`,
      r.status === 200 && p && p.ok === true && /\/admin\/dashboard/.test(p.redirectTo || ""),
      `status=${r.status} body=${body.slice(0,160)}`);
    const as = jar.get("admin_session");
    record(`AC-2 Step1: set-cookie admin_session present + HttpOnly + SameSite + Path=/`,
      !!as && as.value && as.value.length > 30 && !!as["httponly"] && !!as["samesite"] && (as["path"] === "/"),
      as ? `len=${as.value.length} HttpOnly=${!!as["httponly"]} SameSite=${as["samesite"]} Path=${as["path"]}` : "MISSING COOKIE");
  } catch (e) { record(`AC-2 Step1: POST /api/admin/login`, false, e.message.slice(0,120)); }

  // Step 2: GET /admin/dashboard WITH cookie → 200 HTML NOT redirect
  try {
    const r = await fetch(BASE + "/admin/dashboard", {
      headers: { "Cookie": jar.cookieHeader() },
      redirect: "manual"
    });
    const body = r.status === 200 ? (await r.text()) : "";
    record(`AC-2 Step2: GET /admin/dashboard (cookie) → 200 dashboard HTML`,
      r.status === 200 && /Dashboard|Admin|dashboard/.test(body),
      `status=${r.status} location=${r.headers.get("location") || "-"} titleMatch=${/Dashboard|Admin/.test(body)}`);
  } catch (e) { record(`AC-2 Step2: GET /admin/dashboard (cookie)`, false, e.message.slice(0,120)); }

  // Step 3: GET /admin/login WITH cookie → redirected AWAY (logged-in users must not land on login page)
  try {
    const r = await fetch(BASE + "/admin/login", {
      headers: { "Cookie": jar.cookieHeader() },
      redirect: "manual"
    });
    const loc = r.headers.get("location") || "";
    const codeOk = (r.status === 307 || r.status === 302 || r.status === 303);
    const pointsToDash = /\/admin(\/dashboard)?/.test(loc);
    record(`T4-TR2: GET /admin/login WITH cookie → redirect to dashboard`,
      codeOk && pointsToDash, `status=${r.status} Location=${loc}`);
  } catch (e) { record(`T4-TR2 GET /admin/login cookie`, false, e.message.slice(0,120)); }

  // Step 4: GET /api/admin/session WITH cookie → 200 ok:true authenticated:true email matches
  try {
    const r = await fetch(BASE + "/api/admin/session", {
      headers: { "Cookie": jar.cookieHeader() },
      redirect: "manual"
    });
    const body = await r.text();
    let p = null; try { p = JSON.parse(body); } catch {}
    record(`T4-TR4: GET /api/admin/session (cookie) → ok:true authenticated:true correct email`,
      r.status === 200 && p && p.ok === true && p.authenticated === true && p.email === ADMIN_EMAIL,
      `status=${r.status} body=${body.slice(0,160)}`);
  } catch (e) { record(`T4-TR4 GET /api/admin/session cookie`, false, e.message.slice(0,120)); }

  // Step 5: POST /api/admin/logout → clears cookie
  try {
    const r = await fetch(BASE + "/api/admin/logout", {
      method: "POST",
      headers: { "Cookie": jar.cookieHeader() },
      redirect: "manual"
    });
    jar.applySetCookie(r.headers.getSetCookie ? r.headers.getSetCookie() : (r.headers.get("set-cookie") || "").split(",").map(s => s.trim()).filter(Boolean), "127.0.0.1");
    const after = jar.get("admin_session");
    const cleared = !after || after.value.length < 5 || /^deleted$/i.test(after.value || "") || (after["max-age"] && Number(after["max-age"]) <= 0) || (after["expires"] && new Date(after["expires"]) < new Date());
    record(`T4-TR3 Step5a: POST /api/admin/logout clear admin_session cookie`, cleared,
      after ? `len=${after.value.length} max-age=${after["max-age"]} expires=${after["expires"]}` : "cookie gone");
    // retry dashboard after logout → 307
    await sleep(200);
    const r2 = await fetch(BASE + "/admin/dashboard", {
      headers: { "Cookie": jar.cookieHeader() },
      redirect: "manual"
    });
    const loc = r2.headers.get("location") || "";
    record(`T4-TR3 Step5b: GET /admin/dashboard POST-logout → 307→/admin/login`,
      (r2.status === 307 || r2.status === 302) && /\/admin\/login/.test(loc),
      `status=${r2.status} Location=${loc}`);
  } catch (e) { record(`T4-TR3 logout sequence`, false, e.message.slice(0,120)); }

  // ============================================================
  console.log("\n== AC-5: Project-wide case-insensitive 'vanguard' file content grep ==");
  const root = process.cwd();
  const excluded = new Set([".git", ".next", "node_modules", "coverage", ".turbo"]);
  const includeExt = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".yaml", ".yml", ".md", ".css", ".scss", ".html", ".env", ".ini", ".txt", ".gitignore"]);
  const bareEnvFiles = new Set(["env.local", "env.production", "env.development", ".env.local", ".env.production", ".env.development"]);
  function shouldIncludeFile(p, base) {
    if (bareEnvFiles.has(base)) return true;
    const ext = path.extname(base).toLowerCase();
    return includeExt.has(ext);
  }
  function walk(dir) {
    let hits = [];
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return hits; }
    for (const e of entries) {
      if (e.name.startsWith("$")) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (excluded.has(e.name)) continue;
        hits = hits.concat(walk(full));
      } else if (e.isFile()) {
        if (!shouldIncludeFile(full, e.name)) continue;
        try {
          const s = fs.readFileSync(full, "utf8");
          if (/vanguard/i.test(s)) {
            const rel = path.relative(root, full);
            const lines = s.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
              if (/vanguard/i.test(lines[i])) {
                hits.push(`${rel}:${i+1}:  ${lines[i].trim().slice(0,180)}`);
              }
            }
          }
        } catch {}
      }
    }
    return hits;
  }
  const allHits = walk(root);
  record(`AC-5: project-wide vanguard file-hits = 0`, allHits.length === 0,
    allHits.length === 0 ? "" : ("\n    " + allHits.slice(0, 20).join("\n    ") + (allHits.length > 20 ? `\n    ... ${allHits.length - 20} more lines` : "")));

  // ============================================================
  console.log(`\n==========================\nINTEGRATION TOTAL: ${pass} passed, ${fail} failed\n==========================`);
  if (fail > 0) {
    console.log("\nFailing cases:");
    for (const c of cases) if (!c.ok) console.log("  - " + c.name + (c.detail ? `  (${c.detail})` : ""));
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
