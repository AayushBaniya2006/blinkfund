/**
 * Solana Platform Configuration
 * All platform-wide settings for the micro-crowdfund Blink platform
 */

// Lamports per SOL (1 SOL = 1 billion lamports)
export const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

// System program ID (cannot be used as donation destination)
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

/**
 * Get platform wallet with runtime validation
 * Logs warning in development, throws in production at transaction time
 */
function getPlatformWallet(): string {
  const wallet = process.env.NEXT_PUBLIC_PLATFORM_WALLET;

  // Return configured wallet or System Program placeholder
  if (wallet && wallet !== SYSTEM_PROGRAM_ID) {
    return wallet;
  }

  // In development, log warning but allow startup
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[SOLANA CONFIG] Platform wallet not configured. " +
        "Platform fees will be disabled. " +
        "Set NEXT_PUBLIC_PLATFORM_WALLET for production.",
    );
  }

  return SYSTEM_PROGRAM_ID;
}

// Blockchain IDs for Actions spec
// Mainnet: solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp
// Devnet: solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1
export const BLOCKCHAIN_IDS = {
  "mainnet-beta": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  devnet: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
} as const;

// Current Actions spec version
export const ACTION_VERSION = "2.2";

// Platform configuration
export const SOLANA_CONFIG = {
  // Platform wallet for fee collection
  PLATFORM_WALLET: getPlatformWallet(),

  // Platform fee percentage (2%)
  PLATFORM_FEE_PERCENT: 0.02,

  // Donation amount presets in SOL
  AMOUNT_PRESETS: [0.1, 0.5, 1, 5] as const,

  // Min/max donation bounds in SOL
  MIN_AMOUNT: 0.001,
  MAX_AMOUNT: 100,

  // Default campaign metadata
  DEFAULT_TITLE: "Support This Project",
  DEFAULT_DESCRIPTION: "Help fund this project with a donation",
  DEFAULT_IMAGE: process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`
    : "https://blinkfund.vercel.app/images/og.png",

  // Cluster configuration
  CLUSTER: (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet-beta") as
    | "devnet"
    | "mainnet-beta",

  // RPC URL (mainnet default)
  RPC_URL:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com",

  // RPC request timeout in ms
  RPC_TIMEOUT_MS: 30_000,
} as const;

/**
 * Check if platform fee collection is enabled
 */
export function isPlatformFeeEnabled(): boolean {
  return (
    SOLANA_CONFIG.PLATFORM_WALLET !== SYSTEM_PROGRAM_ID &&
    SOLANA_CONFIG.PLATFORM_FEE_PERCENT > 0
  );
}

/**
 * Validate platform wallet at runtime (call before building transactions)
 * Throws in production if wallet is not properly configured
 */
export function validatePlatformWalletOrThrow(): void {
  if (process.env.NODE_ENV === "production") {
    if (!process.env.NEXT_PUBLIC_PLATFORM_WALLET) {
      throw new Error(
        "CRITICAL: NEXT_PUBLIC_PLATFORM_WALLET must be set in production. " +
          "This is required to collect platform fees.",
      );
    }
    if (process.env.NEXT_PUBLIC_PLATFORM_WALLET === SYSTEM_PROGRAM_ID) {
      throw new Error(
        "CRITICAL: NEXT_PUBLIC_PLATFORM_WALLET cannot be the System Program. " +
          "Transfers to System Program will fail.",
      );
    }
  }
}
