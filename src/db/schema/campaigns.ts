/**
 * Campaigns Schema
 * Stores crowdfunding campaigns with goals, deadlines, and progress tracking
 */

import {
  timestamp,
  pgTable,
  text,
  pgEnum,
  numeric,
  index,
} from "drizzle-orm/pg-core";

// Campaign status enum
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft", // Created but not published
  "active", // Published and accepting donations
  "paused", // Temporarily paused by creator
  "completed", // Goal reached or deadline passed (success)
  "cancelled", // Cancelled by creator
]);

export const campaigns = pgTable(
  "campaigns",
  {
    // Primary key - UUID pattern from existing schemas
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // URL-friendly slug for public pages (e.g., /campaign/save-the-whales)
    slug: text("slug").unique().notNull(),

    // Creator identity (verified wallet address)
    creatorWallet: text("creator_wallet").notNull(),

    // Campaign content
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),

    // Funding goal (stored in lamports for precision)
    // Using numeric for large numbers (lamports can exceed JS number precision)
    goalLamports: numeric("goal_lamports", {
      precision: 20,
      scale: 0,
    }).notNull(),

    // Amount raised so far (updated when donations are confirmed)
    raisedLamports: numeric("raised_lamports", { precision: 20, scale: 0 })
      .default("0")
      .notNull(),

    // Donation count for display
    donationCount: numeric("donation_count", { precision: 10, scale: 0 })
      .default("0")
      .notNull(),

    // Deadline for the campaign
    deadline: timestamp("deadline", { mode: "date" }).notNull(),

    // Campaign status
    status: campaignStatusEnum("status").default("draft").notNull(),

    // Timestamps (pattern from existing schemas)
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
    publishedAt: timestamp("published_at", { mode: "date" }),
  },
  (table) => [
    // Index for looking up campaigns by creator wallet
    index("campaigns_creator_wallet_idx").on(table.creatorWallet),
    // Index for filtering by status
    index("campaigns_status_idx").on(table.status),
    // Index for slug lookups
    index("campaigns_slug_idx").on(table.slug),
  ],
);

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
