export type UserRole = "admin" | "user";

export function parseUserRole(value: unknown): UserRole | null {
  if (value === "admin" || value === "user") return value;
  return null;
}

export function isAdminUserData(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const data = value as { role?: unknown; isAdmin?: unknown };
  return data.role === "admin" || data.isAdmin === true;
}
