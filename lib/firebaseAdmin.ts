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

function getPrivateKey(): string {
  const key = requireEnv("FIREBASE_PRIVATE_KEY");
  const trimmed = key.trim();
  return trimmed.includes("\\n") ? trimmed.replace(/\\n/g, "\n") : trimmed;
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
