import { NextResponse } from "next/server";

/**
 * Simple in-memory rate limiter using sliding window algorithm
 * Note: This resets on server restart and doesn't work across multiple instances
 * For production with multiple instances, consider using Redis or similar
 */

type RateLimitRecord = {
  count: number;
  resetTime: number;
};

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

export const rateLimitConfigs = {
  // Donation endpoint: 10 requests per 10 seconds
  donate: { maxRequests: 10, windowMs: 10 * 1000 },
  // Wallet verification: 5 requests per minute
  walletVerify: { maxRequests: 5, windowMs: 60 * 1000 },
  // General API: 60 requests per minute
  api: { maxRequests: 60, windowMs: 60 * 1000 },
};

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return "anonymous";
}

/**
 * Check rate limit and return error response if exceeded
 * Returns null if within limits, NextResponse if rate limited
 */
export function checkRateLimit(
  config: RateLimitConfig,
  identifier: string,
  prefix: string = "global"
): NextResponse | null {
  const key = `${prefix}:${identifier}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || record.resetTime < now) {
    // First request or window expired - start new window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return null;
  }

  if (record.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": record.resetTime.toString(),
          "Retry-After": retryAfter.toString(),
        },
      }
    );
  }

  // Increment count
  record.count++;
  return null;
}
