/**
 * Donation Database Queries
 * Database operations for donations
 */

import { db } from "@/db";
import {
  donations,
  type Donation,
  type NewDonation,
} from "@/db/schema/donations";
import { eq, desc, and, count, lt } from "drizzle-orm";

/**
 * Generate an idempotency key for a donation
 * Uses a 30-second time window to allow retries within the same window
 */
export function generateIdempotencyKey(
  campaignId: string,
  donorWallet: string,
  amountLamports: string
): string {
  const timeWindow = Math.floor(Date.now() / 30000); // 30-second windows
  return `${campaignId}:${donorWallet}:${amountLamports}:${timeWindow}`;
}

/**
 * Get a pending donation by idempotency key
 */
export async function getDonationByIdempotencyKey(
  idempotencyKey: string
): Promise<Donation | null> {
  const [donation] = await db
    .select()
    .from(donations)
    .where(eq(donations.idempotencyKey, idempotencyKey))
    .limit(1);
  return donation || null;
}

/**
 * Create a new donation record with idempotency
 * Returns existing donation if idempotency key matches
 */
export async function createDonationWithIdempotency(
  data: NewDonation & { idempotencyKey: string }
): Promise<{ donation: Donation; isNew: boolean }> {
  // Check for existing donation with same idempotency key
  const existing = await getDonationByIdempotencyKey(data.idempotencyKey);
  if (existing) {
    return { donation: existing, isNew: false };
  }

  // Create new donation
  const [donation] = await db.insert(donations).values(data).returning();
  return { donation, isNew: true };
}

/**
 * Create a new donation record (legacy, without idempotency)
 */
export async function createDonation(data: NewDonation): Promise<Donation> {
  const [donation] = await db.insert(donations).values(data).returning();
  return donation;
}

/**
 * Get a donation by ID
 */
export async function getDonationById(id: string): Promise<Donation | null> {
  const [donation] = await db
    .select()
    .from(donations)
    .where(eq(donations.id, id))
    .limit(1);
  return donation || null;
}

/**
 * Get a donation by transaction signature
 */
export async function getDonationByTxSignature(
  txSignature: string,
): Promise<Donation | null> {
  const [donation] = await db
    .select()
    .from(donations)
    .where(eq(donations.txSignature, txSignature))
    .limit(1);
  return donation || null;
}

/**
 * Get donations for a campaign
 */
export async function getDonationsByCampaign(
  campaignId: string,
  options: { limit?: number; offset?: number; status?: string } = {},
): Promise<{ donations: Donation[]; total: number }> {
  const { limit = 20, offset = 0, status } = options;

  const conditions = [eq(donations.campaignId, campaignId)];

  if (status) {
    conditions.push(eq(donations.status, status as Donation["status"]));
  }

  const whereClause = and(...conditions);

  const [result, countResult] = await Promise.all([
    db
      .select()
      .from(donations)
      .where(whereClause)
      .orderBy(desc(donations.confirmedAt), desc(donations.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: count() }).from(donations).where(whereClause),
  ]);

  return {
    donations: result,
    total: countResult[0]?.count || 0,
  };
}

/**
 * Update donation status to confirmed
 */
export async function confirmDonation(
  id: string,
  txSignature: string,
): Promise<Donation | null> {
  const [donation] = await db
    .update(donations)
    .set({
      status: "confirmed",
      txSignature,
      confirmedAt: new Date(),
    })
    .where(eq(donations.id, id))
    .returning();
  return donation || null;
}

/**
 * Mark donation as failed
 */
export async function failDonation(id: string): Promise<Donation | null> {
  const [donation] = await db
    .update(donations)
    .set({ status: "failed" })
    .where(eq(donations.id, id))
    .returning();
  return donation || null;
}

/**
 * Get donations by donor wallet
 */
export async function getDonationsByWallet(
  wallet: string,
  options: { limit?: number; offset?: number } = {},
): Promise<Donation[]> {
  const { limit = 20, offset = 0 } = options;

  return db
    .select()
    .from(donations)
    .where(eq(donations.donorWallet, wallet))
    .orderBy(desc(donations.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Get confirmed donations for a campaign (for public display)
 */
export async function getConfirmedDonations(
  campaignId: string,
  limit = 10,
): Promise<Donation[]> {
  return db
    .select()
    .from(donations)
    .where(
      and(
        eq(donations.campaignId, campaignId),
        eq(donations.status, "confirmed"),
      ),
    )
    .orderBy(desc(donations.confirmedAt))
    .limit(limit);
}

/**
 * Expire stale pending donations
 * Marks donations as failed if they've been pending for more than the specified time
 * Should be called periodically (e.g., via cron job or Inngest function)
 *
 * @param maxAgeMinutes - Maximum age in minutes before a pending donation is expired (default 10)
 * @returns Number of donations expired
 */
export async function expireStalePendingDonations(
  maxAgeMinutes: number = 10
): Promise<number> {
  const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);

  const result = await db
    .update(donations)
    .set({ status: "failed" })
    .where(
      and(
        eq(donations.status, "pending"),
        lt(donations.createdAt, cutoffTime)
      )
    )
    .returning();

  return result.length;
}
