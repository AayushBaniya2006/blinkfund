/**
 * Campaign Resume API
 * POST - Resume a paused campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { walletVerifications } from "@/db/schema/wallet-verifications";
import { eq } from "drizzle-orm";
import { getCampaignById, resumeCampaign } from "@/lib/campaigns/queries";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST - Resume campaign
 * Changes status from paused to active
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
        { error: "Not authorized to resume this campaign" },
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

    // Check campaign is paused
    if (campaign.status !== "paused") {
      return NextResponse.json(
        { error: `Cannot resume campaign with status: ${campaign.status}` },
        { status: 400 },
      );
    }

    // Check deadline hasn't passed
    if (new Date(campaign.deadline) <= new Date()) {
      return NextResponse.json(
        { error: "Cannot resume campaign with past deadline" },
        { status: 400 },
      );
    }

    // Resume campaign
    const resumed = await resumeCampaign(id);

    if (!resumed) {
      return NextResponse.json(
        { error: "Failed to resume campaign" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: resumed.id,
      status: resumed.status,
      message: "Campaign resumed successfully",
    });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/resume error:", error);
    return NextResponse.json(
      { error: "Failed to resume campaign" },
      { status: 500 },
    );
  }
}
