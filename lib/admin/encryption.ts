import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm" as const;
const KEY_LEN = 32;
const IV_LEN = 12;
const SALT_LEN = 16;
const AUTH_TAG_LEN = 16;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

let cachedKey: Buffer | null = null;
function getDerivedKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = requireEnv("ENCRYPTION_KEY");
  const saltHex = process.env.ENCRYPTION_SALT;
  const salt = saltHex && saltHex.length === SALT_LEN * 2
    ? Buffer.from(saltHex, "hex")
    : Buffer.alloc(SALT_LEN, 0);
  cachedKey = scryptSync(secret, salt, KEY_LEN);
  return cachedKey;
}

export function encryptString(plaintext: string): string {
  if (!plaintext) {
    throw new Error("encryptString: empty value not allowed");
  }
  const key = getDerivedKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  if (tag.length !== AUTH_TAG_LEN) {
    throw new Error("encryptString: unexpected auth tag length");
  }
  return Buffer.concat([iv, tag, ct]).toString("base64url");
}

export function decryptString(blob: string): string {
  if (!blob) {
    throw new Error("decryptString: empty value not allowed");
  }
  const key = getDerivedKey();
  const raw = Buffer.from(blob, "base64url");
  const minLen = IV_LEN + AUTH_TAG_LEN + 1;
  if (raw.length < minLen) {
    throw new Error("decryptString: corrupted ciphertext");
  }
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const ct = raw.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
