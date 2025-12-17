/**
 * Solana Platform Configuration
 * All platform-wide settings for the micro-crowdfund Blink platform
 */

// Lamports per SOL (1 SOL = 1 billion lamports)
export const LAMPORTS_PER_SOL = BigInt(1_000_000_000);

// Platform configuration
export const SOLANA_CONFIG = {
  // Platform wallet for fee collection (from env or devnet test wallet)
  PLATFORM_WALLET:
    process.env.NEXT_PUBLIC_PLATFORM_WALLET ||
    "11111111111111111111111111111111",

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
  CLUSTER: (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet") as
    | "devnet"
    | "mainnet-beta",

  // RPC URL (devnet default)
  RPC_URL:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
} as const;

// System program ID (cannot be used as donation destination)
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
