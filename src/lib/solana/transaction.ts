/**
 * Transaction building utilities for Solana donations
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { SOLANA_CONFIG, LAMPORTS_PER_SOL } from "./config";
import type { FeeCalculation, DonationTransactionParams } from "./types";

/**
 * Calculate fee split for a donation
 * Fee: floor(totalLamports * FEE_PCT)
 * Creator: total - fee
 */
export function calculateFeeSplit(amountSol: number): FeeCalculation {
  const totalLamports = BigInt(Math.floor(amountSol * Number(LAMPORTS_PER_SOL)));
  const platformFeeLamports = BigInt(
    Math.floor(Number(totalLamports) * SOLANA_CONFIG.PLATFORM_FEE_PERCENT)
  );
  const creatorLamports = totalLamports - platformFeeLamports;

  return {
    totalLamports,
    platformFeeLamports,
    creatorLamports,
  };
}

/**
 * Create connection to Solana cluster
 */
export function getConnection(): Connection {
  return new Connection(SOLANA_CONFIG.RPC_URL, "confirmed");
}

/**
 * Build donation transaction with two transfers:
 * 1. Creator wallet receives (total - fee)
 * 2. Platform wallet receives fee (if fee > 0)
 */
export async function buildDonationTransaction(
  params: DonationTransactionParams
): Promise<Transaction> {
  const { donor, creator, amountSol } = params;

  const fees = calculateFeeSplit(amountSol);

  // Validate creator receives > 0
  if (fees.creatorLamports <= BigInt(0)) {
    throw new Error("Donation amount too small after fee deduction");
  }

  const transaction = new Transaction();

  // Transfer to creator (main donation)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: donor,
      toPubkey: creator,
      lamports: fees.creatorLamports,
    })
  );

  // Transfer platform fee (if > 0 and platform wallet is configured)
  if (
    fees.platformFeeLamports > BigInt(0) &&
    SOLANA_CONFIG.PLATFORM_WALLET !== "11111111111111111111111111111111"
  ) {
    const platformWallet = new PublicKey(SOLANA_CONFIG.PLATFORM_WALLET);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: donor,
        toPubkey: platformWallet,
        lamports: fees.platformFeeLamports,
      })
    );
  }

  // Get recent blockhash for transaction
  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = donor;

  return transaction;
}

/**
 * Format lamports as SOL string for display
 */
export function formatLamportsToSol(lamports: bigint): string {
  const sol = Number(lamports) / Number(LAMPORTS_PER_SOL);
  return sol.toFixed(4);
}
