/**
 * Transaction building utilities for Solana donations
 *
 * IMPORTANT: Uses integer-only math to avoid floating point precision loss.
 * SOL amounts are converted to lamports using string parsing, not float multiplication.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { SOLANA_CONFIG, LAMPORTS_PER_SOL, SYSTEM_PROGRAM_ID, isPlatformFeeEnabled, validatePlatformWalletOrThrow } from "./config";
import type { FeeCalculation, DonationTransactionParams } from "./types";

/**
 * Convert SOL amount to lamports using integer-safe math
 * Avoids floating point precision issues by parsing the decimal string
 *
 * @param amountSol - Amount in SOL (e.g., 1.5, 0.001)
 * @returns Amount in lamports as BigInt
 */
export function solToLamportsSafe(amountSol: number): bigint {
  // Convert to string with max 9 decimal places (SOL precision)
  const solString = amountSol.toFixed(9);
  const [whole, decimal = ""] = solString.split(".");

  // Pad decimal to exactly 9 places and combine with whole part
  const paddedDecimal = decimal.padEnd(9, "0").slice(0, 9);
  const lamportsString = whole + paddedDecimal;

  // Parse as BigInt (removes leading zeros automatically)
  return BigInt(lamportsString);
}

/**
 * Calculate fee split for a donation
 * Uses integer-only math to avoid floating point precision loss
 *
 * Fee calculation: floor(totalLamports * FEE_PERCENT)
 * For 2% fee: fee = total * 2 / 100
 *
 * @param amountSol - Donation amount in SOL
 * @returns Fee breakdown in lamports
 */
export function calculateFeeSplit(amountSol: number): FeeCalculation {
  const totalLamports = solToLamportsSafe(amountSol);

  // Calculate fee using integer math
  // For 2% = 0.02, we use (total * 2) / 100 to maintain precision
  const feePercentNumerator = BigInt(Math.floor(SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100));
  const platformFeeLamports = (totalLamports * feePercentNumerator) / BigInt(100);
  const creatorLamports = totalLamports - platformFeeLamports;

  return {
    totalLamports,
    platformFeeLamports,
    creatorLamports,
  };
}

/**
 * Create connection to Solana cluster with timeout
 */
export function getConnection(): Connection {
  return new Connection(SOLANA_CONFIG.RPC_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: SOLANA_CONFIG.RPC_TIMEOUT_MS,
  });
}

/**
 * Build donation transaction with transfers to creator and platform
 *
 * Transaction structure:
 * 1. Transfer (total - fee) lamports from donor to creator
 * 2. Transfer fee lamports from donor to platform wallet (if enabled)
 *
 * @param params - Donor, creator, and amount
 * @returns Unsigned transaction ready for wallet signing
 * @throws Error if amount is too small or platform wallet misconfigured
 */
export async function buildDonationTransaction(
  params: DonationTransactionParams,
): Promise<Transaction> {
  const { donor, creator, amountSol } = params;

  // Validate platform wallet configuration at runtime
  // This will throw in production if NEXT_PUBLIC_PLATFORM_WALLET is not set
  validatePlatformWalletOrThrow();

  const fees = calculateFeeSplit(amountSol);

  // Validate creator receives > 0 lamports
  if (fees.creatorLamports <= BigInt(0)) {
    throw new Error("Donation amount too small after fee deduction");
  }

  // Validate total amount is positive
  if (fees.totalLamports <= BigInt(0)) {
    throw new Error("Donation amount must be positive");
  }

  const connection = getConnection();

  const transaction = new Transaction();

  // Instruction 1: Transfer to creator (main donation minus fee)
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: donor,
      toPubkey: creator,
      lamports: fees.creatorLamports,
    }),
  );

  // Instruction 2: Transfer platform fee (if enabled and > 0)
  const platformFeeEnabled = isPlatformFeeEnabled();

  if (platformFeeEnabled && fees.platformFeeLamports > BigInt(0)) {
    // Validate platform wallet is not System Program
    if (SOLANA_CONFIG.PLATFORM_WALLET === SYSTEM_PROGRAM_ID) {
      throw new Error(
        "Platform wallet not configured. Cannot collect fees."
      );
    }

    const platformWallet = new PublicKey(SOLANA_CONFIG.PLATFORM_WALLET);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: donor,
        toPubkey: platformWallet,
        lamports: fees.platformFeeLamports,
      }),
    );
  }

  // Get recent blockhash with finalized commitment for better reliability
  // Finalized blocks are guaranteed to not be rolled back
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("finalized");

  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = donor;

  return transaction;
}

/**
 * Format lamports as SOL string for display
 *
 * @param lamports - Amount in lamports
 * @returns Formatted SOL string (e.g., "1.5000")
 */
export function formatLamportsToSol(lamports: bigint): string {
  const sol = Number(lamports) / Number(LAMPORTS_PER_SOL);
  return sol.toFixed(4);
}

/**
 * Validate that a transaction can be successfully submitted
 * Performs simulation to catch issues before user signs
 *
 * @param transaction - Transaction to validate
 * @param connection - Solana connection
 * @returns Simulation result
 */
export async function simulateTransaction(
  transaction: Transaction,
  connection: Connection,
): Promise<{ success: boolean; error?: string }> {
  try {
    const simulation = await connection.simulateTransaction(transaction);

    if (simulation.value.err) {
      return {
        success: false,
        error: JSON.stringify(simulation.value.err),
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Simulation failed",
    };
  }
}
