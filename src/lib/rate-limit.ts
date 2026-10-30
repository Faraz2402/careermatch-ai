// Fixed-window rate limiter. Uses Upstash Redis (REST) when
// UPSTASH_REDIS_REST_URL/TOKEN are set so limits hold across instances;
// otherwise falls back to process memory (fine for a single server).

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterMs: number };

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const ok = bucket.count <= limit;
  return { ok, remaining: Math.max(0, limit - bucket.count), retryAfterMs: ok ? 0 : Math.max(0, bucket.resetAt - now) };
}

async function redisLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", `rl:${key}`],
      ["PEXPIRE", `rl:${key}`, String(windowMs), "NX"],
      ["PTTL", `rl:${key}`],
    ]),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  const [count, , ttl] = (await res.json()) as { result: number }[];
  const ok = count.result <= limit;
  return { ok, remaining: Math.max(0, limit - count.result), retryAfterMs: ok ? 0 : Math.max(0, ttl.result) };
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      return await redisLimit(key, limit, windowMs);
    } catch {
      // Redis unavailable: degrade to local limits rather than failing open.
    }
  }
  return memoryLimit(key, limit, windowMs);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}
