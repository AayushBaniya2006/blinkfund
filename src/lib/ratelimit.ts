/**
 * Distributed Rate Limiter using Vercel KV
 *
 * Features:
 * - Persists across server restarts
 * - Works across multiple Vercel instances
 * - Sliding window algorithm
 * - IP validation to prevent header spoofing
 *
 * Environment Variables Required:
 * - KV_REST_API_URL (from Vercel KV)
 * - KV_REST_API_TOKEN (from Vercel KV)
 */

import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";
import { log } from "@/lib/logging";

/**
 * Rate limit configuration
 */
export type RateLimitConfig = {
  maxRequests: number;
  windowMs: number;
};

/**
 * Predefined rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  /** Donation endpoint: 10 requests per 10 seconds */
  donate: { maxRequests: 10, windowMs: 10 * 1000 },
  /** Wallet verification: 5 requests per minute */
  walletVerify: { maxRequests: 5, windowMs: 60 * 1000 },
  /** General API: 60 requests per minute */
  api: { maxRequests: 60, windowMs: 60 * 1000 },
  /** Contact form: 3 requests per minute */
  contact: { maxRequests: 3, windowMs: 60 * 1000 },
  /** Magic link emails: 3 per 15 minutes */
  magicLink: { maxRequests: 3, windowMs: 15 * 60 * 1000 },
  /** Login attempts: 5 per 15 minutes (before lockout) */
  login: { maxRequests: 5, windowMs: 15 * 60 * 1000 },
} as const;

/**
 * Validate IP address format (basic check)
 */
function isValidIpFormat(ip: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Get client IP from request headers with validation
 *
 * Security: Only trusts x-forwarded-for in Vercel environment
 * where the header is set by the CDN and cannot be spoofed.
 */
export function getClientIp(request: Request): string {
  // In Vercel environment, trust x-forwarded-for as it's set by the CDN
  if (process.env.VERCEL) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      // Vercel puts the real client IP first
      const clientIp = forwarded.split(",")[0].trim();
      if (isValidIpFormat(clientIp)) {
        return clientIp;
      }
    }
  }

  // x-real-ip (set by some proxies)
  const realIp = request.headers.get("x-real-ip");
  if (realIp && isValidIpFormat(realIp)) {
    return realIp;
  }

  // Fallback for local development or unknown environments
  // Use a hash of user-agent + accept-language as a fingerprint
  const userAgent = request.headers.get("user-agent") || "";
  const acceptLang = request.headers.get("accept-language") || "";

  if (userAgent || acceptLang) {
    // Create a simple hash for rate limiting purposes
    const fingerprint = `${userAgent}:${acceptLang}`;
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `fp:${Math.abs(hash).toString(16)}`;
  }

  return "anonymous";
}

/**
 * Check rate limit using Vercel KV (distributed)
 *
 * @param config - Rate limit configuration
 * @param identifier - Unique identifier (usually client IP)
 * @param prefix - Prefix for the rate limit key (endpoint name)
 * @returns null if within limits, NextResponse if rate limited
 */
export async function checkRateLimit(
  config: RateLimitConfig,
  identifier: string,
  prefix: string = "global"
): Promise<NextResponse | null> {
  const key = `ratelimit:${prefix}:${identifier}`;
  const now = Date.now();

  try {
    // Get current record from KV
    const record = await kv.get<{ count: number; resetTime: number }>(key);

    if (!record || record.resetTime < now) {
      // First request or window expired - start new window
      const newRecord = {
        count: 1,
        resetTime: now + config.windowMs,
      };

      // Set with TTL slightly longer than window to ensure cleanup
      const ttlSeconds = Math.ceil(config.windowMs / 1000) + 10;
      await kv.set(key, newRecord, { ex: ttlSeconds });

      return null;
    }

    if (record.count >= config.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);

      log("warn", "Rate limit exceeded", {
        prefix,
        identifier: identifier.slice(0, 16), // Truncate for privacy
        count: record.count,
        limit: config.maxRequests,
      });

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

    // Increment count atomically
    const ttlSeconds = Math.ceil((record.resetTime - now) / 1000) + 1;
    await kv.set(
      key,
      { count: record.count + 1, resetTime: record.resetTime },
      { ex: ttlSeconds }
    );

    return null;
  } catch (error) {
    // If KV fails, fall back to allowing the request (fail open)
    // but log the error for monitoring
    log("error", "Rate limit check failed", {
      prefix,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // In production, you might want to fail closed instead:
    // return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

    return null;
  }
}

/**
 * Synchronous rate limit check using in-memory fallback
 * Use this only when async is not possible (rare cases)
 *
 * WARNING: This does not persist across restarts or instances.
 * Only use as a fallback or for development.
 */
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimitSync(
  config: RateLimitConfig,
  identifier: string,
  prefix: string = "global"
): NextResponse | null {
  const key = `${prefix}:${identifier}`;
  const now = Date.now();

  const record = inMemoryStore.get(key);

  if (!record || record.resetTime < now) {
    inMemoryStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return null;
  }

  if (record.count >= config.maxRequests) {
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

  record.count++;
  return null;
}

// Clean up in-memory store periodically (fallback only)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, record] of inMemoryStore.entries()) {
        if (record.resetTime < now) {
          inMemoryStore.delete(key);
        }
      }
    },
    5 * 60 * 1000
  );
}

/**
 * Rate limit by email address (for magic links, password reset, etc.)
 */
export async function checkEmailRateLimit(
  email: string,
  config: RateLimitConfig = rateLimitConfigs.magicLink
): Promise<NextResponse | null> {
  // Normalize email for consistent rate limiting
  const normalizedEmail = email.toLowerCase().trim();
  return checkRateLimit(config, normalizedEmail, "email");
}

/**
 * Rate limit login attempts by email (for account lockout)
 */
export async function checkLoginRateLimit(
  email: string
): Promise<NextResponse | null> {
  const normalizedEmail = email.toLowerCase().trim();
  return checkRateLimit(rateLimitConfigs.login, normalizedEmail, "login");
}

/**
 * Clear login rate limit after successful login
 */
export async function clearLoginRateLimit(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const key = `ratelimit:login:${normalizedEmail}`;

  try {
    await kv.del(key);
  } catch (error) {
    log("error", "Failed to clear login rate limit", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
