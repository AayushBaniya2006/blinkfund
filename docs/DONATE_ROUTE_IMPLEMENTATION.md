# Donate Route Implementation Guide

This document provides a **line-by-line breakdown** of the donate API route and its supporting files. Perfect for beginners learning Solana Actions/Blinks.

---

## Table of Contents

1. [File Structure Overview](#file-structure-overview)
2. [Configuration (`src/lib/solana/config.ts`)](#1-configuration)
3. [Types (`src/lib/solana/types.ts`)](#2-types)
4. [Validation (`src/lib/solana/validation.ts`)](#3-validation)
5. [Transaction Building (`src/lib/solana/transaction.ts`)](#4-transaction-building)
6. [Main Route (`src/app/api/actions/donate/route.ts`)](#5-main-route)
7. [Data Flow Diagram](#data-flow-diagram)
8. [Common Patterns Explained](#common-patterns-explained)

---

## File Structure Overview

```
src/
├── app/
│   └── api/
│       └── actions/
│           └── donate/
│               └── route.ts          # ← Main API handlers (GET/POST/OPTIONS)
└── lib/
    └── solana/
        ├── index.ts                  # ← Re-exports everything
        ├── config.ts                 # ← Platform settings
        ├── types.ts                  # ← TypeScript interfaces
        ├── validation.ts             # ← Input validators
        └── transaction.ts            # ← Transaction builders
```

---

## 1. Configuration

**File:** `src/lib/solana/config.ts`

This file contains all platform-wide settings.

```typescript
/**
 * Solana Platform Configuration
 * All platform-wide settings for the micro-crowdfund Blink platform
 */

// Lamports per SOL (1 SOL = 1 billion lamports)
export const LAMPORTS_PER_SOL = BigInt(1_000_000_000);
```

### What this does:

- `BigInt(1_000_000_000)` - Uses BigInt for large numbers (JavaScript numbers lose precision above 2^53)
- Lamports = smallest unit of SOL (like cents to dollars, but 1 billion to 1)

```typescript
export const SOLANA_CONFIG = {
  // Platform wallet for fee collection (from env or devnet test wallet)
  PLATFORM_WALLET:
    process.env.NEXT_PUBLIC_PLATFORM_WALLET ||
    "11111111111111111111111111111111",
```

### What this does:

- `process.env.NEXT_PUBLIC_PLATFORM_WALLET` - Reads from environment variable
- `NEXT_PUBLIC_` prefix means it's available client-side
- Fallback `"111..."` is the System Program (placeholder, means no fee collection)

```typescript
  // Platform fee percentage (2%)
  PLATFORM_FEE_PERCENT: 0.02,
```

### What this does:

- 0.02 = 2% of each donation goes to platform
- Math: `fee = totalAmount * 0.02`

```typescript
  // Donation amount presets in SOL
  AMOUNT_PRESETS: [0.1, 0.5, 1, 5] as const,
```

### What this does:

- Buttons shown on the Blink card: "Donate 0.1 SOL", "Donate 0.5 SOL", etc.
- `as const` makes it a readonly tuple (TypeScript type safety)

```typescript
  // Min/max donation bounds in SOL
  MIN_AMOUNT: 0.001,
  MAX_AMOUNT: 100,
```

### What this does:

- Prevents spam (tiny donations) and mistakes (huge donations)
- 0.001 SOL ≈ $0.0002 at current prices

```typescript
  // Default campaign metadata
  DEFAULT_TITLE: "Support This Project",
  DEFAULT_DESCRIPTION: "Help fund this project with a donation",
  DEFAULT_IMAGE: process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/images/og.png`
    : "https://blinkfund.vercel.app/images/og.png",
```

### What this does:

- Fallback values when creator doesn't provide custom metadata
- Image URL shown on the Blink card

```typescript
  // Cluster configuration
  CLUSTER: (process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "devnet") as
    | "devnet"
    | "mainnet-beta",

  // RPC URL (devnet default)
  RPC_URL:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com",
} as const;
```

### What this does:

- `CLUSTER` - Which network to use (devnet = test money, mainnet = real money)
- `RPC_URL` - Server endpoint to communicate with Solana blockchain
- Default to devnet to prevent accidents with real money

```typescript
// System program ID (cannot be used as donation destination)
export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
```

### What this does:

- Blocklist for wallet validation
- System Program is a special Solana account, can't receive donations

---

## 2. Types

**File:** `src/lib/solana/types.ts`

TypeScript interfaces that describe data shapes.

```typescript
import type { PublicKey } from "@solana/web3.js";

// Re-export from @solana/actions for convenience
export type {
  ActionGetResponse, // Shape of GET response
  ActionPostResponse, // Shape of POST response
  ActionPostRequest, // Shape of POST request body
} from "@solana/actions";
```

### What this does:

- `PublicKey` - Solana wallet address type
- Re-exports official Solana Actions types for consistency

```typescript
/**
 * Campaign configuration passed via URL params
 */
export interface CampaignParams {
  wallet?: string; // Creator's Solana wallet (required for POST)
  title?: string; // Campaign title
  desc?: string; // Campaign description
  image?: string; // Campaign image URL
  amount?: string; // Donation amount (required for POST)
}
```

### What this does:

- Describes URL parameters: `?wallet=ABC&title=MyProject&amount=0.5`
- All optional with `?` - validation happens later

```typescript
/**
 * Fee calculation result
 */
export interface FeeCalculation {
  totalLamports: bigint; // Full donation amount
  platformFeeLamports: bigint; // Platform's cut
  creatorLamports: bigint; // Creator's cut
}
```

### What this does:

- Returned by `calculateFeeSplit()` function
- Uses `bigint` for precision with large numbers

```typescript
/**
 * Donation transaction params
 */
export interface DonationTransactionParams {
  donor: PublicKey; // Who's paying
  creator: PublicKey; // Who's receiving
  amountSol: number; // How much (in SOL)
}
```

### What this does:

- Input for `buildDonationTransaction()` function
- `PublicKey` type ensures valid Solana addresses

---

## 3. Validation

**File:** `src/lib/solana/validation.ts`

Functions that validate user input.

```typescript
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { SOLANA_CONFIG, SYSTEM_PROGRAM_ID } from "./config";
```

### What this does:

- `PublicKey` - Solana's wallet address class
- `z` (zod) - Schema validation library (like type checking at runtime)

```typescript
/**
 * Validates a Solana wallet address string
 * Returns PublicKey if valid, null if invalid
 */
export function validateWalletAddress(address: string): PublicKey | null {
  try {
    // Check basic format (base58, 32-44 chars)
    if (!address || address.length < 32 || address.length > 44) {
      return null;
    }
```

### What this does:

- Early return pattern - fail fast
- Solana addresses are 32-44 characters in base58 encoding
- Returns `null` for invalid (not throwing = easier error handling)

```typescript
const pubkey = new PublicKey(address);
```

### What this does:

- `new PublicKey()` tries to parse the string
- Throws if invalid base58 encoding

```typescript
// Reject system program address (cannot receive donations)
if (pubkey.toBase58() === SYSTEM_PROGRAM_ID) {
  return null;
}
```

### What this does:

- Blocklist check
- System program can't receive transfers

```typescript
// Validate it's on the ed25519 curve
if (!PublicKey.isOnCurve(pubkey.toBytes())) {
  return null;
}
```

### What this does:

- Cryptographic validation
- "On curve" means it's a valid public key mathematically
- Some addresses are valid base58 but not valid cryptographic keys

```typescript
    return pubkey;
  } catch {
    return null;
  }
}
```

### What this does:

- Catch any parsing errors
- Return `null` instead of crashing

---

### Amount Validation

```typescript
/**
 * Validates donation amount
 * Returns parsed number if valid, null if invalid
 */
export function validateAmount(amountStr: string): number | null {
  const amount = parseFloat(amountStr);

  // Check for NaN, Infinity, negative, zero
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
```

### What this does:

- `parseFloat()` - Converts string "0.5" to number 0.5
- `Number.isFinite()` - Returns false for NaN, Infinity, -Infinity
- Rejects zero and negative amounts

```typescript
  // Check bounds
  if (amount < SOLANA_CONFIG.MIN_AMOUNT || amount > SOLANA_CONFIG.MAX_AMOUNT) {
    return null;
  }

  return amount;
}
```

### What this does:

- Enforce min/max from config
- Return validated number

---

### Zod Schemas

```typescript
// Zod schema for URL parameter validation
export const campaignParamsSchema = z.object({
  wallet: z.string().optional(),
  title: z.string().max(100).optional(),
  desc: z.string().max(500).optional(),
  image: z.string().url().optional().or(z.literal("")),
  amount: z.string().optional(),
});
```

### What this does:

- Zod = runtime type validation (TypeScript only checks at compile time)
- `z.string().max(100)` - String with max 100 characters
- `z.string().url()` - Must be valid URL format
- `.optional()` - Field can be missing
- `.or(z.literal(""))` - Also accept empty string

```typescript
// Zod schema for POST body validation
export const postBodySchema = z.object({
  account: z.string().min(32).max(44),
});
```

### What this does:

- Validates the POST request body `{ "account": "..." }`
- `account` is the donor's wallet address (32-44 chars)

---

## 4. Transaction Building

**File:** `src/lib/solana/transaction.ts`

Functions that create Solana transactions.

```typescript
import {
  Connection, // Talk to Solana network
  PublicKey, // Wallet addresses
  Transaction, // Container for instructions
  SystemProgram, // Built-in program for transfers
} from "@solana/web3.js";
import { SOLANA_CONFIG, LAMPORTS_PER_SOL } from "./config";
import type { FeeCalculation, DonationTransactionParams } from "./types";
```

---

### Fee Calculation

```typescript
/**
 * Calculate fee split for a donation
 * Fee: floor(totalLamports * FEE_PCT)
 * Creator: total - fee
 */
export function calculateFeeSplit(amountSol: number): FeeCalculation {
  const totalLamports = BigInt(Math.floor(amountSol * Number(LAMPORTS_PER_SOL)));
```

### What this does:

- Convert SOL to lamports: `0.5 SOL → 500,000,000 lamports`
- `Math.floor()` rounds down to whole lamports
- `BigInt()` for precise large number handling

```typescript
const platformFeeLamports = BigInt(
  Math.floor(Number(totalLamports) * SOLANA_CONFIG.PLATFORM_FEE_PERCENT),
);
const creatorLamports = totalLamports - platformFeeLamports;
```

### What this does:

- Calculate 2% fee: `500,000,000 * 0.02 = 10,000,000 lamports`
- Creator gets the rest: `500,000,000 - 10,000,000 = 490,000,000 lamports`

```typescript
  return {
    totalLamports,
    platformFeeLamports,
    creatorLamports,
  };
}
```

### Example:

```
Input:  0.5 SOL
Output: {
  totalLamports: 500000000n,      // 0.5 SOL
  platformFeeLamports: 10000000n, // 0.01 SOL (2%)
  creatorLamports: 490000000n     // 0.49 SOL (98%)
}
```

---

### Connection Factory

```typescript
/**
 * Create connection to Solana cluster
 */
export function getConnection(): Connection {
  return new Connection(SOLANA_CONFIG.RPC_URL, "confirmed");
}
```

### What this does:

- `Connection` - HTTP client for Solana RPC API
- `"confirmed"` - Wait for transaction to be confirmed (not just processed)

---

### Transaction Builder

```typescript
/**
 * Build donation transaction with two transfers:
 * 1. Creator wallet receives (total - fee)
 * 2. Platform wallet receives fee (if fee > 0)
 */
export async function buildDonationTransaction(
  params: DonationTransactionParams
): Promise<Transaction> {
  const { donor, creator, amountSol } = params;

  const fees = calculateFeeSplit(amountSol);
```

### What this does:

- `async` because it needs to fetch blockchain data
- Destructure parameters for cleaner code
- Calculate the fee split first

```typescript
// Validate creator receives > 0
if (fees.creatorLamports <= BigInt(0)) {
  throw new Error("Donation amount too small after fee deduction");
}
```

### What this does:

- Edge case protection
- If donation is tiny, fee might eat it all
- Throw error instead of sending zero to creator

```typescript
const transaction = new Transaction();
```

### What this does:

- Create empty transaction container
- Will add "instructions" (transfer commands) to it

```typescript
// Transfer to creator (main donation)
transaction.add(
  SystemProgram.transfer({
    fromPubkey: donor, // Who sends money
    toPubkey: creator, // Who receives money
    lamports: fees.creatorLamports, // How much
  }),
);
```

### What this does:

- `SystemProgram.transfer()` creates a transfer instruction
- This is the main donation to the campaign creator
- `transaction.add()` appends the instruction

```typescript
// Transfer platform fee (if > 0 and platform wallet is configured)
if (
  fees.platformFeeLamports > BigInt(0) &&
  SOLANA_CONFIG.PLATFORM_WALLET !== "11111111111111111111111111111111"
) {
  const platformWallet = new PublicKey(SOLANA_CONFIG.PLATFORM_WALLET);
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: donor,
      toPubkey: platformWallet,
      lamports: fees.platformFeeLamports,
    }),
  );
}
```

### What this does:

- Second transfer for platform fee
- Only adds if:
  1. Fee is greater than 0 lamports
  2. Platform wallet is actually configured (not the placeholder)
- Creates a second instruction in the same transaction

```typescript
// Get recent blockhash for transaction
const connection = getConnection();
const { blockhash, lastValidBlockHeight } =
  await connection.getLatestBlockhash();
```

### What this does:

- `blockhash` - Recent block hash (proves transaction is recent)
- `lastValidBlockHeight` - Transaction expires after this block
- Prevents replay attacks (resubmitting old transactions)

```typescript
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = donor;

  return transaction;
}
```

### What this does:

- Attach metadata to transaction
- `feePayer = donor` - Donor pays the Solana network fee (~0.000005 SOL)
- Return the complete (but unsigned) transaction

---

## 5. Main Route

**File:** `src/app/api/actions/donate/route.ts`

The API handlers that wallets interact with.

### Imports

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  ActionGetResponse,
  ACTIONS_CORS_HEADERS,
  createPostResponse,
} from "@solana/actions";
import {
  SOLANA_CONFIG,
  validateWalletAddress,
  validateAmount,
  campaignParamsSchema,
  postBodySchema,
  buildDonationTransaction,
  calculateFeeSplit,
} from "@/lib/solana";
```

### What this does:

- `NextRequest/NextResponse` - Next.js API types
- `ActionGetResponse` - Solana Actions response format
- `ACTIONS_CORS_HEADERS` - Required headers for cross-origin requests
- `createPostResponse` - Helper to build POST response with transaction
- Everything else from our solana lib

---

### OPTIONS Handler (CORS)

```typescript
/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: ACTIONS_CORS_HEADERS,
  });
}
```

### What this does:

- Browsers send OPTIONS request before POST (CORS preflight)
- Just returns 200 with required headers
- Without this, browsers block the actual request

---

### GET Handler

```typescript
/**
 * GET handler - Returns ActionGetResponse with preset donation buttons
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);
```

### What this does:

- Parse URL: `?wallet=ABC&title=Test` → `{ wallet: "ABC", title: "Test" }`
- `Object.fromEntries()` converts URLSearchParams to plain object

```typescript
// Parse and validate params
const parseResult = campaignParamsSchema.safeParse(rawParams);
if (!parseResult.success) {
  return NextResponse.json(
    { error: "Invalid request parameters" },
    { status: 400, headers: ACTIONS_CORS_HEADERS },
  );
}

const params = parseResult.data;
```

### What this does:

- `safeParse()` returns `{ success: true, data }` or `{ success: false, error }`
- If invalid, return 400 error WITH CORS headers (important!)
- Extract validated data from result

```typescript
// Validate wallet if provided
if (params.wallet) {
  const validWallet = validateWalletAddress(params.wallet);
  if (!validWallet) {
    return NextResponse.json(
      { error: 'Invalid "wallet" address' },
      { status: 400, headers: ACTIONS_CORS_HEADERS },
    );
  }
}
```

### What this does:

- Additional wallet validation (cryptographic check)
- Zod only checked string format, this checks if it's a real Solana address

```typescript
// Use defaults for missing metadata
const title = params.title || SOLANA_CONFIG.DEFAULT_TITLE;
const description = params.desc || SOLANA_CONFIG.DEFAULT_DESCRIPTION;
const image = params.image || SOLANA_CONFIG.DEFAULT_IMAGE;
```

### What this does:

- Fill in defaults for missing fields
- Campaign can work with just a wallet address

```typescript
// Build base URL for action links
const baseUrl = new URL(req.url);
baseUrl.search = ""; // Clear existing params
```

### What this does:

- Get the current URL
- Clear query string so we can build fresh ones

```typescript
// Generate action links for preset amounts
const actions = SOLANA_CONFIG.AMOUNT_PRESETS.map((amount) => {
  const actionUrl = new URL(baseUrl);
  if (params.wallet) actionUrl.searchParams.set("wallet", params.wallet);
  if (params.title) actionUrl.searchParams.set("title", params.title);
  if (params.desc) actionUrl.searchParams.set("desc", params.desc);
  if (params.image) actionUrl.searchParams.set("image", params.image);
  actionUrl.searchParams.set("amount", amount.toString());

  return {
    label: `Donate ${amount} SOL`,
    href: actionUrl.toString(),
    type: "post" as const,
  };
});
```

### What this does:

- Create a button for each preset amount (0.1, 0.5, 1, 5 SOL)
- Each button has a URL with all params + specific amount
- `type: "post"` means clicking triggers a POST request
- Result: Array of 4 button definitions

```typescript
const response: ActionGetResponse = {
  type: "action",
  title,
  icon: image,
  description,
  label: "Donate",
  links: { actions },
};

return NextResponse.json(response, {
  headers: {
    ...ACTIONS_CORS_HEADERS,
    "Cache-Control": "public, max-age=60", // Cache for 1 minute
  },
});
```

### What this does:

- Build the official Solana Actions response format
- Wallet reads this and renders a card with buttons
- Add caching header (GET responses can be cached)

```typescript
  } catch (error) {
    console.error("GET /api/actions/donate error:", error);
    return NextResponse.json(
      { error: "Invalid request parameters" },
      { status: 400, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
```

### What this does:

- Catch-all error handler
- Log for debugging (Vercel logs)
- Return 400 with CORS headers (never expose internal errors)

---

### POST Handler

```typescript
/**
 * POST handler - Builds and returns donation transaction
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawParams = Object.fromEntries(searchParams);

    // Parse URL params
    const parseResult = campaignParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request parameters" },
        { status: 400, headers: ACTIONS_CORS_HEADERS }
      );
    }

    const params = parseResult.data;
```

### What this does:

- Same parameter parsing as GET
- POST also receives params via URL query string

```typescript
// Wallet is required for POST
if (!params.wallet) {
  return NextResponse.json(
    { error: 'Missing required "wallet" parameter' },
    { status: 400, headers: ACTIONS_CORS_HEADERS },
  );
}

// Amount is required for POST
if (!params.amount) {
  return NextResponse.json(
    { error: 'Missing required "amount" parameter' },
    { status: 400, headers: ACTIONS_CORS_HEADERS },
  );
}
```

### What this does:

- POST requires wallet AND amount (to build transaction)
- GET only needs them optionally (for display)

```typescript
// Validate creator wallet
const creatorWallet = validateWalletAddress(params.wallet);
if (!creatorWallet) {
  return NextResponse.json(
    { error: 'Invalid "wallet" address' },
    { status: 400, headers: ACTIONS_CORS_HEADERS },
  );
}

// Validate amount
const amountSol = validateAmount(params.amount);
if (amountSol === null) {
  return NextResponse.json(
    {
      error: `Invalid "amount": must be between ${SOLANA_CONFIG.MIN_AMOUNT} and ${SOLANA_CONFIG.MAX_AMOUNT} SOL`,
    },
    { status: 400, headers: ACTIONS_CORS_HEADERS },
  );
}
```

### What this does:

- Cryptographic wallet validation
- Amount bounds checking
- `amountSol` is now a validated number

```typescript
// Parse request body for donor account
let body: unknown;
try {
  body = await req.json();
} catch {
  return NextResponse.json(
    { error: "Invalid JSON body" },
    { status: 400, headers: ACTIONS_CORS_HEADERS },
  );
}

const bodyParseResult = postBodySchema.safeParse(body);
if (!bodyParseResult.success) {
  return NextResponse.json(
    { error: 'Invalid "account" in request body' },
    { status: 400, headers: ACTIONS_CORS_HEADERS },
  );
}

const { account } = bodyParseResult.data;
```

### What this does:

- Wallet sends POST body: `{ "account": "DONOR_ADDRESS" }`
- Parse JSON body
- Validate with Zod schema
- Extract `account` (donor's wallet address)

```typescript
// Validate donor wallet
const donorWallet = validateWalletAddress(account);
if (!donorWallet) {
  return NextResponse.json(
    { error: 'Invalid "account" in request body' },
    { status: 400, headers: ACTIONS_CORS_HEADERS },
  );
}
```

### What this does:

- Validate the donor's wallet too
- Now we have two validated PublicKeys: `creatorWallet` and `donorWallet`

```typescript
// Build transaction
const transaction = await buildDonationTransaction({
  donor: donorWallet,
  creator: creatorWallet,
  amountSol,
});
```

### What this does:

- Call the transaction builder we made earlier
- Returns a Transaction object with 1-2 transfer instructions
- `await` because it fetches blockhash from network

```typescript
// Calculate fees for message
const fees = calculateFeeSplit(amountSol);
const feePercent = (SOLANA_CONFIG.PLATFORM_FEE_PERCENT * 100).toFixed(0);
const campaignTitle = params.title || "this project";

// Log for debugging (no PII)
console.log(
  `[Donate] cluster=${SOLANA_CONFIG.CLUSTER} amount=${amountSol} fee=${feePercent}%`,
);
```

### What this does:

- Calculate fees again for display message
- `(0.02 * 100).toFixed(0)` → "2" (for "2% fee" message)
- Log without personal info (addresses truncated/omitted)

```typescript
// Create response with transaction and message
const response = await createPostResponse({
  fields: {
    type: "transaction",
    transaction,
    message: `Donating ${amountSol} SOL to ${campaignTitle} (${feePercent}% platform fee)`,
  },
});

return NextResponse.json(response, { headers: ACTIONS_CORS_HEADERS });
```

### What this does:

- `createPostResponse()` serializes the transaction
- Returns `{ transaction: "base64...", message: "..." }`
- Wallet displays message and asks user to sign

```typescript
  } catch (error) {
    console.error("POST /api/actions/donate error:", error);

    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes("too small")) {
        return NextResponse.json(
          { error: error.message },
          { status: 400, headers: ACTIONS_CORS_HEADERS }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500, headers: ACTIONS_CORS_HEADERS }
    );
  }
}
```

### What this does:

- Error handling with specific messages
- "too small" error from transaction builder → 400
- Everything else → 500 (internal server error)
- Always include CORS headers!

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CREATOR FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Creator visits /create page                                             │
│       │                                                                  │
│       ▼                                                                  │
│  Fills form: wallet + title + desc + image                               │
│       │                                                                  │
│       ▼                                                                  │
│  Generates URL:                                                          │
│  https://app.com/api/actions/donate?wallet=ABC&title=MyProject          │
│       │                                                                  │
│       ▼                                                                  │
│  Shares on Twitter/X                                                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                           DONOR FLOW                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Donor sees Blink URL in Twitter feed                                 │
│       │                                                                  │
│       ▼                                                                  │
│  2. Wallet extension detects Blink URL                                   │
│       │                                                                  │
│       ▼                                                                  │
│  3. Wallet sends GET request to /api/actions/donate?wallet=ABC&...       │
│       │                                                                  │
│       ├──────────────────────────────────────────────────────────────┐   │
│       │                    SERVER (GET)                               │   │
│       │  • Parse URL params                                           │   │
│       │  • Validate wallet format                                     │   │
│       │  • Build ActionGetResponse with preset buttons                │   │
│       │  • Return: { title, icon, description, links: [buttons] }     │   │
│       └──────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  4. Wallet renders card with donation buttons                            │
│       │                                                                  │
│       ▼                                                                  │
│  5. Donor clicks "Donate 0.5 SOL"                                        │
│       │                                                                  │
│       ▼                                                                  │
│  6. Wallet sends POST to /api/actions/donate?wallet=ABC&amount=0.5       │
│     Body: { "account": "DONOR_WALLET" }                                  │
│       │                                                                  │
│       ├──────────────────────────────────────────────────────────────┐   │
│       │                    SERVER (POST)                              │   │
│       │  • Parse & validate URL params (wallet, amount)               │   │
│       │  • Parse & validate body (donor account)                      │   │
│       │  • Calculate fee split (98% creator, 2% platform)             │   │
│       │  • Build Transaction:                                         │   │
│       │    - Instruction 1: Transfer 0.49 SOL to creator              │   │
│       │    - Instruction 2: Transfer 0.01 SOL to platform             │   │
│       │  • Fetch recent blockhash                                     │   │
│       │  • Serialize transaction                                      │   │
│       │  • Return: { transaction: "base64...", message: "..." }       │   │
│       └──────────────────────────────────────────────────────────────┘   │
│       │                                                                  │
│       ▼                                                                  │
│  7. Wallet shows transaction summary to donor                            │
│       │                                                                  │
│       ▼                                                                  │
│  8. Donor signs transaction in wallet                                    │
│       │                                                                  │
│       ▼                                                                  │
│  9. Wallet broadcasts signed transaction to Solana network               │
│       │                                                                  │
│       ▼                                                                  │
│  10. Transaction confirmed → Success!                                    │
│      • Creator receives 0.49 SOL                                         │
│      • Platform receives 0.01 SOL                                        │
│      • Donor paid ~0.000005 SOL network fee                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Common Patterns Explained

### 1. Why BigInt for Lamports?

```typescript
// JavaScript numbers lose precision above 2^53
const badNumber = 9007199254740993; // Actually stores 9007199254740992!

// BigInt handles arbitrary precision
const goodNumber = BigInt(9007199254740993); // Exact ✓
```

### 2. Why Always Return CORS Headers?

```typescript
// Even errors need CORS headers!
return NextResponse.json(
  { error: "Something went wrong" },
  {
    status: 500,
    headers: ACTIONS_CORS_HEADERS, // ← Without this, browser blocks the error
  },
);
```

### 3. The `safeParse` Pattern

```typescript
// BAD: Throws errors you need to catch
const data = schema.parse(input); // Might throw!

// GOOD: Returns result object
const result = schema.safeParse(input);
if (!result.success) {
  return errorResponse(result.error);
}
const data = result.data; // Type-safe!
```

### 4. Transaction Lifecycle

```
Create Transaction → Add Instructions → Set Blockhash → Set Fee Payer → Serialize → Send to Wallet → Wallet Signs → Broadcast → Confirm
```

Our API handles everything up to "Serialize". The wallet does the rest.

---

## Testing the Implementation

### Manual Testing with dial.to

1. Start your dev server: `pnpm dev`
2. Create a campaign URL
3. Test at: `https://dial.to/?action=solana-action:http://localhost:3000/api/actions/donate?wallet=YOUR_WALLET`

### What to Verify

- [ ] GET returns valid JSON with buttons
- [ ] Each button has correct amount in URL
- [ ] POST builds transaction (check network tab)
- [ ] Invalid wallet returns 400 error
- [ ] Invalid amount returns 400 error
- [ ] Transaction has correct transfer amounts

---

## Quick Reference

| Function                     | Input                     | Output            | Purpose                           |
| ---------------------------- | ------------------------- | ----------------- | --------------------------------- |
| `validateWalletAddress()`    | string                    | PublicKey \| null | Validate Solana address           |
| `validateAmount()`           | string                    | number \| null    | Validate donation amount          |
| `calculateFeeSplit()`        | number                    | FeeCalculation    | Split total into creator/platform |
| `buildDonationTransaction()` | DonationTransactionParams | Transaction       | Build unsigned transaction        |
| `getConnection()`            | -                         | Connection        | Create RPC client                 |

---

_Generated for BlinkFund - A Solana Blinks Crowdfunding Platform_
