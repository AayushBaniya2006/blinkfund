/**
 * Wallet Session Authentication
 *
 * Provides cryptographic verification for wallet-based operations.
 * Requires fresh signatures for sensitive operations to prevent
 * attackers from claiming ownership of wallets they don't control.
 */

import { verifyWalletSignature } from "@/lib/solana/signature";
import { validateWalletAddress } from "@/lib/solana/validation";
import { NextResponse } from "next/server";

/**
 * Maximum age for action authorization messages (5 minutes)
 */
const MAX_MESSAGE_AGE_MS = 5 * 60 * 1000;

/**
 * Action types that require wallet authorization
 */
export type WalletActionType =
  | "campaign:update"
  | "campaign:delete"
  | "campaign:publish"
  | "campaign:pause"
  | "campaign:resume";

/**
 * Wallet authorization request payload
 */
export interface WalletAuthRequest {
  /** The wallet address claiming to perform the action */
  wallet: string;
  /** The message that was signed */
  message: string;
  /** The signature of the message */
  signature: string;
}

/**
 * Result of wallet authorization verification
 */
export interface WalletAuthResult {
  success: boolean;
  wallet?: string;
  error?: string;
  errorResponse?: NextResponse;
}

/**
 * Generate a message for wallet action authorization
 *
 * The message includes:
 * - Wallet address
 * - Action type
 * - Resource ID (e.g., campaign ID)
 * - Timestamp for expiry
 * - Random nonce for uniqueness
 *
 * @example
 * ```typescript
 * const { message, timestamp, nonce } = generateActionAuthMessage(
 *   "ABC123...",
 *   "campaign:update",
 *   "campaign-id-123"
 * );
 * ```
 */
export function generateActionAuthMessage(
  walletAddress: string,
  action: WalletActionType,
  resourceId: string
): { message: string; timestamp: number; nonce: string } {
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();

  const message = [
    `Authorize action on BlinkFund`,
    ``,
    `Action: ${action}`,
    `Resource: ${resourceId}`,
    `Wallet: ${walletAddress}`,
    `Timestamp: ${timestamp}`,
    `Nonce: ${nonce}`,
  ].join("\n");

  return { message, timestamp, nonce };
}

/**
 * Verify wallet authorization for a sensitive action
 *
 * Checks:
 * 1. Wallet address is valid
 * 2. Message format is correct and includes the wallet
 * 3. Timestamp is within allowed window
 * 4. Signature is cryptographically valid
 *
 * @param auth - The authorization request
 * @param expectedAction - The action being performed (optional, for validation)
 * @param expectedResourceId - The resource ID (optional, for validation)
 * @returns WalletAuthResult with success status or error
 */
export function verifyWalletAuth(
  auth: WalletAuthRequest,
  expectedAction?: WalletActionType,
  expectedResourceId?: string
): WalletAuthResult {
  const { wallet, message, signature } = auth;

  // 1. Validate wallet address format
  const validatedWallet = validateWalletAddress(wallet);
  if (!validatedWallet) {
    return {
      success: false,
      error: "Invalid wallet address",
      errorResponse: NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      ),
    };
  }

  // 2. Verify message contains the wallet address
  if (!message.includes(`Wallet: ${wallet}`)) {
    return {
      success: false,
      error: "Message does not match wallet",
      errorResponse: NextResponse.json(
        { error: "Authorization message does not match wallet" },
        { status: 400 }
      ),
    };
  }

  // 3. Extract and verify timestamp
  const timestampMatch = message.match(/Timestamp: (\d+)/);
  if (!timestampMatch) {
    return {
      success: false,
      error: "Missing timestamp in message",
      errorResponse: NextResponse.json(
        { error: "Invalid authorization message format" },
        { status: 400 }
      ),
    };
  }

  const timestamp = parseInt(timestampMatch[1], 10);
  const now = Date.now();

  if (now - timestamp > MAX_MESSAGE_AGE_MS) {
    return {
      success: false,
      error: "Authorization expired",
      errorResponse: NextResponse.json(
        { error: "Authorization has expired. Please sign again." },
        { status: 401 }
      ),
    };
  }

  // Prevent future timestamps (clock skew tolerance: 30 seconds)
  if (timestamp > now + 30000) {
    return {
      success: false,
      error: "Invalid timestamp",
      errorResponse: NextResponse.json(
        { error: "Invalid authorization timestamp" },
        { status: 400 }
      ),
    };
  }

  // 4. Optionally verify action type
  if (expectedAction) {
    if (!message.includes(`Action: ${expectedAction}`)) {
      return {
        success: false,
        error: "Action mismatch",
        errorResponse: NextResponse.json(
          { error: "Authorization is not valid for this action" },
          { status: 403 }
        ),
      };
    }
  }

  // 5. Optionally verify resource ID
  if (expectedResourceId) {
    if (!message.includes(`Resource: ${expectedResourceId}`)) {
      return {
        success: false,
        error: "Resource mismatch",
        errorResponse: NextResponse.json(
          { error: "Authorization is not valid for this resource" },
          { status: 403 }
        ),
      };
    }
  }

  // 6. Verify cryptographic signature
  const isValidSignature = verifyWalletSignature(message, signature, wallet);
  if (!isValidSignature) {
    return {
      success: false,
      error: "Invalid signature",
      errorResponse: NextResponse.json(
        { error: "Wallet signature verification failed" },
        { status: 401 }
      ),
    };
  }

  return {
    success: true,
    wallet,
  };
}

/**
 * Extract wallet auth from request body
 * Returns null if auth fields are missing
 */
export function extractWalletAuth(
  body: Record<string, unknown>
): WalletAuthRequest | null {
  const { wallet, message, signature } = body;

  if (
    typeof wallet !== "string" ||
    typeof message !== "string" ||
    typeof signature !== "string"
  ) {
    return null;
  }

  return { wallet, message, signature };
}

/**
 * Middleware helper to require wallet authorization
 *
 * @example
 * ```typescript
 * export async function PATCH(req: NextRequest, { params }) {
 *   const body = await parseJsonWithLimit(req, REQUEST_SIZE_LIMITS.campaigns);
 *   if (body instanceof NextResponse) return body;
 *
 *   const authResult = requireWalletAuth(body, "campaign:update", params.id);
 *   if (!authResult.success) {
 *     return authResult.errorResponse;
 *   }
 *
 *   // Proceed with authorized wallet
 *   const wallet = authResult.wallet;
 * }
 * ```
 */
export function requireWalletAuth(
  body: Record<string, unknown>,
  action: WalletActionType,
  resourceId: string
): WalletAuthResult {
  const auth = extractWalletAuth(body);

  if (!auth) {
    return {
      success: false,
      error: "Missing wallet authorization",
      errorResponse: NextResponse.json(
        {
          error: "Missing wallet authorization",
          message:
            "This action requires a signed message from your wallet. Please provide wallet, message, and signature fields.",
        },
        { status: 401 }
      ),
    };
  }

  return verifyWalletAuth(auth, action, resourceId);
}

/**
 * Check if a wallet matches the expected owner
 * Used after verifying signature to confirm ownership
 */
export function isWalletOwner(
  verifiedWallet: string,
  expectedOwner: string
): boolean {
  return (
    verifiedWallet.toLowerCase() === expectedOwner.toLowerCase() ||
    verifiedWallet === expectedOwner
  );
}
