/**
 * Fixed-window, in-memory rate limiter: `limit` attempts per `windowMs` per key.
 * Good enough for one server instance; a shared store would replace it when scaling out.
 */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();

  return {
    /** Records an attempt. Returns false when the key is over the limit. */
    attempt(key: string): boolean {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((ts) => t - ts < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      return true;
    },
    reset(key: string) {
      hits.delete(key);
    },
  };
}

/** NFR-01: five sign-in attempts per minute per email. */
export const signInLimiter = createRateLimiter(5, 60_000);
