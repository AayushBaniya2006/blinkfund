"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Twitter, Copy, Check, Share2 } from "lucide-react";
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

  const handleCopy = async (text: string, type: "link" | "blink") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      toast.success(type === "blink" ? "Blink URL copied!" : "Link copied!");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const tweetText = encodeURIComponent(
    `Support "${campaignTitle}" on @BlinkFund!\n\n${blinkUrl}`,
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  return (
    <div className={className}>
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Share2 className="h-4 w-4" />
        Share Campaign
      </h3>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopy(campaignUrl, "link")}
          className="gap-2"
        >
          {copied === "link" ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy Link
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCopy(blinkUrl, "blink")}
          className="gap-2"
        >
          {copied === "blink" ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Copy Blink URL
        </Button>

        <Button asChild variant="outline" size="sm" className="gap-2">
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
            <Twitter className="h-4 w-4" />
            Share on X
          </a>
        </Button>
      </div>
    </div>
  );
}
