"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DonationTable } from "@/components/dashboard";
import { ProgressBar, ShareButtons } from "@/components/campaigns";
import {
  ArrowLeft,
  Loader2,
  Play,
  Pause,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  status: string;
  goalSol: number;
  raisedSol: number;
  progressPercent: number;
  donationCount: number;
  daysRemaining: number;
  deadline: string;
  createdAt: string;
  publishedAt: string | null;
}

interface Donation {
  id: string;
  donorWallet: string;
  amountSol: number;
  status: string;
  txSignature: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export default function CampaignManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { publicKey, connected } = useWallet();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      fetchCampaignData();
    }
  }, [connected, publicKey, id]);

  const fetchCampaignData = async () => {
    setLoading(true);
    try {
      // Fetch campaign details
      const campaignRes = await fetch(`/api/campaigns/${id}`);
      if (!campaignRes.ok) {
        throw new Error("Campaign not found");
      }
      const campaignData = await campaignRes.json();

      // Verify ownership
      if (campaignData.creatorWallet !== publicKey?.toBase58()) {
        toast.error("You don't have access to this campaign");
        router.push("/dashboard");
        return;
      }

      setCampaign(campaignData);

      // Fetch donations
      const donationsRes = await fetch(`/api/campaigns/${id}/donations`);
      if (donationsRes.ok) {
        const donationsData = await donationsRes.json();
        setDonations(donationsData.donations || []);
      }
    } catch (err) {
      toast.error("Failed to load campaign");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!publicKey) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to publish");
      }

      toast.success("Campaign published!");
      fetchCampaignData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!publicKey) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${id}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to pause");
      }

      toast.success("Campaign paused");
      fetchCampaignData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to pause");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!publicKey) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/campaigns/${id}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: publicKey.toBase58() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to resume");
      }

      toast.success("Campaign resumed");
      fetchCampaignData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resume");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!publicKey) return;
    if (!confirm("Are you sure you want to cancel this campaign?")) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `/api/campaigns/${id}?wallet=${publicKey.toBase58()}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel");
      }

      toast.success("Campaign cancelled");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            <h1 className="text-3xl font-bold">Campaign Management</h1>
            <p className="text-muted-foreground">
              Connect your wallet to manage this campaign
            </p>
            <div className="flex justify-center">
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto px-4 py-16">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://blinkfund.vercel.app";
  const campaignUrl = `${baseUrl}/campaign/${campaign.slug}`;
  const blinkUrl = `${baseUrl}/api/actions/donate?campaign=${campaign.id}`;

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
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{campaign.title}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-muted-foreground">
              Created {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/campaign/${campaign.slug}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Public Page
            </Link>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressBar
                  raised={campaign.raisedSol}
                  goal={campaign.goalSol}
                />
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">
                      {campaign.donationCount}
                    </p>
                    <p className="text-sm text-muted-foreground">Donations</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {campaign.daysRemaining}
                    </p>
                    <p className="text-sm text-muted-foreground">Days Left</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {campaign.progressPercent}%
                    </p>
                    <p className="text-sm text-muted-foreground">Funded</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Donations */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Donations</CardTitle>
              </CardHeader>
              <CardContent>
                <DonationTable donations={donations} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {campaign.status === "draft" && (
                  <Button
                    className="w-full"
                    onClick={handlePublish}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Publish Campaign
                  </Button>
                )}

                {campaign.status === "active" && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handlePause}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Pause className="h-4 w-4 mr-2" />
                    )}
                    Pause Campaign
                  </Button>
                )}

                {campaign.status === "paused" && (
                  <Button
                    className="w-full"
                    onClick={handleResume}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Resume Campaign
                  </Button>
                )}

                {["draft", "active", "paused"].includes(campaign.status) && (
                  <>
                    <Separator />
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={handleCancel}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Campaign
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Share */}
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
      </div>
    </div>
  );
}
