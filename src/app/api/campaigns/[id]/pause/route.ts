/**
 * Campaign Pause API
 * POST - Pause an active campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { walletVerifications } from "@/db/schema/wallet-verifications";
import { eq } from "drizzle-orm";
import { getCampaignById, pauseCampaign } from "@/lib/campaigns/queries";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST - Pause campaign
 * Changes status from active to paused
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { wallet } = body;

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 },
      );
    }

    // Find campaign
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (campaign.creatorWallet !== wallet) {
      return NextResponse.json(
        { error: "Not authorized to pause this campaign" },
        { status: 403 },
      );
    }

    // Check wallet verification
    const [verification] = await db
      .select()
      .from(walletVerifications)
      .where(eq(walletVerifications.walletAddress, wallet))
      .limit(1);

    if (
      !verification ||
      (verification.expiresAt && verification.expiresAt < new Date())
    ) {
      return NextResponse.json(
        { error: "Wallet verification required" },
        { status: 401 },
      );
    }

    // Check campaign is active
    if (campaign.status !== "active") {
      return NextResponse.json(
        { error: `Cannot pause campaign with status: ${campaign.status}` },
        { status: 400 },
      );
    }

    // Pause campaign
    const paused = await pauseCampaign(id);

    if (!paused) {
      return NextResponse.json(
        { error: "Failed to pause campaign" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: paused.id,
      status: paused.status,
      message: "Campaign paused successfully",
    });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/pause error:", error);
    return NextResponse.json(
      { error: "Failed to pause campaign" },
      { status: 500 },
    );
  }
}
