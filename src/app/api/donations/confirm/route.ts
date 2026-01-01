/**
 * Donation Confirmation API
 * POST - Confirm a donation by verifying the transaction on-chain
 *
 * Rate limited to prevent abuse and RPC exhaustion.
 */

import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { z } from "zod";
import { SOLANA_CONFIG } from "@/lib/solana";
import {
  getDonationById,
  getDonationByTxSignature,
  confirmDonation,
  failDonation,
} from "@/lib/donations/queries";
import { updateCampaignRaisedAmount } from "@/lib/campaigns/queries";
import { rateLimitConfigs, getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { log, generateRequestId, logDonation } from "@/lib/logging";

const confirmSchema = z.object({
  donationId: z.string().uuid().optional(),
  txSignature: z.string().min(1).max(100),
});

// Rate limit: 30 confirmations per minute per IP
const confirmRateLimit = { maxRequests: 30, windowMs: 60 * 1000 };

/**
 * POST - Confirm a donation
 * Verifies the transaction on-chain and updates records
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResponse = await checkRateLimit(
    confirmRateLimit,
    clientIp,
    "donation-confirm"
  );
  if (rateLimitResponse) {
    log("warn", "Rate limit exceeded for donation confirmation", {
      requestId,
      ip: clientIp,
    });
    return rateLimitResponse;
  }

  try {
    const body = await req.json();

    // Validate request
    const result = confirmSchema.safeParse(body);
    if (!result.success) {
      log("warn", "Invalid confirmation request", {
        requestId,
        error: result.error.message,
      });
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { donationId, txSignature } = result.data;

    log("info", "Processing donation confirmation", {
      requestId,
      donationId,
      txSignature: txSignature.slice(0, 20) + "...",
    });

    // Check if this transaction was already processed
    const existingByTx = await getDonationByTxSignature(txSignature);
    if (existingByTx && existingByTx.status === "confirmed") {
      log("info", "Donation already confirmed", {
        requestId,
        donationId: existingByTx.id,
        txSignature: txSignature.slice(0, 20) + "...",
      });
      return NextResponse.json({
        success: true,
        message: "Donation already confirmed",
        donationId: existingByTx.id,
      });
    }

    // Get donation record if ID provided
    let donation = donationId ? await getDonationById(donationId) : null;

    // If no donation found by ID but we have a tx signature match
    if (!donation && existingByTx) {
      donation = existingByTx;
    }

    if (!donation) {
      log("warn", "Donation not found for confirmation", {
        requestId,
        donationId,
        txSignature: txSignature.slice(0, 20) + "...",
      });
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 }
      );
    }

    // Verify transaction on-chain
    const connection = new Connection(SOLANA_CONFIG.RPC_URL, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 30000,
    });

    try {
      const tx = await connection.getTransaction(txSignature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        // Transaction not found yet - might still be processing
        log("info", "Transaction not found yet, may still be processing", {
          requestId,
          donationId: donation.id,
          txSignature: txSignature.slice(0, 20) + "...",
        });
        return NextResponse.json(
          { error: "Transaction not found. It may still be processing." },
          { status: 202 }
        );
      }

      if (tx.meta?.err) {
        // Transaction failed
        await failDonation(donation.id);
        logDonation("failed", {
          requestId,
          donationId: donation.id,
          campaignId: donation.campaignId,
          txSignature: txSignature.slice(0, 20) + "...",
          error: JSON.stringify(tx.meta.err),
        });
        return NextResponse.json(
          { error: "Transaction failed on-chain" },
          { status: 400 }
        );
      }

      // Transaction confirmed - update donation record
      const confirmedDonation = await confirmDonation(donation.id, txSignature);

      if (!confirmedDonation) {
        log("error", "Failed to update donation record", {
          requestId,
          donationId: donation.id,
        });
        return NextResponse.json(
          { error: "Failed to update donation record" },
          { status: 500 }
        );
      }

      // Update campaign raised amount
      await updateCampaignRaisedAmount(
        donation.campaignId,
        BigInt(donation.amountLamports)
      );

      const durationMs = Date.now() - startTime;
      logDonation("confirmed", {
        requestId,
        donationId: confirmedDonation.id,
        campaignId: confirmedDonation.campaignId,
        amountLamports: confirmedDonation.amountLamports,
        txSignature: txSignature.slice(0, 20) + "...",
        durationMs,
      });

      return NextResponse.json({
        success: true,
        message: "Donation confirmed",
        donationId: confirmedDonation.id,
        campaignId: confirmedDonation.campaignId,
        amountLamports: confirmedDonation.amountLamports,
      });
    } catch (rpcError) {
      log("error", "RPC error verifying transaction", {
        requestId,
        donationId: donation.id,
        error: rpcError instanceof Error ? rpcError.message : String(rpcError),
      });
      return NextResponse.json(
        { error: "Failed to verify transaction. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log("error", "Donation confirmation failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });
    return NextResponse.json(
      { error: "Failed to confirm donation" },
      { status: 500 }
    );
  }
}
