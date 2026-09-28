import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizePrivateKey(raw: string): string {
  let key = raw;

  // Run the full normalize loop up to N times (quote-strip → unescape → quote-strip)
  // because escaping and quoting can nest: `"\"...\""` (outer shell quotes, inner JSON quotes).
  let outerLast: string | undefined;
  for (let iter = 0; iter < 3 && outerLast !== key; iter++) {
    outerLast = key;

    // 1. Trim leading/trailing whitespace.
    key = key.trim();

    // 2. Strip surrounding double or single quotes. Users often paste a JSON value
    //    wrapped in a shell-quoted `.env` assignment, e.g. KEY='"-----BEGIN...\n...\n-----END...\n"'
    //    which dotenv reads as:   "-----BEGIN...\n...\n-----END...\n"
    //    with the JSON quote chars still inside.
    let last: string | undefined;
    while (last !== key) {
      last = key;
      if (
        (key.startsWith('"') && key.endsWith('"')) ||
        (key.startsWith("'") && key.endsWith("'"))
      ) {
        key = key.slice(1, -1).trim();
      }
    }

    // 3. Unescape JSON-style escape sequences (\n, \r, \t, \", \\). This is the format
    //    actually used by Firebase's downloaded `service-account.json` `private_key` field.
    let changed = false;
    if (key.includes("\\n")) {
      key = key
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t");
      changed = true;
    }
    if (key.includes('\\"') || key.includes("\\\\")) {
      key = key.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      changed = true;
    }
    if (!changed) break;
    // After unescaping, re-run outer loop: sometimes unescape exposes NEW real quote
    // wrappers (e.g. the user wrapped the already-quoted JSON string in outer quotes).
  }

  // 4. Trim final whitespace.
  key = key.trim();

  // 5. If the user pasted ONLY the base64 body (no PEM armor), wrap it.
  const hasBegin = /-----BEGIN [A-Z0-9 ]+ KEY-----/.test(key);
  const hasEnd = /-----END [A-Z0-9 ]+ KEY-----/.test(key);
  if (!hasBegin && !hasEnd && key.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(key)) {
    const parts = key.replace(/\s+/g, "").match(/.{1,64}/g);
    const body = parts && parts.length > 0 ? parts.join("\n") : key;
    key = `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
  }

  // 6. Ensure a valid armor pair exists. Surface a clear error instead of letting
  //    OpenSSL 3.x throw its cryptic "DECODER routines::unsupported".
  const armorMatch = key.match(/-----BEGIN ([A-Z0-9 ]+ KEY)-----/);
  if (!armorMatch) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY does not contain a valid PEM armor (-----BEGIN … KEY----- / -----END … KEY-----). " +
        "Paste the entire \"private_key\" string (or its value) from the Firebase service-account JSON file. " +
        "Length after normalization: " +
        String(key.length) +
        " chars.",
    );
  }
  const label = armorMatch[1]!;
  const expectedEnd = `-----END ${label}-----`;
  if (!key.includes(expectedEnd)) {
    throw new Error(
      `FIREBASE_PRIVATE_KEY has BEGIN ${label} but missing matching ${expectedEnd}. Ensure the full value was pasted.`,
    );
  }

  // 7. Ensure trailing newline (some OpenSSL builds are strict).
  if (!key.endsWith("\n")) key = key + "\n";
  return key;
}

function getPrivateKey(): string {
  const key = requireEnv("FIREBASE_PRIVATE_KEY");
  try {
    return normalizePrivateKey(key);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`FIREBASE_PRIVATE_KEY normalization failed: ${msg}`);
  }
}

let cachedApp: App | null = null;

export function getFirebaseAdminApp(): App {
  if (cachedApp) return cachedApp;

  const apps = getApps();
  if (apps.length > 0) {
    cachedApp = apps[0]!;
    return cachedApp;
  }

  cachedApp = initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: getPrivateKey(),
    }),
  });

  return cachedApp;
}

let cachedAuth: Auth | null = null;
export function getFirebaseAdminAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getFirebaseAdminApp());
  return cachedAuth;
}

let cachedDb: Firestore | null = null;
export function getFirebaseAdminDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(getFirebaseAdminApp());
  return cachedDb;
}
