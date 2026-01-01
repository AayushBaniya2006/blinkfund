/**
 * Inngest function to clean up images from expired campaigns
 * Runs daily at 3 AM to delete Vercel Blob images for ended campaigns
 */

import { inngest } from "../client";
import { db } from "@/db";
import { campaigns } from "@/db/schema/campaigns";
import { del } from "@vercel/blob";
import { lt, isNotNull, and, or, eq } from "drizzle-orm";
import { log } from "@/lib/logging";

// Only delete images from Vercel Blob (our uploads)
const VERCEL_BLOB_DOMAIN = "vercel-storage.com";

export const cleanupCampaignImages = inngest.createFunction(
  {
    id: "cleanup-campaign-images",
    name: "Cleanup Expired Campaign Images",
  },
  { cron: "0 3 * * *" }, // Daily at 3 AM
  async ({ step }) => {
    // Step 1: Find expired campaigns with Vercel Blob images
    const expiredCampaigns = await step.run(
      "find-expired-campaigns",
      async () => {
        const now = new Date();

        // Find campaigns that:
        // - Have passed their deadline
        // - Have an image URL from Vercel Blob
        // - Are completed, cancelled, or still active but expired
        const expired = await db
          .select({
            id: campaigns.id,
            imageUrl: campaigns.imageUrl,
            title: campaigns.title,
          })
          .from(campaigns)
          .where(
            and(
              lt(campaigns.deadline, now),
              isNotNull(campaigns.imageUrl),
              or(
                eq(campaigns.status, "completed"),
                eq(campaigns.status, "cancelled"),
                eq(campaigns.status, "active") // Active but deadline passed
              )
            )
          );

        // Filter to only Vercel Blob URLs
        return expired.filter(
          (c) => c.imageUrl && c.imageUrl.includes(VERCEL_BLOB_DOMAIN)
        );
      }
    );

    if (expiredCampaigns.length === 0) {
      log("info", "No expired campaign images to clean up");
      return { deletedCount: 0, timestamp: new Date().toISOString() };
    }

    // Step 2: Delete images from Vercel Blob
    const deletedCount = await step.run(
      "delete-blob-images",
      async () => {
        let deleted = 0;

        for (const campaign of expiredCampaigns) {
          if (!campaign.imageUrl) continue;

          try {
            await del(campaign.imageUrl);

            // Clear the imageUrl in the database
            await db
              .update(campaigns)
              .set({
                imageUrl: null,
                updatedAt: new Date(),
              })
              .where(eq(campaigns.id, campaign.id));

            deleted++;
            log("info", "Deleted expired campaign image", {
              campaignId: campaign.id,
            });
          } catch (error) {
            log("error", "Failed to delete campaign image", {
              campaignId: campaign.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        return deleted;
      }
    );

    log("info", "Completed campaign image cleanup", {
      foundCount: expiredCampaigns.length,
      deletedCount,
    });

    return {
      foundCount: expiredCampaigns.length,
      deletedCount,
      timestamp: new Date().toISOString(),
    };
  }
);
