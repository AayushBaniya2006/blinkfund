"use client";

/**
 * Wallet Signature Verification Component
 * Handles the flow of connecting wallet, signing a message, and verifying ownership
 */

import { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2, Shield } from "lucide-react";

interface WalletSignatureVerifyProps {
  onVerified: (wallet: string) => void;
  onError?: (error: string) => void;
}

export function WalletSignatureVerify({
  onVerified,
  onError,
}: WalletSignatureVerifyProps) {
  const { publicKey, signMessage, connected } = useWallet();
  const [status, setStatus] = useState<
    "idle" | "loading" | "signing" | "verifying" | "verified" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Please connect your wallet first");
      setStatus("error");
      return;
    }

    try {
      setStatus("loading");
      setError(null);

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

      // Sign the message
      setStatus("signing");
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);

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

  // Not connected state
  if (!connected) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            Connect Your Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your Solana wallet to verify ownership and create campaigns.
          </p>
          <WalletMultiButton className="!bg-primary hover:!bg-primary/90" />
        </CardContent>
      </Card>
    );
  }

  // Verified state
  if (status === "verified") {
    return (
      <Card className="bg-card/50 border-green-500/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <p className="font-medium text-green-500">Wallet Verified</p>
              <p className="text-sm text-muted-foreground">
                {publicKey?.toBase58().slice(0, 4)}...
                {publicKey?.toBase58().slice(-4)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <Card className="bg-card/50 border-red-500/50">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <div>
              <p className="font-medium text-red-500">Verification Failed</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          <Button onClick={handleVerify} variant="outline" className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Connected but not verified
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          Verify Wallet Ownership
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Sign a message to prove you own this wallet. This is required to
          create campaigns.
        </p>
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-mono">
            {publicKey?.toBase58().slice(0, 8)}...
            {publicKey?.toBase58().slice(-8)}
          </span>
        </div>
        <Button
          onClick={handleVerify}
          disabled={
            status === "loading" ||
            status === "signing" ||
            status === "verifying"
          }
          className="w-full"
        >
          {status === "loading" && (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting challenge...
            </>
          )}
          {status === "signing" && (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sign in wallet...
            </>
          )}
          {status === "verifying" && (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          )}
          {status === "idle" && "Verify Ownership"}
        </Button>
      </CardContent>
    </Card>
  );
}
