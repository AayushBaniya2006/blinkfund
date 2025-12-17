/**
 * Validation utilities for Solana wallet addresses and donation amounts
 */

import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { SOLANA_CONFIG, SYSTEM_PROGRAM_ID } from "./config";

/**
 * Validates a Solana wallet address string
 * Returns PublicKey if valid, null if invalid
 */
export function validateWalletAddress(address: string): PublicKey | null {
  try {
    // Check basic format (base58, 32-44 chars)
    if (!address || address.length < 32 || address.length > 44) {
      return null;
    }

    const pubkey = new PublicKey(address);

    // Reject system program address (cannot receive donations)
    if (pubkey.toBase58() === SYSTEM_PROGRAM_ID) {
      return null;
    }

    // Validate it's on the ed25519 curve
    if (!PublicKey.isOnCurve(pubkey.toBytes())) {
      return null;
    }

    return pubkey;
  } catch {
    return null;
  }
}

/**
 * Validates donation amount
 * Returns parsed number if valid, null if invalid
 */
export function validateAmount(amountStr: string): number | null {
  const amount = parseFloat(amountStr);

  // Check for NaN, Infinity, negative, zero
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  // Check bounds
  if (amount < SOLANA_CONFIG.MIN_AMOUNT || amount > SOLANA_CONFIG.MAX_AMOUNT) {
    return null;
  }

  return amount;
}

/**
 * Client-side wallet validation (basic base58 check)
 * For use in browser without @solana/web3.js
 */
export function isValidSolanaAddressFormat(address: string): boolean {
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return (
    base58Regex.test(address) &&
    address !== SYSTEM_PROGRAM_ID
  );
}

// Zod schema for URL parameter validation
export const campaignParamsSchema = z.object({
  wallet: z.string().optional(),
  title: z.string().max(100).optional(),
  desc: z.string().max(500).optional(),
  image: z.string().url().optional().or(z.literal("")),
  amount: z.string().optional(),
});

// Zod schema for POST body validation
export const postBodySchema = z.object({
  account: z.string().min(32).max(44),
});

export type CampaignParamsInput = z.infer<typeof campaignParamsSchema>;
export type PostBodyInput = z.infer<typeof postBodySchema>;
