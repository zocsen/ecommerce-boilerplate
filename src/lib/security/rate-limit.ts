/* ------------------------------------------------------------------ */
/*  Simple in-memory rate limiter                                      */
/*  Suitable for single-instance deployments. For distributed setups,  */
/*  swap with Redis-backed alternative.                                */
/* ------------------------------------------------------------------ */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly store = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Run garbage collection every 60 seconds to prevent memory leaks
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);

    // Prevent the timer from keeping the process alive in tests / graceful shutdown
    if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Check if a request for the given key is allowed.
   * Returns success=true if under the limit, or success=false if rate-limited.
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const existing = this.store.get(key);

    // No entry or window expired — start fresh
    if (!existing || now >= existing.resetAt) {
      const resetAt = now + this.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return {
        success: true,
        remaining: this.maxRequests - 1,
        resetAt,
      };
    }

    // Within window — increment
    existing.count += 1;

    if (existing.count > this.maxRequests) {
      return {
        success: false,
        remaining: 0,
        resetAt: existing.resetAt,
      };
    }

    return {
      success: true,
      remaining: this.maxRequests - existing.count,
      resetAt: existing.resetAt,
    };
  }

  /**
   * Remove all expired entries from the store.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now >= entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Tear down the cleanup interval (useful in tests).
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }
}

// ── Pre-configured instances ───────────────────────────────────────

/** Newsletter / subscriber endpoint: 5 requests per 60 seconds */
export const subscribeRateLimiter = new RateLimiter(5, 60_000);

/** Auth endpoints (login, register, reset): 10 requests per 60 seconds */
export const authRateLimiter = new RateLimiter(10, 60_000);
