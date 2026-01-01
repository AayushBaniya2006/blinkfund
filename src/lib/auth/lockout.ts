/**
 * Account Lockout Protection
 *
 * Prevents brute force attacks by temporarily locking accounts
 * after multiple failed login attempts.
 *
 * Uses distributed storage (Vercel KV) to work across instances.
 */

import { kv } from "@vercel/kv";
import { log } from "@/lib/logging";

/**
 * Lockout configuration
 */
const LOCKOUT_CONFIG = {
  /** Maximum failed attempts before lockout */
  maxAttempts: 5,
  /** Lockout duration in milliseconds (15 minutes) */
  lockoutDuration: 15 * 60 * 1000,
  /** Window for counting attempts in milliseconds (15 minutes) */
  attemptWindow: 15 * 60 * 1000,
};

interface LockoutRecord {
  attempts: number;
  firstAttempt: number;
  lockedUntil?: number;
}

/**
 * Get the lockout key for an email
 */
function getLockoutKey(email: string): string {
  return `lockout:${email.toLowerCase().trim()}`;
}

/**
 * Check if an account is currently locked
 *
 * @param email - The email address to check
 * @returns Object with locked status and optional unlock time
 */
export async function isAccountLocked(
  email: string
): Promise<{ locked: boolean; unlocksAt?: Date; remainingAttempts?: number }> {
  try {
    const key = getLockoutKey(email);
    const record = await kv.get<LockoutRecord>(key);

    if (!record) {
      return { locked: false, remainingAttempts: LOCKOUT_CONFIG.maxAttempts };
    }

    const now = Date.now();

    // Check if currently locked
    if (record.lockedUntil && record.lockedUntil > now) {
      return {
        locked: true,
        unlocksAt: new Date(record.lockedUntil),
      };
    }

    // Check if attempt window has expired
    if (now - record.firstAttempt > LOCKOUT_CONFIG.attemptWindow) {
      // Window expired, reset record
      await kv.del(key);
      return { locked: false, remainingAttempts: LOCKOUT_CONFIG.maxAttempts };
    }

    const remainingAttempts = Math.max(
      0,
      LOCKOUT_CONFIG.maxAttempts - record.attempts
    );
    return { locked: false, remainingAttempts };
  } catch (error) {
    log("error", "Failed to check account lockout", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    // Fail open - allow login attempt if KV fails
    return { locked: false, remainingAttempts: LOCKOUT_CONFIG.maxAttempts };
  }
}

/**
 * Record a failed login attempt
 *
 * @param email - The email address that failed to login
 * @returns Object indicating if account is now locked
 */
export async function recordFailedAttempt(
  email: string
): Promise<{ locked: boolean; unlocksAt?: Date }> {
  try {
    const key = getLockoutKey(email);
    const now = Date.now();

    const record = await kv.get<LockoutRecord>(key);

    let newRecord: LockoutRecord;

    if (!record || now - record.firstAttempt > LOCKOUT_CONFIG.attemptWindow) {
      // First attempt or window expired - start fresh
      newRecord = {
        attempts: 1,
        firstAttempt: now,
      };
    } else {
      // Increment attempt count
      newRecord = {
        ...record,
        attempts: record.attempts + 1,
      };

      // Check if should lock
      if (newRecord.attempts >= LOCKOUT_CONFIG.maxAttempts) {
        newRecord.lockedUntil = now + LOCKOUT_CONFIG.lockoutDuration;

        log("warn", "Account locked due to failed attempts", {
          email: email.slice(0, 3) + "***",
          attempts: newRecord.attempts,
          lockedUntil: new Date(newRecord.lockedUntil).toISOString(),
        });
      }
    }

    // Store with TTL
    const ttlSeconds = Math.ceil(
      (LOCKOUT_CONFIG.lockoutDuration + LOCKOUT_CONFIG.attemptWindow) / 1000
    );
    await kv.set(key, newRecord, { ex: ttlSeconds });

    if (newRecord.lockedUntil && newRecord.lockedUntil > now) {
      return {
        locked: true,
        unlocksAt: new Date(newRecord.lockedUntil),
      };
    }

    return { locked: false };
  } catch (error) {
    log("error", "Failed to record failed attempt", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return { locked: false };
  }
}

/**
 * Clear lockout after successful login
 *
 * @param email - The email address to clear
 */
export async function clearLockout(email: string): Promise<void> {
  try {
    const key = getLockoutKey(email);
    await kv.del(key);
  } catch (error) {
    log("error", "Failed to clear lockout", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Get lockout status message for display
 */
export function getLockoutMessage(unlocksAt: Date): string {
  const now = new Date();
  const diffMs = unlocksAt.getTime() - now.getTime();
  const diffMins = Math.ceil(diffMs / (60 * 1000));

  if (diffMins <= 1) {
    return "Account is temporarily locked. Please try again in about a minute.";
  }

  return `Account is temporarily locked due to too many failed attempts. Please try again in ${diffMins} minutes.`;
}

/**
 * Export configuration for reference
 */
export const LOCKOUT_SETTINGS = {
  maxAttempts: LOCKOUT_CONFIG.maxAttempts,
  lockoutDurationMinutes: LOCKOUT_CONFIG.lockoutDuration / (60 * 1000),
};
