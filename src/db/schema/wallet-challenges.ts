/**
 * Wallet Challenges Schema
 * Stores challenge nonces for wallet verification to prevent replay attacks
 */

import { timestamp, pgTable, text, index } from "drizzle-orm/pg-core";

export const walletChallenges = pgTable(
  "wallet_challenges",
  {
    // Primary key - UUID
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // The nonce from the challenge
    nonce: text("nonce").unique().notNull(),

    // Wallet address the challenge was issued for
    walletAddress: text("wallet_address").notNull(),

    // The full challenge message
    message: text("message").notNull(),

    // When the challenge was created
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),

    // When the challenge expires (5 minutes from creation)
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),

    // When the challenge was used (null if not yet used)
    usedAt: timestamp("used_at", { mode: "date" }),
  },
  (table) => [
    // Index for nonce lookups
    index("wallet_challenges_nonce_idx").on(table.nonce),
    // Index for wallet address lookups
    index("wallet_challenges_wallet_address_idx").on(table.walletAddress),
    // Index for cleanup of expired challenges
    index("wallet_challenges_expires_at_idx").on(table.expiresAt),
  ]
);

export type WalletChallenge = typeof walletChallenges.$inferSelect;
export type NewWalletChallenge = typeof walletChallenges.$inferInsert;
