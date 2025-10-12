"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/ui/border-beam";
import { getCreditsBuyUrl, getCreditsPrice, type CreditType } from "@/lib/credits/credits";
import { PlanProvider } from "@/lib/plans/getSubscribeUrl";
import useCurrentPlan from "@/lib/users/useCurrentPlan";
import { Coins, Zap, Crown, Image, Video } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Predefined credit packages
const creditPackages = [
  {
    id: "starter",
    credits: 10,
    name: "Starter Pack",
    description: "Perfect for trying out our AI services",
    icon: Coins,
    popular: false,
  },
  {
    id: "popular",
    credits: 100,
    name: "Popular Pack",
    description: "Most popular choice for regular users",
    icon: Zap,
    popular: true,
  },
  {
    id: "pro",
    credits: 1000,
    name: "Pro Pack",
    description: "Best value for power users",
    icon: Crown,
    popular: false,
  },
];

export default function WebsiteCreditsSection() {
  const { currentPlan } = useCurrentPlan();
  const [selectedProvider] = useState<PlanProvider>(PlanProvider.STRIPE);

  const getPackagePrice = (creditType: CreditType, credits: number) => {
    try {
      // Pass user's current plan for personalized pricing, fallback to base price for non-authenticated users
      const validCurrentPlan = 
        currentPlan && 
        currentPlan.codename && 
        currentPlan.quotas 
          ? {
              id: currentPlan.id,
              codename: currentPlan.codename,
              quotas: currentPlan.quotas,
            }
          : undefined;
      
      return getCreditsPrice(creditType, credits, validCurrentPlan);
    } catch (error) {
      console.error("Error calculating price:", error);
      return 0;
    }
  };

  const handleBuyCredits = (creditType: CreditType, credits: number) => {
    const url = getCreditsBuyUrl({
      creditType,
      amount: credits,
      provider: selectedProvider,
    });
    window.location.href = url;
  };

  const CreditTypeSection = ({ creditType, title, description, icon: Icon }: {
    creditType: CreditType;
    title: string;
    description: string;
    icon: any;
  }) => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Icon className="h-8 w-8 text-primary" />
          <h3 className="text-2xl font-bold">{title}</h3>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {creditPackages.map((pkg) => {
          const PackageIcon = pkg.icon;
          const price = getPackagePrice(creditType, pkg.credits);
          const pricePerCredit = price > 0 ? (price / pkg.credits).toFixed(4) : "0";

          return (
            <Card
              key={`${creditType}-${pkg.id}`}
              className={`relative ${pkg.popular ? "border-primary shadow-lg scale-105" : ""}`}
            >
              {pkg.popular && <BorderBeam size={250} duration={12} delay={9} />}
              
              <CardHeader className="text-center">
                {pkg.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <PackageIcon className="h-6 w-6 text-primary" />
                </div>
                
                <CardTitle className="text-lg">{pkg.name}</CardTitle>
                <CardDescription className="text-sm">{pkg.description}</CardDescription>
                
                <div className="mt-4">
                  <div className="text-2xl font-bold">
                    ${price.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pkg.credits} credits • ${pricePerCredit}/credit
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleBuyCredits(creditType, pkg.credits)}
                  disabled={price === 0}
                >
                  Buy {pkg.credits} Credits
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="py-16 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            AI Credits for Everyone
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            Get instant access to our AI services with flexible credit packages. 
            No subscription required - pay only for what you use.
          </p>
        </div>

        <Tabs defaultValue="image_generation" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-12">
            <TabsTrigger value="image_generation" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Image AI
            </TabsTrigger>
            <TabsTrigger value="video_generation" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="image_generation">
            <CreditTypeSection
              creditType="image_generation"
              title="Image Generation Credits"
              description="Create stunning AI-generated images for your projects, marketing materials, and creative content."
              icon={Image}
            />
          </TabsContent>

          <TabsContent value="video_generation">
            <CreditTypeSection
              creditType="video_generation"
              title="Video Generation Credits"
              description="Generate engaging AI videos for social media, advertisements, and video content creation."
              icon={Video}
            />
          </TabsContent>
        </Tabs>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground">
            Secure payments powered by Stripe • No monthly commitments • Instant activation
          </p>
          {currentPlan && currentPlan.codename && currentPlan.quotas && (
            <p className="text-sm text-primary mt-2 font-medium">
              ✨ Personalized pricing based on your {currentPlan.codename} plan
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
