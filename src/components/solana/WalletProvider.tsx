"use client";

import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { SOLANA_CONFIG } from "@/lib/solana/config";

import "@solana/wallet-adapter-react-ui/styles.css";

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => {
    return SOLANA_CONFIG.RPC_URL || clusterApiUrl(SOLANA_CONFIG.CLUSTER as "devnet" | "mainnet-beta");
  }, []);

  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

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
