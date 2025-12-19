"use client";

import { formatDistanceToNow } from "date-fns";
import { ExternalLink, User } from "lucide-react";
import { SOLANA_CONFIG } from "@/lib/solana";

interface Donation {
  id: string;
  donorWallet: string;
  amountSol: number;
  txSignature: string;
  confirmedAt: string | Date | null;
}

interface DonationListProps {
  donations: Donation[];
  className?: string;
}

function shortenWallet(wallet: string): string {
  return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function getExplorerUrl(signature: string): string {
  const cluster =
    SOLANA_CONFIG.CLUSTER === "mainnet-beta"
      ? ""
      : `?cluster=${SOLANA_CONFIG.CLUSTER}`;
  return `https://explorer.solana.com/tx/${signature}${cluster}`;
}

export function DonationList({ donations, className }: DonationListProps) {
  if (donations.length === 0) {
    return (
      <div className={className}>
        <p className="text-muted-foreground text-center py-8">
          No donations yet. Be the first to support this campaign!
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="font-semibold mb-4">Recent Donations</h3>
      <div className="space-y-3">
        {donations.map((donation) => (
          <div
            key={donation.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-mono text-sm">
                  {shortenWallet(donation.donorWallet)}
                </p>
                {donation.confirmedAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(donation.confirmedAt), {
                      addSuffix: true,
                    })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-600">
                +{donation.amountSol.toFixed(4)} SOL
              </span>
              <a
                href={getExplorerUrl(donation.txSignature)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
