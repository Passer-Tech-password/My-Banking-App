import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";

export class BootstrapAdminError extends Error {
  code:
    | "missing_config"
    | "invalid_config"
    | "missing_env"
    | "email_mismatch"
    | "init_failed";

  constructor(
    code:
      | "missing_config"
      | "invalid_config"
      | "missing_env"
      | "email_mismatch"
      | "init_failed",
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

export async function resolveBootstrapAdminEmail(params: {
  db: Firestore;
  currentEmail: string;
  envBootstrapEmail: string;
}): Promise<string> {
  const currentEmail = (params.currentEmail || "").trim().toLowerCase();
  const envBootstrapEmail = (params.envBootstrapEmail || "").trim().toLowerCase();

  const securityRef = doc(params.db, "config", "security");
  const securitySnap = await getDoc(securityRef);

  if (securitySnap.exists()) {
    const value = (securitySnap.data() as unknown as { bootstrapAdminEmail?: unknown })
      ?.bootstrapAdminEmail;
    if (typeof value === "string" && value.trim()) {
      return value.trim().toLowerCase();
    }
    throw new BootstrapAdminError(
      "invalid_config",
      "Admin bootstrap config is invalid. Set config/security.bootstrapAdminEmail.",
    );
  }

  if (!envBootstrapEmail) {
    throw new BootstrapAdminError(
      "missing_env",
      "Admin bootstrap is not configured. Set NEXT_PUBLIC_ADMIN_EMAIL or create config/security.",
    );
  }

  if (!currentEmail || currentEmail !== envBootstrapEmail) {
    throw new BootstrapAdminError(
      "email_mismatch",
      "Admin bootstrap config is missing. Sign in with the bootstrap admin email or create config/security.",
    );
  }

  try {
    await setDoc(securityRef, {
      bootstrapAdminEmail: currentEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return currentEmail;
  } catch (e: any) {
    const code = e?.code ? String(e.code) : "unknown";
    throw new BootstrapAdminError(
      "init_failed",
      `Admin bootstrap config is missing and could not be initialized (${code}).`,
    );
  }
}
