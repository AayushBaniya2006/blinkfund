import { MetadataRoute } from "next";
import { db } from "@/db";
import { campaigns } from "@/db/schema/campaigns";
import { eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://blinkfund.vercel.app";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/create`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/donate`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Dynamic campaign pages - fetch all active campaigns
  let campaignPages: MetadataRoute.Sitemap = [];

  try {
    const activeCampaigns = await db
      .select({
        slug: campaigns.slug,
        updatedAt: campaigns.updatedAt,
      })
      .from(campaigns)
      .where(eq(campaigns.status, "active"));

    campaignPages = activeCampaigns.map((campaign) => ({
      url: `${baseUrl}/campaign/${campaign.slug}`,
      lastModified: campaign.updatedAt || new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch (error) {
    // If database is not available, return only static pages
    console.error("Sitemap: Failed to fetch campaigns", error);
  }

  return [...staticPages, ...campaignPages];
}
