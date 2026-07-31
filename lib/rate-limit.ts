interface RateLimitEntry {
  count: number;
  resetAt: number;
}

declare global {
  var pawsyncRateLimits: Map<string, RateLimitEntry> | undefined;
}

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  global.pawsyncRateLimits ||= new Map();
  const current = global.pawsyncRateLimits.get(key);
  if (!current || current.resetAt <= now) {
    global.pawsyncRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  if (current.count <= limit) return { allowed: true, retryAfterSeconds: 0 };
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function requestClientKey(req: Request) {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || 'local';
}
