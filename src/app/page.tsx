import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appConfig } from "@/lib/config";
import { SOLANA_CONFIG } from "@/lib/solana";
import {
  Zap,
  Share2,
  Wallet,
  ArrowRight,
  Twitter,
  Globe,
  Shield,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <header className="border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">{appConfig.projectName}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {SOLANA_CONFIG.CLUSTER === "devnet" ? "Devnet" : "Mainnet"}
            </span>
            <Link href="/create">
              <Button>Create Campaign</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Zap className="w-4 h-4" />
            <span>Powered by Solana Blinks</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Crowdfund Directly on{" "}
            <span className="text-primary">Twitter/X</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {appConfig.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Create Your Campaign
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a
              href="https://dial.to"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                variant="outline"
                className="gap-2 w-full sm:w-auto"
              >
                <Globe className="w-4 h-4" />
                Test on dial.to
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">1. Enter Details</h3>
                <p className="text-muted-foreground">
                  Add your Solana wallet address, campaign title, description,
                  and image. No signup required.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Share2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Share Link</h3>
                <p className="text-muted-foreground">
                  Get your unique Blink URL and share it on Twitter/X. Wallets
                  auto-render your campaign card.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Collect Donations</h3>
                <p className="text-muted-foreground">
                  Supporters tap a preset amount, sign once, and SOL goes
                  directly to your wallet. Instant.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Use {appConfig.projectName}?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <Twitter className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Native Twitter Experience</h3>
                <p className="text-sm text-muted-foreground">
                  Campaigns render as interactive cards directly in Twitter
                  feeds - no redirects needed.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <Shield className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Non-Custodial</h3>
                <p className="text-sm text-muted-foreground">
                  No middleman. Donations go straight to your wallet. You
                  control your funds.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <Zap className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Instant Setup</h3>
                <p className="text-sm text-muted-foreground">
                  Create a campaign in under 60 seconds. No accounts, no
                  approval process.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <Globe className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">URL-Based Config</h3>
                <p className="text-sm text-muted-foreground">
                  All campaign data is in the URL. Update anytime by editing
                  the link parameters.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Presets Info */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Donation Presets</h2>
          <p className="text-muted-foreground mb-6">
            Supporters choose from preset amounts for quick one-tap donations:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {SOLANA_CONFIG.AMOUNT_PRESETS.map((amount) => (
              <div
                key={amount}
                className="px-6 py-3 rounded-full bg-primary/10 text-primary font-semibold"
              >
                {amount} SOL
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-6">
            Platform fee: {(SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100).toFixed(0)}%
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Fundraising?</h2>
          <p className="text-muted-foreground mb-8">
            Create your campaign link in seconds and share it with the world.
          </p>
          <Link href="/create">
            <Button size="lg" className="gap-2">
              Create Campaign
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">{appConfig.projectName}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built on Solana Actions/Blinks.{" "}
              {SOLANA_CONFIG.CLUSTER === "devnet" && (
                <span className="text-yellow-500">Currently on Devnet.</span>
              )}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
