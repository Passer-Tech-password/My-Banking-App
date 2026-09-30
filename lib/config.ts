export const CONTACT_PHONE_PRIMARY =
  process.env.NEXT_PUBLIC_CONTACT_PHONE_PRIMARY || "+1 (555) 123-4567";

function hashColor(seed: string): string {
  const palette = [
    "0D8ABC",
    "0891B2",
    "0EA5E9",
    "2563EB",
    "1D4ED8",
    "4F46E5",
    "6366F1",
    "7C3AED",
    "4338CA",
    "0284C7",
    "059669",
    "0891B2",
  ];
  let h = 0;
  const s = String(seed || "").trim() || "User";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length]!;
}

export function getDefaultAvatarUrl(seed: string): string {
  const source = String(seed || "").trim() || "User";
  const initials = source
    .split(/[@.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => (p[0] || "").toUpperCase())
    .join("") || "U";
  const safeInitials = initials.replace(/[^A-Za-z0-9]/g, "").slice(0, 2) || "U";
  const bg = hashColor(source);
  const params = new URLSearchParams({
    name: safeInitials,
    background: bg,
    color: "ffffff",
    size: "256",
    "font-size": "0.5",
    bold: "true",
    rounded: "true",
    format: "svg",
  });
  return `https://ui-avatars.com/api/?${params.toString()}`;
}
