/**
 * Donation Confirmation API
 * POST - Confirm a donation by verifying the transaction on-chain
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

const confirmSchema = z.object({
  donationId: z.string().uuid().optional(),
  txSignature: z.string().min(1),
});

/**
 * POST - Confirm a donation
 * Verifies the transaction on-chain and updates records
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request
    const result = confirmSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { donationId, txSignature } = result.data;

    // Check if this transaction was already processed
    const existingByTx = await getDonationByTxSignature(txSignature);
    if (existingByTx && existingByTx.status === "confirmed") {
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
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 },
      );
    }

    // Verify transaction on-chain
    const connection = new Connection(SOLANA_CONFIG.RPC_URL, "confirmed");

    try {
      const tx = await connection.getTransaction(txSignature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) {
        // Transaction not found yet - might still be processing
        return NextResponse.json(
          { error: "Transaction not found. It may still be processing." },
          { status: 202 },
        );
      }

      if (tx.meta?.err) {
        // Transaction failed
        await failDonation(donation.id);
        return NextResponse.json(
          { error: "Transaction failed on-chain" },
          { status: 400 },
        );
      }

      // Transaction confirmed - update donation record
      const confirmedDonation = await confirmDonation(donation.id, txSignature);

      if (!confirmedDonation) {
        return NextResponse.json(
          { error: "Failed to update donation record" },
          { status: 500 },
        );
      }

      // Update campaign raised amount
      await updateCampaignRaisedAmount(
        donation.campaignId,
        BigInt(donation.amountLamports),
      );

      console.log(
        `[Confirm] donation=${donation.id} campaign=${donation.campaignId} tx=${txSignature}`,
      );

      return NextResponse.json({
        success: true,
        message: "Donation confirmed",
        donationId: confirmedDonation.id,
        campaignId: confirmedDonation.campaignId,
        amountLamports: confirmedDonation.amountLamports,
      });
    } catch (rpcError) {
      console.error("RPC error verifying transaction:", rpcError);
      return NextResponse.json(
        { error: "Failed to verify transaction. Please try again." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("POST /api/donations/confirm error:", error);
    return NextResponse.json(
      { error: "Failed to confirm donation" },
      { status: 500 },
    );
  }
}
