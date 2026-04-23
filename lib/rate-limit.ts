const hits = new Map<string, number[]>();

export function enforceSlidingWindowRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
}): { allowed: true; remaining: number } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const cutoff = now - input.windowMs;
  const current = hits.get(input.key) ?? [];
  const recent = current.filter((ts) => ts > cutoff);

  if (recent.length >= input.limit) {
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfterMs: Math.max(500, oldest + input.windowMs - now),
    };
  }

  recent.push(now);
  hits.set(input.key, recent);
  return { allowed: true, remaining: Math.max(0, input.limit - recent.length) };
}
