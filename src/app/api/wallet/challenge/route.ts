/**
 * Wallet Challenge API
 * Generates a unique challenge message for wallet signature verification
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateChallengeMessage } from "@/lib/solana/signature";
import { validateWalletAddress } from "@/lib/solana/validation";

const querySchema = z.object({
  wallet: z.string().min(32).max(44),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    // Validate query params
    const result = querySchema.safeParse({ wallet });
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid wallet parameter" },
        { status: 400 },
      );
    }

    // Validate wallet address format
    const validWallet = validateWalletAddress(result.data.wallet);
    if (!validWallet) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 },
      );
    }

    // Generate challenge message
    const { message, nonce } = generateChallengeMessage(result.data.wallet);

    return NextResponse.json({
      message,
      nonce,
      wallet: result.data.wallet,
    });
  } catch (error) {
    console.error("GET /api/wallet/challenge error:", error);
    return NextResponse.json(
      { error: "Failed to generate challenge" },
      { status: 500 },
    );
  }
}
