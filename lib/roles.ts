export type UserRole = "admin" | "user";

export function parseUserRole(value: unknown): UserRole | null {
  if (value === "admin" || value === "user") return value;
  return null;
}
