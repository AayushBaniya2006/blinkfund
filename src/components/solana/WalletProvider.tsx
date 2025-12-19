"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { SOLANA_CONFIG } from "@/lib/solana/config";

import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => {
    return SOLANA_CONFIG.RPC_URL || clusterApiUrl(SOLANA_CONFIG.CLUSTER as "devnet" | "mainnet-beta");
  }, []);

  // Use empty array - modern wallet-adapter auto-detects standard wallets
  // This prevents duplicate key errors from manually added adapters
  // conflicting with auto-detected browser extension wallets
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
