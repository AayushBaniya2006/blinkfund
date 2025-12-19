/**
 * Solana Wallet Signature Verification
 * Verifies that a user owns a wallet by checking their ed25519 signature
 */

import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

/**
 * Generate a challenge message for wallet verification
 * Includes wallet address and nonce for uniqueness
 */
export function generateChallengeMessage(walletAddress: string): {
  message: string;
  nonce: string;
} {
  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  const message = `Sign this message to verify ownership of ${walletAddress} on BlinkFund.\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
  return { message, nonce };
}

/**
 * Verify a wallet signature using ed25519
 *
 * @param message - The original message that was signed
 * @param signature - The signature as a Uint8Array or base58 string
 * @param walletAddress - The wallet address that should have signed
 * @returns true if signature is valid, false otherwise
 */
export function verifyWalletSignature(
  message: string,
  signature: Uint8Array | string,
  walletAddress: string,
): boolean {
  try {
    // Convert message to bytes
    const messageBytes = new TextEncoder().encode(message);

    // Handle signature - could be Uint8Array or base64/base58 string
    let signatureBytes: Uint8Array;
    if (signature instanceof Uint8Array) {
      signatureBytes = signature;
    } else if (typeof signature === "string") {
      // Try to decode as base64 (common format from wallet adapters)
      try {
        signatureBytes = Uint8Array.from(atob(signature), (c) =>
          c.charCodeAt(0),
        );
      } catch {
        // If base64 fails, try base58
        const bs58Chars =
          "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
        let num = BigInt(0);
        for (const char of signature) {
          const index = bs58Chars.indexOf(char);
          if (index === -1) throw new Error("Invalid base58 character");
          num = num * BigInt(58) + BigInt(index);
        }
        const bytes: number[] = [];
        while (num > 0) {
          bytes.unshift(Number(num % BigInt(256)));
          num = num / BigInt(256);
        }
        // Add leading zeros for each leading '1' in the string
        for (const char of signature) {
          if (char === "1") bytes.unshift(0);
          else break;
        }
        signatureBytes = new Uint8Array(bytes);
      }
    } else {
      return false;
    }

    // Get public key bytes from wallet address
    const publicKey = new PublicKey(walletAddress);
    const publicKeyBytes = publicKey.toBytes();

    // Verify using nacl
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

/**
 * Convert Uint8Array signature to base64 for storage
 */
export function signatureToBase64(signature: Uint8Array): string {
  return btoa(String.fromCharCode(...signature));
}

/**
 * Convert base64 signature back to Uint8Array
 */
export function base64ToSignature(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
