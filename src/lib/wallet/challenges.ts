/**
 * Wallet Challenge Queries
 * Database operations for wallet verification challenges
 */

import { db } from "@/db";
import {
  walletChallenges,
  type WalletChallenge,
  type NewWalletChallenge,
} from "@/db/schema/wallet-challenges";
import { eq, and, lt, isNull } from "drizzle-orm";

// Challenge validity duration: 5 minutes
const CHALLENGE_VALIDITY_MS = 5 * 60 * 1000;

/**
 * Create a new challenge for wallet verification
 */
export async function createChallenge(
  walletAddress: string,
  nonce: string,
  message: string
): Promise<WalletChallenge> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_VALIDITY_MS);

  const [challenge] = await db
    .insert(walletChallenges)
    .values({
      walletAddress,
      nonce,
      message,
      expiresAt,
    })
    .returning();

  return challenge;
}

/**
 * Get a valid challenge by nonce
 * Returns null if challenge doesn't exist, is expired, or already used
 */
export async function getValidChallengeByNonce(
  nonce: string
): Promise<WalletChallenge | null> {
  const now = new Date();

  const [challenge] = await db
    .select()
    .from(walletChallenges)
    .where(
      and(
        eq(walletChallenges.nonce, nonce),
        isNull(walletChallenges.usedAt),
        // Not expired
      )
    )
    .limit(1);

  if (!challenge) {
    return null;
  }

  // Check if expired
  if (challenge.expiresAt < now) {
    return null;
  }

  return challenge;
}

/**
 * Mark a challenge as used
 */
export async function markChallengeUsed(nonce: string): Promise<boolean> {
  const result = await db
    .update(walletChallenges)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(walletChallenges.nonce, nonce),
        isNull(walletChallenges.usedAt)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Clean up expired challenges
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupExpiredChallenges(): Promise<number> {
  const now = new Date();

  const result = await db
    .delete(walletChallenges)
    .where(lt(walletChallenges.expiresAt, now))
    .returning();

  return result.length;
}

/**
 * Extract nonce from a challenge message
 */
export function extractNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce: ([a-f0-9-]+)/i);
  return match ? match[1] : null;
}
