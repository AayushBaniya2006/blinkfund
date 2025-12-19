/**
 * Creator Campaigns API
 * GET - List all campaigns for a creator
 */

import { NextRequest, NextResponse } from "next/server";
import { validateWalletAddress } from "@/lib/solana/validation";
import { getCampaignsByWallet } from "@/lib/campaigns/queries";
import { lamportsToSol } from "@/lib/campaigns/validation";

/**
 * GET - Get all campaigns for a creator wallet
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 },
      );
    }

    // Validate wallet
    const validWallet = validateWalletAddress(wallet);
    if (!validWallet) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 },
      );
    }

    // Get all campaigns for this wallet
    const campaigns = await getCampaignsByWallet(wallet);

    // Calculate stats
    let totalRaisedLamports = BigInt(0);
    let totalDonations = 0;
    let activeCampaigns = 0;

    const transformedCampaigns = campaigns.map((campaign) => {
      const goalLamports = BigInt(campaign.goalLamports);
      const raisedLamports = BigInt(campaign.raisedLamports);
      const goalSol = lamportsToSol(goalLamports);
      const raisedSol = lamportsToSol(raisedLamports);
      const progressPercent =
        goalSol > 0
          ? Math.min(100, Math.round((raisedSol / goalSol) * 100))
          : 0;

      // Accumulate stats
      totalRaisedLamports += raisedLamports;
      totalDonations += Number(campaign.donationCount);
      if (campaign.status === "active") {
        activeCampaigns++;
      }

      // Calculate days remaining
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
        status: campaign.status,
        goalSol,
        raisedSol,
        progressPercent,
        donationCount: Number(campaign.donationCount),
        daysRemaining,
        deadline: campaign.deadline,
        createdAt: campaign.createdAt,
        publishedAt: campaign.publishedAt,
      };
    });

    return NextResponse.json({
      campaigns: transformedCampaigns,
      stats: {
        totalCampaigns: campaigns.length,
        activeCampaigns,
        totalRaisedSol: lamportsToSol(totalRaisedLamports),
        totalDonations,
      },
    });
  } catch (error) {
    console.error("GET /api/creator/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to load campaigns" },
      { status: 500 },
    );
  }
}
