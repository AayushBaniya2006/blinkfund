/**
 * Solana Actions API Route for Donations
 * GET - Returns ActionGetResponse with preset donation buttons
 * POST - Builds and returns donation transaction
 * OPTIONS - CORS preflight handler
 *
 * Supports two modes:
 * 1. Legacy URL-based: ?wallet=<address>&title=... (stateless tip jar)
 * 2. Campaign-based: ?campaign=<id> (persistent crowdfunding)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ActionGetResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import {
  SOLANA_CONFIG,
  BLOCKCHAIN_IDS,
  ACTION_VERSION,
  validateWalletAddress,
  validateAmount,
  campaignParamsSchema,
  postBodySchema,
  buildDonationTransaction,
  calculateFeeSplit,
  actionErrorResponse,
  actionNotFound,
  actionBadRequest,
  actionServerError,
} from "@/lib/solana";

import { getCampaignById } from "@/lib/campaigns/queries";

import {
  createDonationWithIdempotency,
  generateIdempotencyKey,
} from "@/lib/donations/queries";
import { lamportsToSol } from "@/lib/campaigns/validation";
import { rateLimitConfigs, getClientIp, checkRateLimit } from "@/lib/ratelimit";
import { log, generateRequestId, logDonation } from "@/lib/logging";

/**
 * Get headers for Solana Actions responses
 * Includes required X-Action-Version and X-Blockchain-Ids headers
 */
function getActionHeaders(
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  return {
    ...ACTIONS_CORS_HEADERS,
    "X-Action-Version": ACTION_VERSION,
    "X-Blockchain-Ids": BLOCKCHAIN_IDS[SOLANA_CONFIG.CLUSTER],
    ...extraHeaders,
  };
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: getActionHeaders(),
  });
}

/**
 * GET handler - Returns ActionGetResponse with preset donation buttons
 */
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);
    const campaignId = searchParams.get("campaign");

    // Campaign-based mode
    if (campaignId) {
      const campaign = await getCampaignById(campaignId);
      if (!campaign) {
        log("warn", "Campaign not found for GET", { requestId, campaignId });
        return actionNotFound("Campaign not found");
      }

      // Check campaign is active
      if (campaign.status !== "active") {
        log("info", "Campaign not active", {
          requestId,
          campaignId,
          status: campaign.status,
        });
        return actionBadRequest("Campaign is not active");
      }

      // Check deadline
      if (new Date(campaign.deadline) <= new Date()) {
        log("info", "Campaign has ended", { requestId, campaignId });
        return actionBadRequest("Campaign has ended");
      }

      const goalSol = lamportsToSol(BigInt(campaign.goalLamports));
      const raisedSol = lamportsToSol(BigInt(campaign.raisedLamports));
      const progressPercent =
        goalSol > 0
          ? Math.min(100, Math.round((raisedSol / goalSol) * 100))
          : 0;

      // Build base URL for action links
      const baseUrl = new URL(req.url);
      baseUrl.search = "";

      // Generate action links for preset amounts
      const actions = SOLANA_CONFIG.AMOUNT_PRESETS.map((amount) => {
        const actionUrl = new URL(baseUrl);
        actionUrl.searchParams.set("campaign", campaignId);
        actionUrl.searchParams.set("amount", amount.toString());

        return {
          label: `${amount} SOL`,
          href: actionUrl.toString(),
          type: "post" as const,
        };
      });

      // Use campaign's uploaded image if available, otherwise fall back to dynamic OG image
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://blinkfund.vercel.app";
      const dynamicIcon =
        campaign.imageUrl || `${appUrl}/api/og/campaign/${campaignId}`;

      const response: ActionGetResponse = {
        type: "action",
        title: campaign.title,
        icon: dynamicIcon,
        description: `${campaign.description || "Support this campaign"}\n\n${raisedSol.toFixed(2)}/${goalSol.toFixed(2)} SOL raised (${progressPercent}%)`,
        label: "Donate",
        links: { actions },
      };

      log("info", "GET campaign action metadata", {
        requestId,
        campaignId,
        progressPercent,
      });

      return NextResponse.json(response, {
        headers: getActionHeaders({ "Cache-Control": "public, max-age=30" }),
      });
    }

    // Legacy URL-based mode
    const parseResult = campaignParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return actionBadRequest("Invalid request parameters");
    }

    const params = parseResult.data;

    // Validate wallet if provided
    if (params.wallet) {
      const validWallet = validateWalletAddress(params.wallet);
      if (!validWallet) {
        return actionBadRequest('Invalid "wallet" address');
      }
    }

    // Use defaults for missing metadata
    const title = params.title || SOLANA_CONFIG.DEFAULT_TITLE;
    const description = params.desc || SOLANA_CONFIG.DEFAULT_DESCRIPTION;
    const image = params.image || SOLANA_CONFIG.DEFAULT_IMAGE;

    // Build base URL for action links
    const baseUrl = new URL(req.url);
    baseUrl.search = ""; // Clear existing params

    // Generate action links for preset amounts
    const actions = SOLANA_CONFIG.AMOUNT_PRESETS.map((amount) => {
      const actionUrl = new URL(baseUrl);
      if (params.wallet) actionUrl.searchParams.set("wallet", params.wallet);
      if (params.title) actionUrl.searchParams.set("title", params.title);
      if (params.desc) actionUrl.searchParams.set("desc", params.desc);
      if (params.image) actionUrl.searchParams.set("image", params.image);
      actionUrl.searchParams.set("amount", amount.toString());

      return {
        label: `Donate ${amount} SOL`,
        href: actionUrl.toString(),
        type: "post" as const,
      };
    });

    const response: ActionGetResponse = {
      type: "action",
      title,
      icon: image,
      description,
      label: "Donate",
      links: { actions },
    };

    return NextResponse.json(response, {
      headers: getActionHeaders({ "Cache-Control": "public, max-age=60" }),
    });
  } catch (error) {
    log("error", "GET /api/actions/donate error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return actionBadRequest("Invalid request parameters");
  }
}

/**
 * POST handler - Builds and returns donation transaction
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResponse = await checkRateLimit(
    rateLimitConfigs.donate,
    clientIp,
    "donate",
  );
  if (rateLimitResponse) {
    log("warn", "Rate limit exceeded for donation", {
      requestId,
      ip: clientIp,
    });
    // Merge CORS headers with rate limit response
    const headers = new Headers(rateLimitResponse.headers);
    Object.entries(getActionHeaders()).forEach(([key, value]) => {
      headers.set(key, value);
    });
    return new NextResponse(rateLimitResponse.body, {
      status: 429,
      headers,
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);
    const campaignId = searchParams.get("campaign");
    const amountParam = searchParams.get("amount");

    // Parse request body for donor account
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return actionBadRequest("Invalid JSON body");
    }

    const bodyParseResult = postBodySchema.safeParse(body);
    if (!bodyParseResult.success) {
      return actionBadRequest('Invalid "account" in request body');
    }

    const { account } = bodyParseResult.data;

    // Validate donor wallet
    const donorWallet = validateWalletAddress(account);
    if (!donorWallet) {
      return actionBadRequest('Invalid "account" in request body');
    }

    // Validate amount
    const amountSol = validateAmount(amountParam || "");
    if (amountSol === null) {
      return actionBadRequest(
        `Invalid "amount": must be between ${SOLANA_CONFIG.MIN_AMOUNT} and ${SOLANA_CONFIG.MAX_AMOUNT} SOL`,
      );
    }

    // Campaign-based mode
    if (campaignId) {
      const campaign = await getCampaignById(campaignId);
      if (!campaign) {
        log("warn", "Campaign not found for POST", { requestId, campaignId });
        return actionNotFound("Campaign not found");
      }

      // Check campaign is active
      if (campaign.status !== "active") {
        log("info", "Attempted donation to inactive campaign", {
          requestId,
          campaignId,
          status: campaign.status,
        });
        return actionBadRequest("Campaign is not active");
      }

      // Check deadline
      if (new Date(campaign.deadline) <= new Date()) {
        log("info", "Attempted donation to ended campaign", {
          requestId,
          campaignId,
        });
        return actionBadRequest("Campaign has ended");
      }

      // Calculate fees
      const fees = calculateFeeSplit(amountSol);
      const feePercent = (SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100).toFixed(0);

      // Generate idempotency key
      const idempotencyKey = generateIdempotencyKey(
        campaign.id,
        donorWallet.toBase58(),
        fees.totalLamports.toString(),
      );

      // Create pending donation record with idempotency
      const { donation, isNew } = await createDonationWithIdempotency({
        campaignId: campaign.id,
        donorWallet: donorWallet.toBase58(),
        amountLamports: fees.totalLamports.toString(),
        platformFeeLamports: fees.platformFeeLamports.toString(),
        creatorLamports: fees.creatorLamports.toString(),
        status: "pending",
        idempotencyKey,
      });

      if (!isNew) {
        log("info", "Returning existing donation (idempotency hit)", {
          requestId,
          donationId: donation.id,
          campaignId,
        });
      }

      // Build transaction
      const creatorWallet = validateWalletAddress(campaign.creatorWallet);
      if (!creatorWallet) {
        log("error", "Invalid creator wallet in campaign", {
          requestId,
          campaignId,
        });
        return actionServerError("Campaign configuration error");
      }

      const transaction = await buildDonationTransaction({
        donor: donorWallet,
        creator: creatorWallet,
        amountSol,
      });

      const durationMs = Date.now() - startTime;
      logDonation("created", {
        requestId,
        donationId: donation.id,
        campaignId,
        donorWallet: donorWallet.toBase58().slice(0, 8) + "...",
        amount: amountSol,
        cluster: SOLANA_CONFIG.CLUSTER,
        durationMs,
      });

      // Create response with donation ID in message for tracking
      const response = await createPostResponse({
        fields: {
          type: "transaction",
          transaction,
          message: `Donating ${amountSol} SOL to "${campaign.title}" (${feePercent}% platform fee)`,
        },
      });

      return NextResponse.json(response, { headers: getActionHeaders() });
    }

    // Legacy URL-based mode
    const parseResult = campaignParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return actionBadRequest("Invalid request parameters");
    }

    const params = parseResult.data;

    // Wallet is required for legacy mode
    if (!params.wallet) {
      return actionBadRequest('Missing required "wallet" parameter');
    }

    // Validate creator wallet
    const creatorWallet = validateWalletAddress(params.wallet);
    if (!creatorWallet) {
      return actionBadRequest('Invalid "wallet" address');
    }

    // Build transaction
    const transaction = await buildDonationTransaction({
      donor: donorWallet,
      creator: creatorWallet,
      amountSol,
    });

    // Calculate fees for message
    const fees = calculateFeeSplit(amountSol);
    const feePercent = (SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100).toFixed(0);
    const campaignTitle = params.title || "this project";

    const durationMs = Date.now() - startTime;
    log("info", "Legacy donation transaction built", {
      requestId,
      cluster: SOLANA_CONFIG.CLUSTER,
      amount: amountSol,
      durationMs,
    });

    // Create response with transaction and message
    const response = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Donating ${amountSol} SOL to ${campaignTitle} (${feePercent}% platform fee)`,
      },
    });

    return NextResponse.json(response, { headers: getActionHeaders() });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log("error", "POST /api/actions/donate error", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      durationMs,
    });

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("too small")) {
        return actionBadRequest(error.message);
      }
      if (error.message.includes("CRITICAL")) {
        // Platform configuration error - don't expose details
        return actionServerError("Service temporarily unavailable");
      }
    }

    return actionServerError("Failed to create transaction");
  }
}
