/**
 * Campaign Donations API
 * GET - Get donation history for a campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { donations } from "@/db/schema/donations";
import { eq, desc, and, count } from "drizzle-orm";
import { z } from "zod";
import { getCampaignById, getCampaignBySlug } from "@/lib/campaigns/queries";
import { lamportsToSol } from "@/lib/campaigns/validation";

type RouteParams = { params: Promise<{ id: string }> };

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET - Get donation history for a campaign
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);

    // Validate query params
    const queryResult = querySchema.safeParse(rawParams);
    if (!queryResult.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 },
      );
    }

    const { limit, offset } = queryResult.data;

    // Find campaign by ID or slug
    let campaign = await getCampaignById(id);
    if (!campaign) {
      campaign = await getCampaignBySlug(id);
    }

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    // Get donations (only confirmed ones for public view)
    const [donationList, countResult] = await Promise.all([
      db
        .select()
        .from(donations)
        .where(
          and(
            eq(donations.campaignId, campaign.id),
            eq(donations.status, "confirmed"),
          ),
        )
        .orderBy(desc(donations.confirmedAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(donations)
        .where(
          and(
            eq(donations.campaignId, campaign.id),
            eq(donations.status, "confirmed"),
          ),
        ),
    ]);

    // Transform donations for response
    const transformedDonations = donationList.map((donation) => {
      const amountLamports = BigInt(donation.amountLamports);

      // Truncate wallet address for privacy
      const donorWallet = donation.donorWallet;
      const truncatedWallet = `${donorWallet.slice(0, 4)}...${donorWallet.slice(-4)}`;

      return {
        id: donation.id,
        donorWallet: truncatedWallet,
        fullWallet: donorWallet, // Full address for verification
        amountSol: lamportsToSol(amountLamports),
        txSignature: donation.txSignature,
        confirmedAt: donation.confirmedAt,
      };
    });

    return NextResponse.json({
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      donations: transformedDonations,
      total: countResult[0]?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("GET /api/campaigns/[id]/donations error:", error);
    return NextResponse.json(
      { error: "Failed to get donations" },
      { status: 500 },
    );
  }
}
