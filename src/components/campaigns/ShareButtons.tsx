"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Twitter, Copy, Check, Share2, Zap, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ShareButtonsProps {
  campaignTitle: string;
  campaignUrl: string;
  blinkUrl: string;
  className?: string;
}

export function ShareButtons({
  campaignTitle,
  campaignUrl,
  blinkUrl,
  className,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState<"link" | "blink" | null>(null);

  // dial.to URL enables Blinks to work on X/Twitter - THIS IS THE PRIMARY URL TO SHARE
  const dialToUrl = `https://dial.to/?action=solana-action:${encodeURIComponent(blinkUrl)}`;

  const handleCopy = async (text: string, type: "link" | "blink") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(
        type === "blink"
          ? "Blink URL copied! Share this on X for inline donations."
          : "Page link copied (note: use Blink URL for X/Twitter)"
      );
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  // Share the dial.to URL on X so Blinks render inline
  const tweetText = encodeURIComponent(
    `Support "${campaignTitle}" on @FundOnBlink!\n\nDonate directly from this post:\n${dialToUrl}`,
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <div className={className}>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Share2 className="h-4 w-4" />
        Share Campaign
      </h3>
      <div className="flex flex-wrap gap-2">
        {/* PRIMARY: Share on X - this is what most users want */}
        <Button asChild variant="default" size="sm" className="gap-2">
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
            <Twitter className="h-4 w-4" />
            Share on X
          </a>
        </Button>

        {/* Copy Blink URL - for sharing on X manually */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleCopy(dialToUrl, "blink")}
          className="gap-2"
        >
          {copied === "blink" ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Copy Blink URL
        </Button>

        {/* Copy page link - secondary option for non-X sharing */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleCopy(campaignUrl, "link")}
          className="gap-2 text-muted-foreground"
        >
          {copied === "link" ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          Copy Page Link
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        <strong>Tip:</strong> Use &quot;Share on X&quot; or &quot;Copy Blink URL&quot; for X/Twitter -
        this enables inline donations directly from your post!
      </p>
    </div>
  );
}
