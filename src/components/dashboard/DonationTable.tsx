"use client";

import { formatDistanceToNow } from "date-fns";
import { ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SOLANA_CONFIG } from "@/lib/solana";

interface Donation {
  id: string;
  donorWallet: string;
  amountSol: number;
  status: string;
  txSignature: string | null;
  createdAt: string | Date;
  confirmedAt: string | Date | null;
}

interface DonationTableProps {
  donations: Donation[];
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

export function DonationTable({ donations }: DonationTableProps) {
  if (donations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No donations yet
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Donor</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Transaction</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {donations.map((donation) => (
          <TableRow key={donation.id}>
            <TableCell className="font-mono text-sm">
              {shortenWallet(donation.donorWallet)}
            </TableCell>
            <TableCell className="font-semibold text-green-600">
              {donation.amountSol.toFixed(4)} SOL
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  donation.status === "confirmed"
                    ? "default"
                    : donation.status === "pending"
                      ? "secondary"
                      : "destructive"
                }
              >
                {donation.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDistanceToNow(
                new Date(donation.confirmedAt || donation.createdAt),
                { addSuffix: true },
              )}
            </TableCell>
            <TableCell className="text-right">
              {donation.txSignature ? (
                <a
                  href={getExplorerUrl(donation.txSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4 inline" />
                </a>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
