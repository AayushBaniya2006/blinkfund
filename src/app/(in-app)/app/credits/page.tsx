"use client";

import CreditsPackages from "@/components/website/credits-packages";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { creditsConfig } from "@/lib/credits/config";
import { Badge } from "@/components/ui/badge";
import { Image, Video } from "lucide-react";

export default function CreditsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Buy Credits</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Purchase credits for our AI services. Choose from different credit types based on your needs.
        </p>
      </div>

      <Tabs defaultValue="image_generation" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
          <TabsTrigger value="image_generation" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Image Credits
          </TabsTrigger>
          <TabsTrigger value="video_generation" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video Credits
          </TabsTrigger>
        </TabsList>

        <TabsContent value="image_generation">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                {creditsConfig.image_generation.name}
              </CardTitle>
              <CardDescription>
                Use these credits to generate AI images. Perfect for content creation, marketing materials, and creative projects.
              </CardDescription>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">
                  Minimum: {creditsConfig.image_generation.minimumAmount || 1} credits
                </Badge>
                <Badge variant="outline">
                  Currency: {creditsConfig.image_generation.currency}
                </Badge>
              </div>
            </CardHeader>
          </Card>
          
          <CreditsPackages
            creditType="image_generation"
            title="Image Generation Credits"
            description="Choose the perfect package for your image generation needs"
          />
        </TabsContent>

        <TabsContent value="video_generation">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                {creditsConfig.video_generation.name}
              </CardTitle>
              <CardDescription>
                Use these credits to generate AI videos. Perfect for social media content, advertisements, and video projects.
              </CardDescription>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">
                  Minimum: {creditsConfig.video_generation.minimumAmount || 1} credits
                </Badge>
                <Badge variant="outline">
                  Currency: {creditsConfig.video_generation.currency}
                </Badge>
              </div>
            </CardHeader>
          </Card>
          
          <CreditsPackages
            creditType="video_generation"
            title="Video Generation Credits"
            description="Choose the perfect package for your video generation needs"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
