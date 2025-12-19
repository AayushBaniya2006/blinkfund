import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignCardProps {
  campaign: {
    slug: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    goalSol: number;
    raisedSol: number;
    progressPercent: number;
    donationCount: number;
    daysRemaining: number;
    status: string;
  };
  className?: string;
}

export function CampaignCard({ campaign, className }: CampaignCardProps) {
  const isExpired = campaign.daysRemaining <= 0;
  const isComplete = campaign.progressPercent >= 100;

  return (
    <Link href={`/campaign/${campaign.slug}`}>
      <Card
        className={cn(
          "overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full",
          className,
        )}
      >
        <div className="aspect-video relative bg-muted">
          {campaign.imageUrl ? (
            <Image
              src={campaign.imageUrl}
              alt={campaign.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Target className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
          {isComplete && (
            <Badge className="absolute top-2 right-2 bg-green-500">
              Goal Reached
            </Badge>
          )}
          {isExpired && !isComplete && (
            <Badge variant="destructive" className="absolute top-2 right-2">
              Ended
            </Badge>
          )}
        </div>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold line-clamp-2">{campaign.title}</h3>

          {campaign.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {campaign.description}
            </p>
          )}

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full",
                  isComplete ? "bg-green-500" : "bg-primary",
                )}
                style={{ width: `${campaign.progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                {campaign.raisedSol.toFixed(2)} SOL
              </span>
              <span className="text-muted-foreground">
                {campaign.progressPercent}%
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              <span>{campaign.goalSol} SOL</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{campaign.donationCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {isExpired ? "Ended" : `${campaign.daysRemaining}d left`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
