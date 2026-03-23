export const CONTACT_PHONE_PRIMARY =
  process.env.NEXT_PUBLIC_CONTACT_PHONE_PRIMARY || "+1 (555) 123-4567";

export function getDefaultAvatarUrl(seed: string): string {
  const name = String(seed || "").trim() || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff&size=256`;
}
