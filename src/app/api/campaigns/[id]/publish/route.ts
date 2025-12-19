/**
 * Campaign Publish API
 * POST - Publish a draft campaign (make it active)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { walletVerifications } from "@/db/schema/wallet-verifications";
import { eq } from "drizzle-orm";
import { getCampaignById, publishCampaign } from "@/lib/campaigns/queries";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST - Publish campaign
 * Changes status from draft to active
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
        { error: "Not authorized to publish this campaign" },
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

    // Check campaign is in draft status
    if (campaign.status !== "draft") {
      return NextResponse.json(
        { error: `Cannot publish campaign with status: ${campaign.status}` },
        { status: 400 },
      );
    }

    // Check deadline is still in the future
    if (new Date(campaign.deadline) <= new Date()) {
      return NextResponse.json(
        { error: "Cannot publish campaign with past deadline" },
        { status: 400 },
      );
    }

    // Publish campaign
    const published = await publishCampaign(id);

    if (!published) {
      return NextResponse.json(
        { error: "Failed to publish campaign" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: published.id,
      slug: published.slug,
      status: published.status,
      publishedAt: published.publishedAt,
      message: "Campaign published successfully",
      url: `/campaign/${published.slug}`,
    });
  } catch (error) {
    console.error("POST /api/campaigns/[id]/publish error:", error);
    return NextResponse.json(
      { error: "Failed to publish campaign" },
      { status: 500 },
    );
  }
}
