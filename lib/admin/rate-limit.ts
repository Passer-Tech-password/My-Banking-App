interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

function getKey(ip: string, identifier: string): string {
  return `${ip}:${identifier}`;
}

export function checkRateLimit(
  ip: string,
  identifier: string = "login",
): RateLimitResult {
  const key = getKey(ip, identifier);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, resetMs: WINDOW_MS };
  }

  entry.count += 1;
  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count);
  const resetMs = Math.max(0, entry.resetAt - now);

  if (entry.count > MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, resetMs };
  }

  return { allowed: true, remaining, resetMs };
}

export function clearRateLimit(ip: string, identifier: string = "login"): void {
  const key = getKey(ip, identifier);
  store.delete(key);
}

export function getClientIp(req: { headers?: { get?: (name: string) => string | null } }): string {
  const forwardedFor = req.headers?.get?.("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  const realIp = req.headers?.get?.("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}
