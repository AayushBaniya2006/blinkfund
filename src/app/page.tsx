import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { appConfig } from "@/lib/config";
import { SOLANA_CONFIG } from "@/lib/solana";
import {
  Zap,
  Target,
  Wallet,
  ArrowRight,
  Twitter,
  Shield,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
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
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground hidden sm:block"
            >
              Dashboard
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {SOLANA_CONFIG.CLUSTER === "devnet" ? "Devnet" : "Mainnet"}
            </span>
            <Link href="/create">
              <Button>Start Campaign</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <Target className="w-4 h-4" />
            <span>Real Crowdfunding on Solana</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Blinks Let People Send Money.{" "}
            <span className="text-primary">BlinkFund Lets You Raise It.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Run real crowdfunding campaigns with goals, deadlines, and progress
            tracking. Not just tip jars - accountable fundraising on Solana.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Start Your Campaign
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 w-full sm:w-auto"
              >
                <Wallet className="w-4 h-4" />
                Creator Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="container mx-auto px-4 py-16 border-t border-border/20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">Goals</div>
              <p className="text-muted-foreground">
                Set funding targets and track progress in real-time
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">
                Deadlines
              </div>
              <p className="text-muted-foreground">
                Time-bound campaigns create urgency and accountability
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">
                Verified
              </div>
              <p className="text-muted-foreground">
                Wallet ownership proof ensures creator authenticity
              </p>
            </div>
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
                <h3 className="text-xl font-semibold mb-2">
                  1. Verify & Create
                </h3>
                <p className="text-muted-foreground">
                  Connect your wallet, prove ownership with a signature, then
                  set your funding goal and deadline.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Twitter className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Share on X</h3>
                <p className="text-muted-foreground">
                  Post your Blink URL on Twitter/X. Supporters see your campaign
                  with live progress right in their feed.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-border/50">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Track & Grow</h3>
                <p className="text-muted-foreground">
                  Watch donations roll in, track progress toward your goal, and
                  manage everything from your dashboard.
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
            Why {appConfig.projectName}?
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <Target className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">
                  Real Goals, Real Progress
                </h3>
                <p className="text-sm text-muted-foreground">
                  Set specific funding targets. Supporters see exactly how close
                  you are to reaching your goal.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <Clock className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Time-Bound Campaigns</h3>
                <p className="text-sm text-muted-foreground">
                  Deadlines create urgency. Countdown timers show supporters
                  when to act.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <CheckCircle className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Verified Creators</h3>
                <p className="text-sm text-muted-foreground">
                  Wallet signature verification proves you own the receiving
                  address. No impersonation.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <Shield className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Non-Custodial</h3>
                <p className="text-sm text-muted-foreground">
                  Donations go straight to your wallet. No middleman holding
                  your funds.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <Users className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">Transparent Donations</h3>
                <p className="text-sm text-muted-foreground">
                  Every donation is logged. Supporters and creators can see the
                  full history.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-6 rounded-lg bg-card/30 border border-border/30">
              <Zap className="w-6 h-6 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-1">
                  Native Twitter Experience
                </h3>
                <p className="text-sm text-muted-foreground">
                  Campaigns render as interactive cards in Twitter feeds.
                  One-tap donations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Presets Info */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Quick Donation Options</h2>
          <p className="text-muted-foreground mb-6">
            Supporters choose from preset amounts for instant one-tap donations:
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
            Platform fee:{" "}
            {(SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100).toFixed(0)}%
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Run a Real Campaign?
          </h2>
          <p className="text-muted-foreground mb-8">
            Set your goal, verify your wallet, and start raising funds with
            accountability and transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/create">
              <Button size="lg" className="gap-2">
                Start Your Campaign
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
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
              Real crowdfunding on Solana.{" "}
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
