import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '@/server/core/rate-limit';

describe('createRateLimiter', () => {
  it('allows the limit, blocks the next attempt, and recovers after the window', () => {
    let t = 0;
    const limiter = createRateLimiter(5, 60_000, () => t);
    for (let i = 0; i < 5; i++) expect(limiter.attempt('a@x.io')).toBe(true);
    expect(limiter.attempt('a@x.io')).toBe(false);
    expect(limiter.attempt('b@x.io')).toBe(true); // per key
    t = 60_001;
    expect(limiter.attempt('a@x.io')).toBe(true);
  });

  it('reset clears a key', () => {
    const limiter = createRateLimiter(1, 60_000, () => 0);
    limiter.attempt('k');
    expect(limiter.attempt('k')).toBe(false);
    limiter.reset('k');
    expect(limiter.attempt('k')).toBe(true);
  });
});
