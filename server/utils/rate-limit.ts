import type { H3Event } from 'h3'

type RateLimitOptions = {
  key: string
  max: number
  windowMs: number
  message?: string
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, RateLimitBucket>()
let lastCleanupAt = 0

function cleanupExpiredBuckets(now: number) {
  if (now - lastCleanupAt < 60_000) return

  lastCleanupAt = now

  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

export function getRateLimitIp(event: H3Event) {
  const forwarded = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = getHeader(event, 'x-real-ip')?.trim()

  return forwarded || realIp || event.node.req.socket.remoteAddress || 'unknown'
}

export function assertRateLimit(event: H3Event, options: RateLimitOptions) {
  const now = Date.now()

  cleanupExpiredBuckets(now)

  const bucket = buckets.get(options.key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(options.key, {
      count: 1,
      resetAt: now + options.windowMs
    })

    return
  }

  if (bucket.count >= options.max) {
    throw createError({
      statusCode: 429,
      statusMessage: options.message ?? 'Too many requests'
    })
  }

  bucket.count += 1
}
