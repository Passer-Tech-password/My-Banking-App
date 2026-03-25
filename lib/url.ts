export function stripQueryParam(input: string, key: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.searchParams.delete(key);
    const next = url.toString();
    return next.endsWith("?") ? next.slice(0, -1) : next;
  } catch {
    const idx = raw.indexOf("?");
    if (idx < 0) return raw;
    const base = raw.slice(0, idx);
    const query = raw.slice(idx + 1);
    const parts = query.split("&").filter(Boolean);
    const kept = parts.filter((p) => {
      const [k] = p.split("=");
      return k !== key;
    });
    return kept.length ? `${base}?${kept.join("&")}` : base;
  }
}

