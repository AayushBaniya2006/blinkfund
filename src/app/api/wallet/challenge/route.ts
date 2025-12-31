/**
 * Wallet Challenge API
 * Generates a unique challenge message for wallet signature verification
 * Stores the challenge in DB to prevent replay attacks
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateChallengeMessage } from "@/lib/solana/signature";
import { validateWalletAddress } from "@/lib/solana/validation";
import { createChallenge } from "@/lib/wallet/challenges";
import { log, generateRequestId } from "@/lib/logging";

const querySchema = z.object({
  wallet: z.string().min(32).max(44),
});

export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    // Validate query params
    const result = querySchema.safeParse({ wallet });
    if (!result.success) {
      log("warn", "Invalid wallet parameter for challenge", { requestId });
      return NextResponse.json(
        { error: "Invalid wallet parameter" },
        { status: 400 }
      );
    }

    // Validate wallet address format
    const validWallet = validateWalletAddress(result.data.wallet);
    if (!validWallet) {
      log("warn", "Invalid Solana wallet address for challenge", {
        requestId,
        wallet: result.data.wallet.slice(0, 8) + "...",
      });
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 }
      );
    }

    // Generate challenge message
    const { message, nonce } = generateChallengeMessage(result.data.wallet);

    // Store challenge in database for validation
    try {
      await createChallenge(result.data.wallet, nonce, message);
      log("info", "Wallet challenge created", {
        requestId,
        wallet: result.data.wallet.slice(0, 8) + "...",
      });
    } catch (dbError) {
      // If DB fails, still return the challenge but log the error
      // The verification will fail but at least the user can try again
      log("error", "Failed to store wallet challenge", {
        requestId,
        error: dbError instanceof Error ? dbError.message : String(dbError),
      });
    }

    return NextResponse.json({
      message,
      nonce,
      wallet: result.data.wallet,
      expiresIn: 300, // 5 minutes in seconds
    });
  } catch (error) {
    log("error", "Wallet challenge generation failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to generate challenge" },
      { status: 500 }
    );
  }
}
