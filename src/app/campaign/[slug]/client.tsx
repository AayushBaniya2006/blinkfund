"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ProgressBar,
  DeadlineCountdown,
  DonationList,
  ShareButtons,
} from "@/components/campaigns";
import { Zap } from "lucide-react";

interface CampaignData {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  goalSol: number;
  raisedSol: number;
  progressPercent: number;
  deadline: string;
  isExpired: boolean;
  isGoalReached: boolean;
  donationCount: number;
}

interface Donation {
  id: string;
  donorWallet: string;
  amountSol: number;
  txSignature: string;
  confirmedAt: string | Date | null;
}

interface CampaignPageClientProps {
  campaign: CampaignData;
  donations: Donation[];
  campaignUrl: string;
  blinkUrl: string;
  canDonate: boolean;
}

export function CampaignPageClient({
  campaign,
  donations,
  campaignUrl,
  blinkUrl,
  canDonate,
}: CampaignPageClientProps) {
  const dialToUrl = `https://dial.to/?action=solana-action:${encodeURIComponent(blinkUrl)}`;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Main content - left column */}
      <div className="md:col-span-2 space-y-6">
        {/* Description */}
        {campaign.description && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold mb-3">About this campaign</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {campaign.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Donations */}
        <Card>
          <CardContent className="pt-6">
            <DonationList donations={donations} />
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - right column */}
      <div className="space-y-4">
        {/* Progress card */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <ProgressBar raised={campaign.raisedSol} goal={campaign.goalSol} />

            <Separator />

            <DeadlineCountdown deadline={campaign.deadline} />

            <Separator />

            <div className="text-center text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {campaign.donationCount}
              </span>{" "}
              {campaign.donationCount === 1 ? "donation" : "donations"}
            </div>
          </CardContent>
        </Card>

        {/* Donate button */}
        {canDonate && (
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button asChild className="w-full gap-2" size="lg">
                <a href={dialToUrl} target="_blank" rel="noopener noreferrer">
                  <Zap className="h-4 w-4" />
                  Donate with Blink
                </a>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Opens in Dialect to complete your donation
              </p>
            </CardContent>
          </Card>
        )}

        {/* Campaign ended message */}
        {!canDonate && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {campaign.isExpired
                  ? "This campaign has ended."
                  : campaign.isGoalReached
                    ? "Goal reached! Thank you to all supporters."
                    : "This campaign is not currently accepting donations."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Share buttons */}
        <Card>
          <CardContent className="pt-6">
            <ShareButtons
              campaignTitle={campaign.title}
              campaignUrl={campaignUrl}
              blinkUrl={blinkUrl}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
