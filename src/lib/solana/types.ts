/**
 * TypeScript types for Solana Actions/Blink platform
 */

import type { PublicKey } from "@solana/web3.js";

// Re-export from @solana/actions for convenience
export type {
  ActionGetResponse,
  ActionPostResponse,
  ActionPostRequest,
} from "@solana/actions";

/**
 * Campaign configuration passed via URL params
 */
export interface CampaignParams {
  wallet?: string; // Creator's Solana wallet (required for POST)
  title?: string; // Campaign title
  desc?: string; // Campaign description
  image?: string; // Campaign image URL
  amount?: string; // Donation amount (required for POST)
}

/**
 * Validated campaign for transaction building
 */
export interface ValidatedCampaign {
  creatorWallet: PublicKey;
  title: string;
  description: string;
  image: string;
  amountSol: number;
  amountLamports: bigint;
}

/**
 * Fee calculation result
 */
export interface FeeCalculation {
  totalLamports: bigint;
  platformFeeLamports: bigint;
  creatorLamports: bigint;
}

/**
 * Donation transaction params
 */
export interface DonationTransactionParams {
  donor: PublicKey;
  creator: PublicKey;
  amountSol: number;
}
