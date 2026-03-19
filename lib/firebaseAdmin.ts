import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getPrivateKey(): string {
  const key = requireEnv("FIREBASE_PRIVATE_KEY");
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

export const firebaseAdminApp =
  getApps().length > 0
    ? getApps()[0]!
    : initializeApp({
        credential: cert({
          projectId: requireEnv("FIREBASE_PROJECT_ID"),
          clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
          privateKey: getPrivateKey(),
        }),
      });

export const firebaseAdminAuth = getAuth(firebaseAdminApp);
export const firebaseAdminDb = getFirestore(firebaseAdminApp);
