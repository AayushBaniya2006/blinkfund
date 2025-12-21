"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SOLANA_CONFIG } from "@/lib/solana/config";
import WalletProvider from "@/components/solana/WalletProvider";
import Image from "next/image";
import Link from "next/link";

function DonateForm() {
  const searchParams = useSearchParams();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  const creatorWallet = searchParams.get("wallet") || "";
  const title = searchParams.get("title") || "Support this Campaign";
  const description = searchParams.get("desc") || "Make a donation to support this cause";
  const imageUrl = searchParams.get("image") || "";

  const isValidWallet = (() => {
    try {
      if (!creatorWallet) return false;
      new PublicKey(creatorWallet);
      return true;
    } catch {
      return false;
    }
  })();

  const donate = async (amount: number) => {
    if (!publicKey || !isValidWallet) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const creatorPubkey = new PublicKey(creatorWallet);
      const platformPubkey = new PublicKey(SOLANA_CONFIG.PLATFORM_WALLET);

      const totalLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const platformFee = Math.floor(totalLamports * SOLANA_CONFIG.PLATFORM_FEE_PERCENT);
      const creatorAmount = totalLamports - platformFee;

      const transaction = new Transaction();

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: creatorPubkey,
          lamports: creatorAmount,
        })
      );

      if (platformFee > 0) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: platformPubkey,
            lamports: platformFee,
          })
        );
      }

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      setSuccess(`Donation successful! Transaction: ${signature.slice(0, 8)}...`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  if (!creatorWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/80 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Campaign</h1>
          <p className="text-muted-foreground">No wallet address provided.</p>
          <a href="/create" className="mt-4 inline-block text-primary hover:underline">
            Create a Campaign →
          </a>
        </div>
      </div>
    );
  }

  if (!isValidWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/80 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Wallet</h1>
          <p className="text-muted-foreground">The provided wallet address is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 p-4">
      <div className="max-w-md mx-auto pt-8">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-primary">BlinkFund</Link>
          <p className="text-sm text-muted-foreground mt-1">Solana Crowdfunding</p>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden shadow-lg">
          {imageUrl && (
            <div className="relative w-full h-48 bg-muted">
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
          )}

          <div className="p-6">
            <h1 className="text-xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground text-sm mb-4">{description}</p>

            <div className="text-xs text-muted-foreground mb-6 font-mono bg-muted/50 p-2 rounded break-all">
              Creator: {creatorWallet.slice(0, 4)}...{creatorWallet.slice(-4)}
            </div>

            <div className="flex justify-center mb-6">
              <WalletMultiButton />
            </div>

            {connected && (
              <>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {SOLANA_CONFIG.AMOUNT_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => donate(amount)}
                      disabled={loading}
                      className="py-2 px-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {amount} SOL
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    min={SOLANA_CONFIG.MIN_AMOUNT}
                    max={SOLANA_CONFIG.MAX_AMOUNT}
                    step="0.01"
                    className="flex-1 px-3 py-2 border rounded-lg bg-background text-sm"
                  />
                  <button
                    onClick={() => {
                      const amount = parseFloat(customAmount);
                      if (amount >= SOLANA_CONFIG.MIN_AMOUNT && amount <= SOLANA_CONFIG.MAX_AMOUNT) {
                        donate(amount);
                      }
                    }}
                    disabled={loading || !customAmount}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Donate
                  </button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  {SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100}% platform fee applies
                </p>
              </>
            )}

            {!connected && (
              <p className="text-center text-muted-foreground text-sm">
                Connect your wallet to make a donation
              </p>
            )}

            {loading && (
              <div className="mt-4 p-3 bg-muted rounded-lg text-center text-sm">
                Processing transaction...
              </div>
            )}
            {error && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg text-center text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mt-4 p-3 bg-green-500/10 text-green-600 rounded-lg text-center text-sm">
                {success}
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>Network: {SOLANA_CONFIG.CLUSTER}</p>
          <a href="/create" className="text-primary hover:underline mt-2 inline-block">
            Create your own campaign →
          </a>
        </div>
      </div>
    </div>
  );
}

export default function DonateContent() {
  return (
    <WalletProvider>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
      }>
        <DonateForm />
      </Suspense>
    </WalletProvider>
  );
}
