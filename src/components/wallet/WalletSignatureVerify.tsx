"use client";

/**
 * Wallet Signature Verification Component
 * Handles the flow of connecting wallet, signing a message, and verifying ownership
 */

import { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Wallet,
  RefreshCw,
} from "lucide-react";

interface WalletSignatureVerifyProps {
  onVerified: (wallet: string) => void;
  onError?: (error: string) => void;
}

export function WalletSignatureVerify({
  onVerified,
  onError,
}: WalletSignatureVerifyProps) {
  const { publicKey, signMessage, connected, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [status, setStatus] = useState<
    "idle" | "loading" | "signing" | "verifying" | "verified" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  const handleVerify = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Wallet not ready. Please try again.");
      setStatus("error");
      return;
    }

    try {
      setStatus("loading");
      setError(null);
      setHasAttempted(true);

      const walletAddress = publicKey.toBase58();

      // Get challenge message from server
      const challengeRes = await fetch(
        `/api/wallet/challenge?wallet=${walletAddress}`,
      );
      if (!challengeRes.ok) {
        const data = await challengeRes.json();
        throw new Error(data.error || "Failed to get challenge");
      }
      const { message } = await challengeRes.json();

      // Sign the message with timeout
      setStatus("signing");
      const messageBytes = new TextEncoder().encode(message);

      // Add timeout to prevent getting stuck if wallet doesn't respond
      const signWithTimeout = Promise.race([
        signMessage(messageBytes),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Signature request timed out. Please try again and check your wallet for the popup.",
                ),
              ),
            30000,
          ),
        ),
      ]);

      const signature = await signWithTimeout;

      // Convert signature to base64 for transmission
      const signatureBase64 = btoa(String.fromCharCode(...signature));

      // Verify with server
      setStatus("verifying");
      const verifyRes = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: walletAddress,
          message,
          signature: signatureBase64,
        }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Verification failed");
      }

      const result = await verifyRes.json();
      if (result.verified) {
        setStatus("verified");
        onVerified(walletAddress);
      } else {
        throw new Error("Verification failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Verification failed";
      setError(errorMessage);
      setStatus("error");
      onError?.(errorMessage);
    }
  }, [publicKey, signMessage, onVerified, onError]);

  // Auto-verify when wallet connects (only if not already attempted)
  // Add a small delay to ensure wallet adapter is fully ready
  useEffect(() => {
    if (
      connected &&
      publicKey &&
      signMessage &&
      !hasAttempted &&
      status === "idle"
    ) {
      const timer = setTimeout(() => {
        handleVerify();
      }, 500); // Give Phantom time to fully initialize
      return () => clearTimeout(timer);
    }
  }, [connected, publicKey, signMessage, hasAttempted, status, handleVerify]);

  // Reset state when wallet changes
  useEffect(() => {
    if (!connected) {
      setStatus("idle");
      setError(null);
      setHasAttempted(false);
    }
  }, [connected]);

  const handleChangeWallet = async () => {
    await disconnect();
    setStatus("idle");
    setError(null);
    setHasAttempted(false);
    setTimeout(() => setVisible(true), 100);
  };

  const handleConnect = () => {
    setVisible(true);
  };

  // Not connected state
  if (!connected) {
    return (
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="pt-6 pb-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Connect Your Wallet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Use Phantom, Backpack, Solflare, or any Solana wallet
              </p>
            </div>
            <Button onClick={handleConnect} size="lg" className="w-full">
              <Wallet className="w-4 h-4 mr-2" />
              Select Wallet
            </Button>
            <p className="text-xs text-muted-foreground">
              Donations will go directly to your connected wallet
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verified state
  if (status === "verified") {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium text-green-600 dark:text-green-400">
                  Wallet Verified
                </p>
                <p className="text-sm text-muted-foreground font-mono">
                  {publicKey?.toBase58().slice(0, 6)}...
                  {publicKey?.toBase58().slice(-4)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleChangeWallet}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Change
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading/Signing/Verifying state
  if (status === "loading" || status === "signing" || status === "verifying") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
              <div>
                <p className="font-medium">
                  {status === "loading" && "Preparing verification..."}
                  {status === "signing" && "Please sign in your wallet"}
                  {status === "verifying" && "Verifying signature..."}
                </p>
                <p className="text-sm text-muted-foreground font-mono">
                  {publicKey?.toBase58().slice(0, 6)}...
                  {publicKey?.toBase58().slice(-4)}
                </p>
              </div>
            </div>
          </div>
          {status === "signing" && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Check your {wallet?.adapter.name || "wallet"} for a signature
              request
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <Card className="border-red-500/50 bg-red-500/5">
        <CardContent className="pt-6 pb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-red-600 dark:text-red-400">
                Verification Failed
              </p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleVerify} className="flex-1">
              Try Again
            </Button>
            <Button variant="outline" onClick={handleChangeWallet}>
              Change Wallet
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Idle but connected (shouldn't normally show - auto-verify kicks in)
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="pt-6 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Ready to Verify</p>
              <p className="text-sm text-muted-foreground font-mono">
                {publicKey?.toBase58().slice(0, 6)}...
                {publicKey?.toBase58().slice(-4)}
              </p>
            </div>
          </div>
          <Button onClick={handleVerify} size="sm">
            Verify Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
