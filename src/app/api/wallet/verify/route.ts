/**
 * Wallet Verification API
 * Verifies wallet ownership via signature and stores verification record
 * Validates challenge nonce to prevent replay attacks
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { walletVerifications } from "@/db/schema/wallet-verifications";
import { verifyWalletSignature } from "@/lib/solana/signature";
import { validateWalletAddress } from "@/lib/solana/validation";
import { eq } from "drizzle-orm";
import { rateLimitConfigs, getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { log, generateRequestId } from "@/lib/logging";
import {
  getValidChallengeByNonce,
  markChallengeUsed,
  extractNonceFromMessage,
} from "@/lib/wallet/challenges";

const verifyBodySchema = z.object({
  wallet: z.string().min(32).max(44),
  message: z.string().min(1),
  signature: z.string().min(1),
});

const querySchema = z.object({
  wallet: z.string().min(32).max(44),
});

/**
 * POST - Verify wallet signature and store verification record
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResponse = checkRateLimit(
    rateLimitConfigs.walletVerify,
    clientIp,
    "wallet-verify"
  );
  if (rateLimitResponse) {
    log("warn", "Rate limit exceeded for wallet verification", {
      requestId,
      ip: clientIp,
    });
    return rateLimitResponse;
  }

  try {
    const body = await req.json();

    // Validate request body
    const result = verifyBodySchema.safeParse(body);
    if (!result.success) {
      log("warn", "Invalid wallet verification request body", {
        requestId,
        error: result.error.message,
      });
      return NextResponse.json(
        { error: "Invalid request body", details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { wallet, message, signature } = result.data;

    // Validate wallet address
    const validWallet = validateWalletAddress(wallet);
    if (!validWallet) {
      log("warn", "Invalid Solana wallet address for verification", {
        requestId,
        wallet: wallet.slice(0, 8) + "...",
      });
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 }
      );
    }

    // Verify the message contains the wallet address (security check)
    if (!message.includes(wallet)) {
      log("warn", "Message does not contain wallet address", {
        requestId,
        wallet: wallet.slice(0, 8) + "...",
      });
      return NextResponse.json(
        { error: "Message does not match wallet address" },
        { status: 400 }
      );
    }

    // Extract and validate nonce from the message
    const nonce = extractNonceFromMessage(message);
    if (!nonce) {
      log("warn", "Could not extract nonce from message", {
        requestId,
        wallet: wallet.slice(0, 8) + "...",
      });
      return NextResponse.json(
        { error: "Invalid challenge message format" },
        { status: 400 }
      );
    }

    // Validate the challenge exists, is not expired, and hasn't been used
    const challenge = await getValidChallengeByNonce(nonce);
    if (!challenge) {
      log("warn", "Invalid or expired challenge nonce", {
        requestId,
        wallet: wallet.slice(0, 8) + "...",
      });
      return NextResponse.json(
        { error: "Challenge expired or already used. Please request a new challenge." },
        { status: 400 }
      );
    }

    // Verify the challenge was issued for this wallet
    if (challenge.walletAddress !== wallet) {
      log("warn", "Challenge wallet mismatch", {
        requestId,
        wallet: wallet.slice(0, 8) + "...",
      });
      return NextResponse.json(
        { error: "Challenge was not issued for this wallet" },
        { status: 400 }
      );
    }

    // Verify the signature
    const isValid = verifyWalletSignature(message, signature, wallet);
    if (!isValid) {
      log("warn", "Invalid wallet signature", {
        requestId,
        wallet: wallet.slice(0, 8) + "...",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Mark the challenge as used (prevents replay)
    const marked = await markChallengeUsed(nonce);
    if (!marked) {
      // Race condition - challenge was used by another request
      log("warn", "Challenge already used (race condition)", {
        requestId,
        wallet: wallet.slice(0, 8) + "...",
      });
      return NextResponse.json(
        { error: "Challenge already used. Please request a new challenge." },
        { status: 400 }
      );
    }

    // Check if wallet is already verified
    const existing = await db
      .select()
      .from(walletVerifications)
      .where(eq(walletVerifications.walletAddress, wallet))
      .limit(1);

    const now = new Date();
    // Set expiry to 30 days from now
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    if (existing.length > 0) {
      // Update existing verification
      await db
        .update(walletVerifications)
        .set({
          signedMessage: message,
          signature,
          verifiedAt: now,
          expiresAt,
        })
        .where(eq(walletVerifications.walletAddress, wallet));
    } else {
      // Insert new verification
      await db.insert(walletVerifications).values({
        walletAddress: wallet,
        signedMessage: message,
        signature,
        verifiedAt: now,
        expiresAt,
      });
    }

    log("info", "Wallet verified successfully", {
      requestId,
      wallet: wallet.slice(0, 8) + "...",
    });

    return NextResponse.json({
      verified: true,
      wallet,
      verifiedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    log("error", "Wallet verification failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to verify wallet" },
      { status: 500 }
    );
  }
}

/**
 * GET - Check if a wallet is currently verified
 */
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    // Validate query params
    const result = querySchema.safeParse({ wallet });
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid wallet parameter" },
        { status: 400 }
      );
    }

    // Look up verification record
    const verification = await db
      .select()
      .from(walletVerifications)
      .where(eq(walletVerifications.walletAddress, result.data.wallet))
      .limit(1);

    if (verification.length === 0) {
      return NextResponse.json({
        verified: false,
        wallet: result.data.wallet,
      });
    }

    const record = verification[0];
    const now = new Date();

    // Check if verification has expired
    if (record.expiresAt && record.expiresAt < now) {
      return NextResponse.json({
        verified: false,
        wallet: result.data.wallet,
        expired: true,
        expiredAt: record.expiresAt.toISOString(),
      });
    }

    return NextResponse.json({
      verified: true,
      wallet: result.data.wallet,
      verifiedAt: record.verifiedAt.toISOString(),
      expiresAt: record.expiresAt?.toISOString() || null,
    });
  } catch (error) {
    log("error", "Wallet verification check failed", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to check verification status" },
      { status: 500 }
    );
  }
}
