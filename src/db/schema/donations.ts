/**
 * Donations Schema
 * Tracks individual donations to campaigns with on-chain verification
 */

import {
  timestamp,
  pgTable,
  text,
  pgEnum,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { campaigns } from "./campaigns";

// Donation status enum
export const donationStatusEnum = pgEnum("donation_status", [
  "pending", // Transaction submitted, awaiting confirmation
  "confirmed", // Transaction confirmed on-chain
  "failed", // Transaction failed or rejected
]);

export const donations = pgTable(
  "donations",
  {
    // Primary key - UUID
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Foreign key to campaign
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),

    // Donor wallet address
    donorWallet: text("donor_wallet").notNull(),

    // Amount breakdown (all in lamports)
    amountLamports: numeric("amount_lamports", {
      precision: 20,
      scale: 0,
    }).notNull(),
    platformFeeLamports: numeric("platform_fee_lamports", {
      precision: 20,
      scale: 0,
    }).notNull(),
    creatorLamports: numeric("creator_lamports", {
      precision: 20,
      scale: 0,
    }).notNull(),

    // Solana transaction signature (unique identifier)
    txSignature: text("tx_signature").unique(),

    // Donation status
    status: donationStatusEnum("status").default("pending").notNull(),

    // Timestamps
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at", { mode: "date" }),
  },
  (table) => [
    // Index for looking up donations by campaign
    index("donations_campaign_id_idx").on(table.campaignId),
    // Index for looking up donations by donor
    index("donations_donor_wallet_idx").on(table.donorWallet),
    // Index for transaction signature lookups
    index("donations_tx_signature_idx").on(table.txSignature),
    // Index for filtering by status
    index("donations_status_idx").on(table.status),
  ],
);

export type Donation = typeof donations.$inferSelect;
export type NewDonation = typeof donations.$inferInsert;
