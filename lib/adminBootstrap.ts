import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";

export class BootstrapAdminError extends Error {
  code:
    | "missing_config"
    | "invalid_config"
    | "missing_env"
    | "email_mismatch"
    | "read_failed"
    | "init_failed";
  causeCode?: string;

  constructor(
    code:
      | "missing_config"
      | "invalid_config"
      | "missing_env"
      | "email_mismatch"
      | "read_failed"
      | "init_failed",
    message: string,
    causeCode?: string,
  ) {
    super(message);
    this.code = code;
    this.causeCode = causeCode;
  }
}

export function isBootstrapAdminError(value: unknown): value is BootstrapAdminError {
  const code = (value as any)?.code;
  return (
    typeof (value as any)?.message === "string" &&
    (code === "missing_config" ||
      code === "invalid_config" ||
      code === "missing_env" ||
      code === "email_mismatch" ||
      code === "read_failed" ||
      code === "init_failed")
  );
}

export async function resolveBootstrapAdminEmail(params: {
  db: Firestore;
  currentEmail: string;
  envBootstrapEmail: string;
}): Promise<string> {
  const currentEmail = (params.currentEmail || "").trim().toLowerCase();
  const envBootstrapEmail = (params.envBootstrapEmail || "").trim().toLowerCase();

  const securityRef = doc(params.db, "config", "security");
  let securitySnap;
  try {
    securitySnap = await getDoc(securityRef);
  } catch (e: any) {
    const code = e?.code ? String(e.code) : "unknown";
    throw new BootstrapAdminError(
      "read_failed",
      `Failed to read admin bootstrap config (${code}). Check Firestore rules and network.`,
      code,
    );
  }

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
      "Email does not match bootstrap admin configuration. Sign in with NEXT_PUBLIC_ADMIN_EMAIL or create config/security.",
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
      code,
    );
  }
}
