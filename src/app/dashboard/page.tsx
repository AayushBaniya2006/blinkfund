"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignStats } from "@/components/dashboard";
import { Plus, ExternalLink, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  slug: string;
  title: string;
  status: string;
  goalSol: number;
  raisedSol: number;
  progressPercent: number;
  donationCount: number;
  daysRemaining: number;
  createdAt: string;
}

interface DashboardData {
  campaigns: Campaign[];
  stats: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalRaisedSol: number;
    totalDonations: number;
  };
}

export default function DashboardPage() {
  const { publicKey, connected } = useWallet();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/creator/campaigns?wallet=${publicKey.toBase58()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load campaigns");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchDashboardData();
    }
  }, [connected, publicKey, fetchDashboardData]);

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-6xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-muted-foreground">
              Connect your wallet to view and manage your campaigns
            </p>
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Creator Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your crowdfunding campaigns
            </p>
          </div>
          <Button asChild>
            <Link href="/create">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={fetchDashboardData}>Retry</Button>
            </CardContent>
          </Card>
        ) : data ? (
          <div className="space-y-8">
            {/* Stats */}
            <CampaignStats
              totalCampaigns={data.stats.totalCampaigns}
              activeCampaigns={data.stats.activeCampaigns}
              totalRaisedSol={data.stats.totalRaisedSol}
              totalDonations={data.stats.totalDonations}
            />

            {/* Campaigns list */}
            <Card>
              <CardHeader>
                <CardTitle>Your Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                {data.campaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      You haven&apos;t created any campaigns yet
                    </p>
                    <Button asChild>
                      <Link href="/create">Create Your First Campaign</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.campaigns.map((campaign) => (
                      <CampaignRow key={campaign.id} campaign={campaign} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
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

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{campaign.title}</h3>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            {campaign.raisedSol.toFixed(2)} / {campaign.goalSol.toFixed(2)} SOL
          </span>
          <span>{campaign.progressPercent}%</span>
          <span>{campaign.donationCount} donations</span>
          {campaign.status === "active" && (
            <span>{campaign.daysRemaining} days left</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/campaign/${campaign.slug}`}>
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/campaigns/${campaign.id}`}>
            <Settings className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
