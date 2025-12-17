"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { appConfig } from "@/lib/config";
import { SOLANA_CONFIG } from "@/lib/solana";
import { isValidSolanaAddressFormat } from "@/lib/solana/validation";
import {
  Zap,
  ArrowLeft,
  Copy,
  ExternalLink,
  Check,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function CreateCampaignPage() {
  const [wallet, setWallet] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [copied, setCopied] = useState(false);

  // Validate wallet address
  const walletError = useMemo(() => {
    if (!wallet) return null;
    if (!isValidSolanaAddressFormat(wallet)) {
      return "Invalid Solana wallet address";
    }
    return null;
  }, [wallet]);

  // Generate campaign URL
  const campaignUrl = useMemo(() => {
    if (!wallet || walletError) return null;

    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/actions/donate`
        : "/api/actions/donate";

    const params = new URLSearchParams();
    params.set("wallet", wallet);
    if (title.trim()) params.set("title", title.trim());
    if (description.trim()) params.set("desc", description.trim());
    if (imageUrl.trim()) params.set("image", imageUrl.trim());

    return `${baseUrl}?${params.toString()}`;
  }, [wallet, title, description, imageUrl, walletError]);

  // Generate dial.to test URL
  const dialToUrl = useMemo(() => {
    if (!campaignUrl) return null;
    return `https://dial.to/?action=${encodeURIComponent(campaignUrl)}`;
  }, [campaignUrl]);

  // Generate fallback donate page URL (for users without wallet extensions)
  const fallbackUrl = useMemo(() => {
    if (!wallet || walletError) return null;

    const baseUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/donate`
        : "/donate";

    const params = new URLSearchParams();
    params.set("wallet", wallet);
    if (title.trim()) params.set("title", title.trim());
    if (description.trim()) params.set("desc", description.trim());
    if (imageUrl.trim()) params.set("image", imageUrl.trim());

    return `${baseUrl}?${params.toString()}`;
  }, [wallet, title, description, imageUrl, walletError]);

  const handleCopy = async () => {
    if (!campaignUrl) return;
    try {
      await navigator.clipboard.writeText(campaignUrl);
      setCopied(true);
      toast.success("Campaign URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">{appConfig.projectName}</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {SOLANA_CONFIG.CLUSTER === "devnet" ? "Devnet" : "Mainnet"}
          </span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <h1 className="text-3xl font-bold mb-2">Create Your Campaign</h1>
          <p className="text-muted-foreground mb-8">
            Fill in your details to generate a shareable Blink URL for Twitter/X.
          </p>

          {/* Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Wallet Address */}
              <div className="space-y-2">
                <Label htmlFor="wallet">
                  Solana Wallet Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="wallet"
                  placeholder="Your Solana wallet address (e.g., 7EcD...LtV)"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  className={walletError ? "border-destructive" : ""}
                />
                {walletError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {walletError}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Donations will be sent directly to this wallet.
                </p>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  placeholder={SOLANA_CONFIG.DEFAULT_TITLE}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground">
                  {title.length}/100 characters
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder={SOLANA_CONFIG.DEFAULT_DESCRIPTION}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {description.length}/500 characters
                </p>
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. Provide a direct link to an image for your campaign card.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Generated URL */}
          {campaignUrl && (
            <Card className="mb-8 border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  Your Campaign URL
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <div className="p-4 bg-background rounded-lg border text-sm font-mono break-all">
                    {campaignUrl}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={handleCopy} className="gap-2 flex-1">
                    <Copy className="w-4 h-4" />
                    Copy URL
                  </Button>
                  {dialToUrl && (
                    <a
                      href={dialToUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" className="gap-2 w-full">
                        <ExternalLink className="w-4 h-4" />
                        Test on dial.to
                      </Button>
                    </a>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  Share this URL on Twitter/X. Compatible wallets will
                  automatically render your donation card.
                </p>

                {/* Fallback URL for non-wallet users */}
                {fallbackUrl && (
                  <div className="pt-4 border-t mt-4">
                    <h4 className="text-sm font-medium mb-2">Fallback Link (for users without wallet extensions)</h4>
                    <div className="p-3 bg-background rounded-lg border text-xs font-mono break-all mb-3">
                      {fallbackUrl}
                    </div>
                    <a
                      href={fallbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-2 w-full">
                        <ExternalLink className="w-4 h-4" />
                        Preview Fallback Page
                      </Button>
                    </a>
                    <p className="text-xs text-muted-foreground mt-2">
                      Share this link with users who don&apos;t have Phantom/Backpack installed.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Donation Presets</h3>
                <div className="flex flex-wrap gap-2">
                  {SOLANA_CONFIG.AMOUNT_PRESETS.map((amount) => (
                    <span
                      key={amount}
                      className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full"
                    >
                      {amount} SOL
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Platform Fee</h3>
                <p className="text-2xl font-bold text-primary">
                  {(SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Deducted from each donation
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
