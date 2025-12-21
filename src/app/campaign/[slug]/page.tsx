import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  getCampaignBySlug,
  getCampaignWithStats,
} from "@/lib/campaigns/queries";
import { getDonationsByCampaign } from "@/lib/donations/queries";
import { lamportsToSol } from "@/lib/campaigns/validation";
import { appConfig } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignPageClient } from "./client";
import { Target, ExternalLink, ArrowLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://blinkfund.vercel.app";

  if (!campaign) {
    return {
      title: "Campaign Not Found",
      robots: { index: false, follow: false },
    };
  }

  const goalSol = lamportsToSol(BigInt(campaign.goalLamports));
  const raisedSol = lamportsToSol(BigInt(campaign.raisedLamports));
  const progressPercent =
    goalSol > 0 ? Math.min(100, Math.round((raisedSol / goalSol) * 100)) : 0;

  const title = campaign.title;
  const description =
    campaign.description ||
    `Support "${campaign.title}" on BlinkFund. Goal: ${goalSol} SOL | Raised: ${raisedSol} SOL (${progressPercent}%). Donate with Solana Blinks.`;

  // Use dynamic OG image that shows campaign details
  const dynamicOgImage = `${baseUrl}/api/og/campaign/${campaign.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/campaign/${slug}`,
    },
    openGraph: {
      type: "website",
      title: `${title} - Crowdfunding on BlinkFund`,
      description,
      url: `${baseUrl}/campaign/${slug}`,
      siteName: appConfig.projectName,
      images: [
        {
          url: dynamicOgImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - Crowdfunding on BlinkFund`,
      description,
      images: [dynamicOgImage],
      site: "@FundOnBlink",
    },
    robots: {
      index: campaign.status === "active",
      follow: true,
    },
  };
}

export default async function CampaignPage({ params }: PageProps) {
  const { slug } = await params;
  const campaign = await getCampaignWithStats(slug);

  if (!campaign) {
    // Try to find by slug directly
    const bySlug = await getCampaignBySlug(slug);
    if (!bySlug) {
      notFound();
    }
    // If found by slug, get the full stats
    const fullCampaign = await getCampaignWithStats(bySlug.id);
    if (!fullCampaign) {
      notFound();
    }
    return renderCampaign(fullCampaign);
  }

  return renderCampaign(campaign);
}

async function renderCampaign(
  campaign: NonNullable<Awaited<ReturnType<typeof getCampaignWithStats>>>,
) {
  const goalSol = lamportsToSol(BigInt(campaign.goalLamports));
  const raisedSol = lamportsToSol(BigInt(campaign.raisedLamports));

  // Get recent donations
  const { donations } = await getDonationsByCampaign(campaign.id, {
    limit: 10,
  });
  const transformedDonations = donations
    .filter((d) => d.txSignature !== null)
    .map((d) => ({
      id: d.id,
      donorWallet: d.donorWallet,
      amountSol: lamportsToSol(BigInt(d.amountLamports)),
      txSignature: d.txSignature!,
      confirmedAt: d.confirmedAt,
    }));

  // Build URLs
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    `https://${appConfig.projectSlug}.vercel.app`;
  const campaignUrl = `${baseUrl}/campaign/${campaign.slug}`;
  const blinkUrl = `${baseUrl}/api/actions/donate?campaign=${campaign.id}`;

  // Status badge
  const statusConfig: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
    }
  > = {
    draft: { label: "Draft", variant: "secondary" },
    active: { label: "Active", variant: "default" },
    paused: { label: "Paused", variant: "outline" },
    completed: { label: "Completed", variant: "default" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  };
  const status = statusConfig[campaign.status] || statusConfig.draft;

  const canDonate = campaign.status === "active" && !campaign.isExpired;

  // Structured data for the campaign (DonateAction schema)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "DonateAction",
    name: campaign.title,
    description:
      campaign.description || `Support ${campaign.title} on BlinkFund`,
    url: campaignUrl,
    recipient: {
      "@type": "Organization",
      name: campaign.title,
      url: campaignUrl,
    },
    potentialAction: {
      "@type": "DonateAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: blinkUrl,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
    },
    // FundraiserEvent for campaign details
    mainEntity: {
      "@type": "MonetaryAmountDistribution",
      name: campaign.title,
      description: campaign.description,
      grantee: {
        "@type": "Person",
        identifier: campaign.creatorWallet,
      },
    },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Campaign Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Link>

        {/* Campaign header */}
        <div className="space-y-6">
          {/* Image */}
          <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
            {campaign.imageUrl ? (
              <Image
                src={campaign.imageUrl}
                alt={campaign.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="h-20 w-20 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Title and status */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold">{campaign.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>

          {/* Creator wallet */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Created by</span>
            <code className="bg-muted px-2 py-0.5 rounded text-xs">
              {campaign.creatorWallet.slice(0, 4)}...
              {campaign.creatorWallet.slice(-4)}
            </code>
            <a
              href={`https://explorer.solana.com/address/${campaign.creatorWallet}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Client-side interactive components */}
          <CampaignPageClient
            campaign={{
              id: campaign.id,
              slug: campaign.slug,
              title: campaign.title,
              description: campaign.description,
              goalSol,
              raisedSol,
              progressPercent: campaign.progressPercent,
              deadline: campaign.deadline.toISOString(),
              isExpired: campaign.isExpired,
              isGoalReached: campaign.isGoalReached,
              donationCount: Number(campaign.donationCount),
            }}
            donations={transformedDonations}
            campaignUrl={campaignUrl}
            blinkUrl={blinkUrl}
            canDonate={canDonate}
          />
        </div>
      </div>
    </div>
  );
}
