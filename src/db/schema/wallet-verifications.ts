/**
 * Wallet Verifications Schema
 * Stores proof of wallet ownership via signature verification
 */

import { timestamp, pgTable, text, index } from "drizzle-orm/pg-core";

export const walletVerifications = pgTable(
  "wallet_verifications",
  {
    // Primary key - UUID
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),

    // Wallet address being verified (unique - one record per wallet)
    walletAddress: text("wallet_address").unique().notNull(),

    // The message that was signed
    signedMessage: text("signed_message").notNull(),

    // The signature (base58 encoded)
    signature: text("signature").notNull(),

    // When the wallet was verified
    verifiedAt: timestamp("verified_at", { mode: "date" })
      .defaultNow()
      .notNull(),

    // Optional expiry for re-verification (null = never expires)
    expiresAt: timestamp("expires_at", { mode: "date" }),
  },
  (table) => [
    // Index for wallet address lookups
    index("wallet_verifications_wallet_address_idx").on(table.walletAddress),
  ],
);

export type WalletVerification = typeof walletVerifications.$inferSelect;
export type NewWalletVerification = typeof walletVerifications.$inferInsert;
