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
  validateWalletAddress,
  validateAmount,
  campaignParamsSchema,
  postBodySchema,
  buildDonationTransaction,
  calculateFeeSplit,
} from "@/lib/solana";
import { getCampaignById } from "@/lib/campaigns/queries";
import { createDonation } from "@/lib/donations/queries";
import { solToLamports, lamportsToSol } from "@/lib/campaigns/validation";
import { rateLimitConfigs, getClientIp, checkRateLimit } from "@/lib/ratelimit";

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: ACTIONS_CORS_HEADERS,
  });
}

/**
 * GET handler - Returns ActionGetResponse with preset donation buttons
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);
    const campaignId = searchParams.get("campaign");

    // Campaign-based mode
    if (campaignId) {
      const campaign = await getCampaignById(campaignId);
      if (!campaign) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404, headers: ACTIONS_CORS_HEADERS },
        );
      }

      // Check campaign is active
      if (campaign.status !== "active") {
        return NextResponse.json(
          { error: "Campaign is not active" },
          { status: 400, headers: ACTIONS_CORS_HEADERS },
        );
      }

      // Check deadline
      if (new Date(campaign.deadline) <= new Date()) {
        return NextResponse.json(
          { error: "Campaign has ended" },
          { status: 400, headers: ACTIONS_CORS_HEADERS },
        );
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

      // Use dynamic OG image for better social sharing
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL || "https://blinkfund.vercel.app";
      const dynamicIcon = `${appUrl}/api/og/campaign/${campaignId}`;

      const response: ActionGetResponse = {
        type: "action",
        title: campaign.title,
        icon: dynamicIcon,
        description: `${campaign.description || "Support this campaign"}\n\n${raisedSol.toFixed(2)}/${goalSol.toFixed(2)} SOL raised (${progressPercent}%)`,
        label: "Donate",
        links: { actions },
      };

      return NextResponse.json(response, {
        headers: {
          ...ACTIONS_CORS_HEADERS,
          "Cache-Control": "public, max-age=30", // Shorter cache for campaigns
        },
      });
    }

    // Legacy URL-based mode
    const parseResult = campaignParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400, headers: ACTIONS_CORS_HEADERS },
      );
    }

    const params = parseResult.data;

    // Validate wallet if provided
    if (params.wallet) {
      const validWallet = validateWalletAddress(params.wallet);
      if (!validWallet) {
        return NextResponse.json(
          { error: 'Invalid "wallet" address' },
          { status: 400, headers: ACTIONS_CORS_HEADERS },
        );
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
      headers: {
        ...ACTIONS_CORS_HEADERS,
        "Cache-Control": "public, max-age=60", // Cache for 1 minute
      },
    });
  } catch (error) {
    console.error("GET /api/actions/donate error:", error);
    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    );
  }
}

/**
 * POST handler - Builds and returns donation transaction
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResponse = checkRateLimit(
    rateLimitConfigs.donate,
    clientIp,
    "donate",
  );
  if (rateLimitResponse) {
    // Merge CORS headers with rate limit response
    const headers = new Headers(rateLimitResponse.headers);
    Object.entries(ACTIONS_CORS_HEADERS).forEach(([key, value]) => {
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
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: ACTIONS_CORS_HEADERS },
      );
    }

    const bodyParseResult = postBodySchema.safeParse(body);
    if (!bodyParseResult.success) {
      return NextResponse.json(
        { error: 'Invalid "account" in request body' },
        { status: 400, headers: ACTIONS_CORS_HEADERS },
      );
    }

    const { account } = bodyParseResult.data;

    // Validate donor wallet
    const donorWallet = validateWalletAddress(account);
    if (!donorWallet) {
      return NextResponse.json(
        { error: 'Invalid "account" in request body' },
        { status: 400, headers: ACTIONS_CORS_HEADERS },
      );
    }

    // Validate amount
    const amountSol = validateAmount(amountParam || "");
    if (amountSol === null) {
      return NextResponse.json(
        {
          error: `Invalid "amount": must be between ${SOLANA_CONFIG.MIN_AMOUNT} and ${SOLANA_CONFIG.MAX_AMOUNT} SOL`,
        },
        { status: 400, headers: ACTIONS_CORS_HEADERS },
      );
    }

    // Campaign-based mode
    if (campaignId) {
      const campaign = await getCampaignById(campaignId);
      if (!campaign) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404, headers: ACTIONS_CORS_HEADERS },
        );
      }

      // Check campaign is active
      if (campaign.status !== "active") {
        return NextResponse.json(
          { error: "Campaign is not active" },
          { status: 400, headers: ACTIONS_CORS_HEADERS },
        );
      }

      // Check deadline
      if (new Date(campaign.deadline) <= new Date()) {
        return NextResponse.json(
          { error: "Campaign has ended" },
          { status: 400, headers: ACTIONS_CORS_HEADERS },
        );
      }

      // Calculate fees
      const fees = calculateFeeSplit(amountSol);
      const feePercent = (SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100).toFixed(0);

      // Create pending donation record
      const donation = await createDonation({
        campaignId: campaign.id,
        donorWallet: donorWallet.toBase58(),
        amountLamports: fees.totalLamports.toString(),
        platformFeeLamports: fees.platformFeeLamports.toString(),
        creatorLamports: fees.creatorLamports.toString(),
        status: "pending",
      });

      // Build transaction
      const transaction = await buildDonationTransaction({
        donor: donorWallet,
        creator: validateWalletAddress(campaign.creatorWallet)!,
        amountSol,
      });

      // Log for debugging
      console.log(
        `[Donate] campaign=${campaignId} donation=${donation.id} amount=${amountSol} cluster=${SOLANA_CONFIG.CLUSTER}`,
      );

      // Create response with donation ID in message for tracking
      const response = await createPostResponse({
        fields: {
          type: "transaction",
          transaction,
          message: `Donating ${amountSol} SOL to "${campaign.title}" (${feePercent}% platform fee)`,
        },
      });

      return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
    }

    // Legacy URL-based mode
    const parseResult = campaignParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400, headers: ACTIONS_CORS_HEADERS },
      );
    }

    const params = parseResult.data;

    // Wallet is required for legacy mode
    if (!params.wallet) {
      return NextResponse.json(
        { error: 'Missing required "wallet" parameter' },
        { status: 400, headers: ACTIONS_CORS_HEADERS },
      );
    }

    // Validate creator wallet
    const creatorWallet = validateWalletAddress(params.wallet);
    if (!creatorWallet) {
      return NextResponse.json(
        { error: 'Invalid "wallet" address' },
        { status: 400, headers: ACTIONS_CORS_HEADERS },
      );
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

    // Log for debugging (no PII)
    console.log(
      `[Donate] legacy mode cluster=${SOLANA_CONFIG.CLUSTER} amount=${amountSol} fee=${feePercent}%`,
    );

    // Create response with transaction and message
    const response = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Donating ${amountSol} SOL to ${campaignTitle} (${feePercent}% platform fee)`,
      },
    });

    return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
  } catch (error) {
    console.error("POST /api/actions/donate error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("too small")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400, headers: ACTIONS_CORS_HEADERS },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500, headers: ACTIONS_CORS_HEADERS },
    );
  }
}
