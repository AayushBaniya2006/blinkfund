/**
 * Campaign Detail API
 * GET - Get campaign details
 * PATCH - Update campaign
 * DELETE - Cancel campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { walletVerifications } from "@/db/schema/wallet-verifications";
import { eq } from "drizzle-orm";
import {
  updateCampaignSchema,
  lamportsToSol,
} from "@/lib/campaigns/validation";
import {
  getCampaignById,
  getCampaignBySlug,
  getCampaignWithStats,
  updateCampaign,
  cancelCampaign,
} from "@/lib/campaigns/queries";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET - Get campaign details
 * Supports both ID and slug lookup
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Try to find by ID first, then by slug
    let campaign = await getCampaignWithStats(id);
    if (!campaign) {
      const bySlug = await getCampaignBySlug(id);
      if (bySlug) {
        campaign = await getCampaignWithStats(bySlug.id);
      }
    }

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Transform for response
    const goalLamports = BigInt(campaign.goalLamports);
    const raisedLamports = BigInt(campaign.raisedLamports);

    return NextResponse.json({
      id: campaign.id,
      slug: campaign.slug,
      title: campaign.title,
      description: campaign.description,
      imageUrl: campaign.imageUrl,
      creatorWallet: campaign.creatorWallet,
      goalSol: lamportsToSol(goalLamports),
      raisedSol: lamportsToSol(raisedLamports),
      progressPercent: campaign.progressPercent,
      donationCount: Number(campaign.donationCount),
      deadline: campaign.deadline,
      daysRemaining: campaign.daysRemaining,
      isExpired: campaign.isExpired,
      isGoalReached: campaign.isGoalReached,
      status: campaign.status,
      createdAt: campaign.createdAt,
      publishedAt: campaign.publishedAt,
      url: `/campaign/${campaign.slug}`,
    });
  } catch (error) {
    console.error("GET /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to get campaign" },
      { status: 500 },
    );
  }
}

/**
 * PATCH - Update campaign
 * Requires wallet ownership verification
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Get wallet from request (should be passed in body)
    const { wallet, ...updateData } = body;

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
        { error: "Not authorized to update this campaign" },
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

    // Validate update data
    const result = updateCampaignSchema.safeParse(updateData);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid update data", details: result.error.flatten() },
        { status: 400 },
      );
    }

    // Can only update certain fields, and only in draft/active status
    if (campaign.status === "completed" || campaign.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot update completed or cancelled campaigns" },
        { status: 400 },
      );
    }

    // Update campaign
    const updated = await updateCampaign(id, {
      title: result.data.title,
      description: result.data.description,
      imageUrl: result.data.imageUrl,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Failed to update campaign" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: updated.id,
      slug: updated.slug,
      title: updated.title,
      description: updated.description,
      imageUrl: updated.imageUrl,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error("PATCH /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Cancel campaign
 * Requires wallet ownership verification
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

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
        { error: "Not authorized to cancel this campaign" },
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

    // Can only cancel draft, active, or paused campaigns
    if (campaign.status === "completed" || campaign.status === "cancelled") {
      return NextResponse.json(
        { error: "Campaign is already completed or cancelled" },
        { status: 400 },
      );
    }

    // Cancel campaign
    const cancelled = await cancelCampaign(id);

    if (!cancelled) {
      return NextResponse.json(
        { error: "Failed to cancel campaign" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: cancelled.id,
      status: cancelled.status,
      message: "Campaign cancelled successfully",
    });
  } catch (error) {
    console.error("DELETE /api/campaigns/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to cancel campaign" },
      { status: 500 },
    );
  }
}
