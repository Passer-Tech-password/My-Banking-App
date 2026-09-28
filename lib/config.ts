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
  const bg = hashColor(source);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">` +
    `<rect width="256" height="256" rx="128" fill="#${bg}"/>` +
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif" ` +
    `font-size="112" font-weight="700" fill="#FFFFFF">${initials.replace(/[<>&"']/g, "")}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
