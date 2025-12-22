/**
 * Campaign Database Queries
 * Database operations for campaigns
 */

import { db } from "@/db";
import {
  campaigns,
  type Campaign,
  type NewCampaign,
} from "@/db/schema/campaigns";
import { eq, desc, and, sql, count } from "drizzle-orm";
import type { CampaignQueryInput } from "./validation";

/**
 * Create a new campaign
 */
export async function createCampaign(data: NewCampaign): Promise<Campaign> {
  const [campaign] = await db.insert(campaigns).values(data).returning();
  return campaign;
}

/**
 * Get a campaign by ID
 */
export async function getCampaignById(id: string): Promise<Campaign | null> {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .limit(1);
  return campaign || null;
}

/**
 * Get a campaign by slug
 */
export async function getCampaignBySlug(
  slug: string,
): Promise<Campaign | null> {
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.slug, slug))
    .limit(1);
  return campaign || null;
}

/**
 * List campaigns with filters
 */
export async function listCampaigns(
  query: CampaignQueryInput,
): Promise<{ campaigns: Campaign[]; total: number }> {
  const conditions = [];

  if (query.status) {
    conditions.push(eq(campaigns.status, query.status));
  }

  if (query.wallet) {
    conditions.push(eq(campaigns.creatorWallet, query.wallet));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [result, countResult] = await Promise.all([
    db
      .select()
      .from(campaigns)
      .where(whereClause)
      .orderBy(desc(campaigns.createdAt))
      .limit(query.limit)
      .offset(query.offset),
    db.select({ count: count() }).from(campaigns).where(whereClause),
  ]);

  return {
    campaigns: result,
    total: countResult[0]?.count || 0,
  };
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  id: string,
  data: Partial<NewCampaign>,
): Promise<Campaign | null> {
  const [campaign] = await db
    .update(campaigns)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();
  return campaign || null;
}

/**
 * Publish a campaign (change status from draft to active)
 */
export async function publishCampaign(id: string): Promise<Campaign | null> {
  const [campaign] = await db
    .update(campaigns)
    .set({
      status: "active",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.id, id), eq(campaigns.status, "draft")))
    .returning();
  return campaign || null;
}

/**
 * Cancel a campaign
 */
export async function cancelCampaign(id: string): Promise<Campaign | null> {
  const [campaign] = await db
    .update(campaigns)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning();
  return campaign || null;
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(id: string): Promise<Campaign | null> {
  const [campaign] = await db
    .update(campaigns)
    .set({
      status: "paused",
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.id, id), eq(campaigns.status, "active")))
    .returning();
  return campaign || null;
}

/**
 * Resume a paused campaign
 */
export async function resumeCampaign(id: string): Promise<Campaign | null> {
  const [campaign] = await db
    .update(campaigns)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(and(eq(campaigns.id, id), eq(campaigns.status, "paused")))
    .returning();
  return campaign || null;
}

/**
 * Update campaign raised amount (called when donation is confirmed)
 */
export async function updateCampaignRaisedAmount(
  id: string,
  additionalLamports: bigint,
): Promise<Campaign | null> {
  const [campaign] = await db
    .update(campaigns)
    .set({
      raisedLamports: sql`${campaigns.raisedLamports} + ${additionalLamports.toString()}`,
      donationCount: sql`${campaigns.donationCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(campaigns.id, id))
    .returning();
  return campaign || null;
}

/**
 * Get campaigns by creator wallet
 */
export async function getCampaignsByWallet(
  wallet: string,
): Promise<Campaign[]> {
  return db
    .select()
    .from(campaigns)
    .where(eq(campaigns.creatorWallet, wallet))
    .orderBy(desc(campaigns.createdAt));
}

/**
 * Check if a slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(eq(campaigns.slug, slug))
    .limit(1);
  return !existing;
}

/**
 * Get campaign with donation stats
 */
export async function getCampaignWithStats(id: string) {
  const campaign = await getCampaignById(id);
  if (!campaign) return null;

  // Calculate progress percentage
  const goalLamports = BigInt(campaign.goalLamports);
  const raisedLamports = BigInt(campaign.raisedLamports);
  const progressPercent =
    goalLamports > BigInt(0) ? Number((raisedLamports * BigInt(100)) / goalLamports) : 0;

  // Time remaining
  const now = new Date();
  const deadline = new Date(campaign.deadline);
  const timeRemaining = deadline.getTime() - now.getTime();
  const daysRemaining = Math.max(
    0,
    Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)),
  );

  return {
    ...campaign,
    progressPercent: Math.min(100, progressPercent),
    daysRemaining,
    isExpired: timeRemaining <= 0,
    isGoalReached: raisedLamports >= goalLamports,
  };
}
