/**
 * Campaigns API
 * POST - Create a new campaign
 * GET - List campaigns
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { walletVerifications } from "@/db/schema/wallet-verifications";
import { eq } from "drizzle-orm";
import { validateWalletAddress } from "@/lib/solana/validation";
import {
  createCampaignSchema,
  campaignQuerySchema,
  generateSlug,
  solToLamports,
  lamportsToSol,
} from "@/lib/campaigns/validation";
import {
  createCampaign,
  listCampaigns,
  isSlugAvailable,
} from "@/lib/campaigns/queries";

/**
 * POST - Create a new campaign
 * Requires verified wallet ownership
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const result = createCampaignSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request", details: result.error.flatten() },
        { status: 400 },
      );
    }

    const { wallet, title, description, imageUrl, goalSol, deadline } =
      result.data;

    // Validate wallet address
    const validWallet = validateWalletAddress(wallet);
    if (!validWallet) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address" },
        { status: 400 },
      );
    }

    // Check if wallet is verified
    const [verification] = await db
      .select()
      .from(walletVerifications)
      .where(eq(walletVerifications.walletAddress, wallet))
      .limit(1);

    if (!verification) {
      return NextResponse.json(
        { error: "Wallet not verified. Please verify wallet ownership first." },
        { status: 401 },
      );
    }

    // Check if verification has expired
    if (verification.expiresAt && verification.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Wallet verification expired. Please re-verify." },
        { status: 401 },
      );
    }

    // Validate deadline is in the future
    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      return NextResponse.json(
        { error: "Deadline must be in the future" },
        { status: 400 },
      );
    }

    // Generate unique slug
    let slug = generateSlug(title);
    let attempts = 0;
    while (!(await isSlugAvailable(slug)) && attempts < 5) {
      slug = generateSlug(title);
      attempts++;
    }

    if (attempts >= 5) {
      return NextResponse.json(
        { error: "Failed to generate unique campaign URL. Please try again." },
        { status: 500 },
      );
    }

    // Convert goal to lamports
    const goalLamports = solToLamports(goalSol);

    // Create campaign
    const campaign = await createCampaign({
      slug,
      creatorWallet: wallet,
      title,
      description: description || null,
      imageUrl: imageUrl || null,
      goalLamports: goalLamports.toString(),
      deadline: deadlineDate,
      status: "draft",
    });

    return NextResponse.json(
      {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        status: campaign.status,
        goalSol,
        deadline: campaign.deadline,
        createdAt: campaign.createdAt,
        url: `/campaign/${campaign.slug}`,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 },
    );
  }
}

/**
 * GET - List campaigns
 * Supports filtering by status and wallet
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);

    // Validate query params
    const result = campaignQuerySchema.safeParse(rawParams);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: result.error.flatten() },
        { status: 400 },
      );
    }

    // For public listing, only show active campaigns by default
    const query = {
      ...result.data,
      status: result.data.status || "active",
    };

    const { campaigns, total } = await listCampaigns(query);

    // Transform campaigns for response
    const transformedCampaigns = campaigns.map((campaign) => {
      const goalLamports = BigInt(campaign.goalLamports);
      const raisedLamports = BigInt(campaign.raisedLamports);
      const progressPercent =
        goalLamports > BigInt(0)
          ? Math.min(100, Number((raisedLamports * BigInt(100)) / goalLamports))
          : 0;

      const deadline = new Date(campaign.deadline);
      const timeRemaining = deadline.getTime() - Date.now();
      const daysRemaining = Math.max(
        0,
        Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)),
      );

      return {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        description: campaign.description,
        imageUrl: campaign.imageUrl,
        creatorWallet: campaign.creatorWallet,
        goalSol: lamportsToSol(goalLamports),
        raisedSol: lamportsToSol(raisedLamports),
        progressPercent,
        donationCount: Number(campaign.donationCount),
        deadline: campaign.deadline,
        daysRemaining,
        status: campaign.status,
        createdAt: campaign.createdAt,
        url: `/campaign/${campaign.slug}`,
      };
    });

    return NextResponse.json({
      campaigns: transformedCampaigns,
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to list campaigns" },
      { status: 500 },
    );
  }
}
