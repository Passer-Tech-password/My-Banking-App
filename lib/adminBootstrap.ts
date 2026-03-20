export class BootstrapAdminError extends Error {
  code:
    | "invalid_config"
    | "missing_env"
    | "email_mismatch"
    | "unauthorized"
    | "request_failed";
  causeCode?: string;

  constructor(
    code:
      | "invalid_config"
      | "missing_env"
      | "email_mismatch"
      | "unauthorized"
      | "request_failed",
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
    (code === "invalid_config" ||
      code === "missing_env" ||
      code === "email_mismatch" ||
      code === "unauthorized" ||
      code === "request_failed")
  );
}

export async function resolveBootstrapAdminEmail(params: {
  idToken: string;
  currentEmail: string;
}): Promise<{ bootstrapAdminEmail: string; isBootstrapAdmin: boolean; userPromoted?: boolean }> {
  const res = await fetch("/api/admin/bootstrap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.idToken}`,
    },
    body: JSON.stringify({ email: params.currentEmail }),
  });

  const raw = await res.text();
  const data = (() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })() as any;

  if (!res.ok) {
    const code = String(data?.code || "request_failed");
    const message = String(
      data?.message ||
        (raw ? raw.slice(0, 300) : "") ||
        `Admin bootstrap failed (${res.status}).`,
    );
    const causeCode = data?.causeCode ? String(data.causeCode) : undefined;
    if (
      code === "missing_env" ||
      code === "email_mismatch" ||
      code === "invalid_config" ||
      code === "unauthorized"
    ) {
      throw new BootstrapAdminError(code as any, message, causeCode);
    }
    throw new BootstrapAdminError("request_failed", message, causeCode);
  }

  const bootstrapAdminEmail = String(data?.bootstrapAdminEmail || "").trim().toLowerCase();
  if (!bootstrapAdminEmail) {
    throw new BootstrapAdminError("invalid_config", "Admin bootstrap config is invalid.");
  }

  return {
    bootstrapAdminEmail,
    isBootstrapAdmin: data?.isBootstrapAdmin === true,
    userPromoted: data?.userPromoted === true,
  };
}
