# BlinkFund Codebase Documentation

**Generated**: December 19, 2025
**Version**: 1.0 (Initial Launch)
**Status**: Production Ready

This document provides hyperspecific details on every significant file in the BlinkFund codebase, how each component works, the backend architecture, and how all pieces connect together.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Configuration](#2-project-configuration)
3. [Database Schema & Models](#3-database-schema--models)
4. [Solana Integration](#4-solana-integration)
5. [API Routes](#5-api-routes)
6. [Campaign System](#6-campaign-system)
7. [Wallet Verification System](#7-wallet-verification-system)
8. [UI Components & Pages](#8-ui-components--pages)
9. [Utilities & Helpers](#9-utilities--helpers)
10. [Data Flow Diagrams](#10-data-flow-diagrams)
11. [Security Considerations](#11-security-considerations)
12. [Deployment Guide](#12-deployment-guide)

---

## 1. Project Overview

### What is BlinkFund?

BlinkFund is a Solana Actions (Blinks) crowdfunding platform that enables creators to run real crowdfunding campaigns with goals, deadlines, and progress tracking. Donations are processed directly through Solana Blinks, making it possible for supporters to contribute directly from X (Twitter) feeds using Phantom, Backpack, or other Solana wallet adapters.

### Key Features

- **Campaign-Based Funding**: Time-bound campaigns with SOL goals and deadlines
- **Blinks Integration**: Donate directly from X/Twitter via Solana Actions
- **Wallet Verification**: Ed25519 signature-based ownership proof
- **Progress Tracking**: Real-time donation tracking and progress bars
- **Non-Custodial**: All funds transfer directly to creator wallets
- **Platform Fee**: Mandatory 2% platform fee on all donations (collected by platform operator)

### Target Users

- **Creators**: Project founders, content creators, open-source developers
- **Donors**: Solana community members who want to support projects
- **Organizations**: DAOs and communities running fundraising campaigns

### Tech Stack Summary

| Layer         | Technology                       |
| ------------- | -------------------------------- |
| Framework     | Next.js 16 (App Router)          |
| Language      | TypeScript (strict mode)         |
| Database      | PostgreSQL (Neon serverless)     |
| ORM           | Drizzle ORM                      |
| Blockchain    | Solana Web3.js                   |
| Actions       | Solana Actions (@solana/actions) |
| Wallets       | Solana Wallet Adapter            |
| Cryptography  | TweetNaCl (Ed25519)              |
| UI Components | Shadcn UI + Tailwind CSS         |
| Validation    | Zod                              |
| Hosting       | Vercel                           |

### Directory Structure

```
crypto_proj/
├── src/
│   ├── app/                           # Next.js App Router pages & API routes
│   │   ├── api/                       # API routes
│   │   │   ├── actions/donate/        # Solana Actions endpoint
│   │   │   ├── campaigns/             # Campaign CRUD
│   │   │   ├── creator/               # Creator endpoints
│   │   │   ├── donations/             # Donation management
│   │   │   └── wallet/                # Wallet verification
│   │   ├── campaign/[slug]/           # Public campaign pages
│   │   ├── create/                    # Campaign creation wizard
│   │   ├── dashboard/                 # Creator dashboard
│   │   ├── donate/                    # Fallback donation page
│   │   └── actions.json/              # Solana Actions manifest
│   ├── components/                    # React components
│   │   ├── campaigns/                 # Campaign UI components
│   │   ├── dashboard/                 # Dashboard components
│   │   ├── solana/                    # Wallet provider
│   │   ├── wallet/                    # Wallet verification
│   │   └── ui/                        # Shadcn UI components
│   ├── db/                            # Database configuration
│   │   ├── schema/                    # Drizzle schema definitions
│   │   │   ├── campaigns.ts           # Campaigns table
│   │   │   ├── donations.ts           # Donations table
│   │   │   └── wallet-verifications.ts # Wallet verifications
│   │   └── index.ts                   # Database connection
│   ├── lib/                           # Business logic & utilities
│   │   ├── campaigns/                 # Campaign validation & queries
│   │   ├── donations/                 # Donation queries
│   │   ├── solana/                    # Solana utilities
│   │   ├── config.ts                  # App configuration
│   │   └── utils.ts                   # General utilities
│   └── emails/                        # React Email templates
├── drizzle/                           # Database migrations
├── public/                            # Static assets
├── package.json                       # Dependencies
├── next.config.ts                     # Next.js configuration
├── drizzle.config.ts                  # Drizzle configuration
└── PRD.md                             # Product requirements
```

---

## 2. Project Configuration

### 2.1 package.json

**Location**: `crypto_proj/package.json`

**Key Scripts**:

```json
{
  "dev": "concurrently \"next dev\" \"inngest-cli dev -p 8288\" \"npx react-email dev --dir ./src/emails --port 3001\"",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "db:generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

- `dev`: Runs Next.js dev server + Inngest background jobs + React Email preview
- `db:push`: Push schema changes to database
- `db:studio`: Open Drizzle Studio for database inspection

**Key Dependencies**:

| Package                    | Purpose                 |
| -------------------------- | ----------------------- |
| `next@16.0.7`              | React framework         |
| `react@19.2.0`             | UI library              |
| `@solana/web3.js@1.98.4`   | Solana blockchain SDK   |
| `@solana/actions@1.6.6`    | Solana Actions (Blinks) |
| `@solana/wallet-adapter-*` | Wallet integration      |
| `drizzle-orm@0.38.4`       | Database ORM            |
| `postgres@3.4.7`           | PostgreSQL client       |
| `zod@3.24.2`               | Schema validation       |
| `tweetnacl@1.0.3`          | Ed25519 cryptography    |
| `date-fns@4.1.0`           | Date manipulation       |
| `sonner@1.7.4`             | Toast notifications     |

### 2.2 next.config.ts

**Location**: `crypto_proj/next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
```

**Key Points**:

- Allows remote images from any HTTPS domain (for campaign images)
- Enables flexible image URLs for user-uploaded content

### 2.3 tsconfig.json

**Location**: `crypto_proj/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- **Path Alias**: `@/` maps to `src/` for clean imports
- **Strict Mode**: Full TypeScript strict checking enabled

### 2.4 drizzle.config.ts

**Location**: `crypto_proj/drizzle.config.ts`

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- **Migrations Output**: `./drizzle/` directory
- **Schema Location**: `./src/db/schema/*.ts`
- **Dialect**: PostgreSQL (Neon serverless)

### 2.5 src/lib/config.ts

**Location**: `crypto_proj/src/lib/config.ts`

**Purpose**: Application-wide configuration exported as `appConfig`.

```typescript
export const appConfig: AppConfigPublic = {
  projectName: "BlinkFund",
  projectSlug: "blinkfund",
  keywords: [
    "Solana",
    "Blinks",
    "crowdfunding",
    "Solana Actions",
    "crypto fundraising",
    // ... SEO keywords
  ],
  description:
    "Run real crowdfunding campaigns with goals, deadlines, and progress tracking...",
  auth: {
    enablePasswordAuth: false,
  },
  email: {
    senderName: "BlinkFund",
    senderEmail: process.env.EMAIL_FROM || "noreply@example.com",
  },
  legal: {
    address: {
      /* ... */
    },
    email: "support@example.com",
    phone: "+1 (555) 000-0000",
  },
  social: {
    twitter: "https://twitter.com/blinkfund",
  },
};
```

---

## 3. Database Schema & Models

**Location**: `crypto_proj/src/db/schema/`

### 3.1 Database Connection

**File**: `src/db/index.ts`

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL not set. Database operations will fail.");
}

const client = connectionString
  ? postgres(connectionString, { prepare: false })
  : (null as unknown as ReturnType<typeof postgres>);

export const db = connectionString
  ? drizzle(client)
  : (null as unknown as ReturnType<typeof drizzle>);
```

**Key Points**:

- Uses Neon serverless PostgreSQL
- `prepare: false` for serverless compatibility
- Graceful handling when DATABASE_URL is missing

### 3.2 Campaigns Table

**File**: `src/db/schema/campaigns.ts`

```typescript
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "paused",
  "completed",
  "cancelled",
]);

export const campaigns = pgTable(
  "campaigns",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    slug: text("slug").unique().notNull(),
    creatorWallet: text("creator_wallet").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    goalLamports: numeric("goal_lamports", {
      precision: 20,
      scale: 0,
    }).notNull(),
    raisedLamports: numeric("raised_lamports", { precision: 20, scale: 0 })
      .notNull()
      .default("0"),
    donationCount: numeric("donation_count", { precision: 20, scale: 0 })
      .notNull()
      .default("0"),
    deadline: timestamp("deadline", { mode: "date" }).notNull(),
    status: campaignStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { mode: "date" }),
  },
  (table) => [
    index("campaigns_creator_wallet_idx").on(table.creatorWallet),
    index("campaigns_status_idx").on(table.status),
    index("campaigns_slug_idx").on(table.slug),
  ],
);
```

**Fields Explained**:

| Field            | Type      | Purpose                                     |
| ---------------- | --------- | ------------------------------------------- |
| `id`             | UUID      | Primary key (auto-generated)                |
| `slug`           | text      | URL-friendly identifier for public pages    |
| `creatorWallet`  | text      | Verified Solana wallet address              |
| `title`          | text      | Campaign title (3-100 characters)           |
| `description`    | text      | Campaign description (optional)             |
| `imageUrl`       | text      | Campaign image URL (optional)               |
| `goalLamports`   | numeric   | Funding goal in lamports                    |
| `raisedLamports` | numeric   | Total amount raised                         |
| `donationCount`  | numeric   | Number of donations received                |
| `deadline`       | timestamp | Campaign end date/time                      |
| `status`         | enum      | draft, active, paused, completed, cancelled |
| `createdAt`      | timestamp | Creation timestamp                          |
| `updatedAt`      | timestamp | Last modification timestamp                 |
| `publishedAt`    | timestamp | When campaign went active                   |

**Campaign Status Lifecycle**:

```
draft (created) → active (published) → [paused ↔ resumed] → completed/cancelled
```

**Indexes**:

- `campaigns_creator_wallet_idx`: Fast lookup by creator
- `campaigns_status_idx`: Fast filtering by status
- `campaigns_slug_idx`: Fast slug lookup

### 3.3 Donations Table

**File**: `src/db/schema/donations.ts`

```typescript
export const donationStatusEnum = pgEnum("donation_status", [
  "pending",
  "confirmed",
  "failed",
]);

export const donations = pgTable(
  "donations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    donorWallet: text("donor_wallet").notNull(),
    amountLamports: numeric("amount_lamports", {
      precision: 20,
      scale: 0,
    }).notNull(),
    platformFeeLamports: numeric("platform_fee_lamports", {
      precision: 20,
      scale: 0,
    }).notNull(),
    creatorLamports: numeric("creator_lamports", {
      precision: 20,
      scale: 0,
    }).notNull(),
    txSignature: text("tx_signature").unique(),
    status: donationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { mode: "date" }),
  },
  (table) => [
    index("donations_campaign_id_idx").on(table.campaignId),
    index("donations_donor_wallet_idx").on(table.donorWallet),
    index("donations_tx_signature_idx").on(table.txSignature),
    index("donations_status_idx").on(table.status),
  ],
);
```

**Fields Explained**:

| Field                 | Type      | Purpose                               |
| --------------------- | --------- | ------------------------------------- |
| `id`                  | UUID      | Primary key                           |
| `campaignId`          | text      | Foreign key to campaign               |
| `donorWallet`         | text      | Donor's Solana wallet address         |
| `amountLamports`      | numeric   | Total donation amount                 |
| `platformFeeLamports` | numeric   | Platform fee portion (2%)             |
| `creatorLamports`     | numeric   | Creator's portion after fee           |
| `txSignature`         | text      | Solana transaction signature (unique) |
| `status`              | enum      | pending, confirmed, failed            |
| `createdAt`           | timestamp | When donation was created             |
| `confirmedAt`         | timestamp | When transaction confirmed            |

**Donation Flow**:

```
pending (created) → confirmed (tx mined) / failed
```

### 3.4 Wallet Verifications Table

**File**: `src/db/schema/wallet-verifications.ts`

```typescript
export const walletVerifications = pgTable(
  "wallet_verifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    walletAddress: text("wallet_address").unique().notNull(),
    signedMessage: text("signed_message").notNull(),
    signature: text("signature").notNull(),
    verifiedAt: timestamp("verified_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "date" }),
  },
  (table) => [
    index("wallet_verifications_wallet_address_idx").on(table.walletAddress),
  ],
);
```

**Fields Explained**:

| Field           | Type      | Purpose                           |
| --------------- | --------- | --------------------------------- |
| `id`            | UUID      | Primary key                       |
| `walletAddress` | text      | Verified wallet address (unique)  |
| `signedMessage` | text      | Original challenge message        |
| `signature`     | text      | Base64-encoded Ed25519 signature  |
| `verifiedAt`    | timestamp | When verification occurred        |
| `expiresAt`     | timestamp | Expiration date (30 days default) |

**Purpose**:

- Proves wallet ownership before campaign creation
- Prevents wallet impersonation in campaigns
- 30-day expiration enforces periodic re-verification

---

## 4. Solana Integration

### 4.1 Core Configuration

**File**: `src/lib/solana/config.ts`

```typescript
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export { LAMPORTS_PER_SOL };

export const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";

export const SOLANA_CONFIG = {
  PLATFORM_WALLET: process.env.NEXT_PUBLIC_PLATFORM_WALLET || SYSTEM_PROGRAM_ID,
  PLATFORM_FEE_PERCENT: 0.02, // 2%
  AMOUNT_PRESETS: [0.1, 0.5, 1, 5], // SOL
  MIN_AMOUNT: 0.001, // SOL
  MAX_AMOUNT: 100, // SOL
  DEFAULT_TITLE: "Support This Project",
  DEFAULT_DESCRIPTION: "Help fund this project with a donation",
  DEFAULT_IMAGE:
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://blinkfund.vercel.app/images/og.png",
  CLUSTER:
    (process.env.NEXT_PUBLIC_SOLANA_CLUSTER as "devnet" | "mainnet-beta") ||
    "mainnet-beta",
  RPC_URL:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com",
};
```

**Key Constants**:

| Constant               | Value            | Purpose                        |
| ---------------------- | ---------------- | ------------------------------ |
| `LAMPORTS_PER_SOL`     | 1,000,000,000    | Conversion factor              |
| `PLATFORM_FEE_PERCENT` | 0.02 (2%)        | Mandatory fee on all donations |
| `AMOUNT_PRESETS`       | [0.1, 0.5, 1, 5] | Quick donation buttons         |
| `MIN_AMOUNT`           | 0.001 SOL        | Minimum donation               |
| `MAX_AMOUNT`           | 100 SOL          | Maximum donation               |
| `SYSTEM_PROGRAM_ID`    | 111...111        | Cannot receive donations       |

### 4.2 Wallet Signature Verification

**File**: `src/lib/solana/signature.ts`

**Purpose**: Ed25519 signature-based wallet ownership proof.

```typescript
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";

export function generateChallengeMessage(walletAddress: string): string {
  const nonce = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  return `Sign this message to verify ownership of ${walletAddress}

This signature is used to authenticate your wallet for BlinkFund.
This request will not trigger a blockchain transaction or cost any fees.

Nonce: ${nonce}
Timestamp: ${timestamp}`;
}

export function verifyWalletSignature(
  message: string,
  signature: Uint8Array | string,
  walletAddress: string,
): boolean {
  try {
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);

    let signatureBytes: Uint8Array;
    if (typeof signature === "string") {
      // Try base64 first, then base58
      try {
        signatureBytes = base64ToSignature(signature);
      } catch {
        signatureBytes = bs58.decode(signature);
      }
    } else {
      signatureBytes = signature;
    }

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes(),
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

export function signatureToBase64(signature: Uint8Array): string {
  return Buffer.from(signature).toString("base64");
}

export function base64ToSignature(base64: string): Uint8Array {
  return new Uint8Array(Buffer.from(base64, "base64"));
}
```

**Key Functions**:

| Function                     | Purpose                                           |
| ---------------------------- | ------------------------------------------------- |
| `generateChallengeMessage()` | Creates unique challenge with nonce and timestamp |
| `verifyWalletSignature()`    | Verifies Ed25519 signature using TweetNaCl        |
| `signatureToBase64()`        | Convert Uint8Array to base64 for storage          |
| `base64ToSignature()`        | Convert base64 back to Uint8Array                 |

### 4.3 Transaction Building

**File**: `src/lib/solana/transaction.ts` (referenced from `src/lib/solana/index.ts`)

```typescript
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { SOLANA_CONFIG, LAMPORTS_PER_SOL } from "./config";

export interface FeeCalculation {
  totalLamports: bigint;
  platformFeeLamports: bigint;
  creatorLamports: bigint;
}

export function calculateFeeSplit(amountSol: number): FeeCalculation {
  const totalLamports = BigInt(Math.floor(amountSol * LAMPORTS_PER_SOL));
  const platformFeeLamports = BigInt(
    Math.floor(Number(totalLamports) * SOLANA_CONFIG.PLATFORM_FEE_PERCENT),
  );
  const creatorLamports = totalLamports - platformFeeLamports;

  return {
    totalLamports,
    platformFeeLamports,
    creatorLamports,
  };
}

export function getConnection(): Connection {
  return new Connection(SOLANA_CONFIG.RPC_URL, "confirmed");
}

export async function buildDonationTransaction(params: {
  donor: PublicKey;
  creator: PublicKey;
  amountSol: number;
}): Promise<Transaction> {
  const { donor, creator, amountSol } = params;
  const { totalLamports, platformFeeLamports, creatorLamports } =
    calculateFeeSplit(amountSol);

  const connection = getConnection();
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();

  const transaction = new Transaction({
    recentBlockhash: blockhash,
    lastValidBlockHeight,
    feePayer: donor,
  });

  // Transfer to creator
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: donor,
      toPubkey: creator,
      lamports: creatorLamports,
    }),
  );

  // Transfer platform fee (REQUIRED - platform wallet must be configured)
  const platformWallet = SOLANA_CONFIG.PLATFORM_WALLET;
  if (platformWallet !== SYSTEM_PROGRAM_ID && platformFeeLamports > 0n) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: donor,
        toPubkey: new PublicKey(platformWallet),
        lamports: platformFeeLamports,
      }),
    );
  }

  return transaction;
}

export function formatLamportsToSol(
  lamports: bigint | string | number,
): string {
  const num = typeof lamports === "bigint" ? lamports : BigInt(lamports);
  return (Number(num) / LAMPORTS_PER_SOL).toFixed(4);
}
```

**Key Functions**:

| Function                     | Purpose                                             |
| ---------------------------- | --------------------------------------------------- |
| `calculateFeeSplit()`        | Calculates total, platform fee, and creator amounts |
| `getConnection()`            | Returns Solana Connection to configured RPC         |
| `buildDonationTransaction()` | Creates transaction with fee split transfers        |
| `formatLamportsToSol()`      | Formats lamports to SOL with 4 decimal places       |

**Fee Model**:

- **2% platform fee** is charged on ALL donations
- Fee is calculated as: `platformFeeLamports = floor(totalLamports * 0.02)`
- Creator receives: `totalLamports - platformFeeLamports` (98% of donation)
- Platform receives: `platformFeeLamports` (2% of donation)
- `NEXT_PUBLIC_PLATFORM_WALLET` **must** be set for fee collection to work

### 4.4 Wallet Validation

**File**: `src/lib/solana/validation.ts`

```typescript
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import { SOLANA_CONFIG, SYSTEM_PROGRAM_ID } from "./config";

export function validateWalletAddress(address: string): PublicKey | null {
  try {
    // Basic format check
    if (!address || address.length < 32 || address.length > 44) {
      return null;
    }

    // Reject system program address
    if (address === SYSTEM_PROGRAM_ID) {
      return null;
    }

    // Validate as PublicKey (checks Ed25519 curve)
    const publicKey = new PublicKey(address);
    if (!PublicKey.isOnCurve(publicKey.toBytes())) {
      return null;
    }

    return publicKey;
  } catch {
    return null;
  }
}

export function validateAmount(amountStr: string): number | null {
  const amount = parseFloat(amountStr);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  if (amount < SOLANA_CONFIG.MIN_AMOUNT || amount > SOLANA_CONFIG.MAX_AMOUNT) {
    return null;
  }

  return amount;
}

// Client-side validation (no web3.js dependency)
export function isValidSolanaAddressFormat(address: string): boolean {
  if (!address || typeof address !== "string") return false;
  if (address.length < 32 || address.length > 44) return false;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

// Zod schemas for API validation
export const campaignParamsSchema = z.object({
  wallet: z.string().min(32).max(44).optional(),
  title: z.string().max(100).optional(),
  desc: z.string().max(500).optional(),
  image: z.string().url().optional(),
  amount: z.string().optional(),
});

export const postBodySchema = z.object({
  account: z.string().min(32).max(44),
});
```

**Validation Rules**:

| Check          | Rule                        |
| -------------- | --------------------------- |
| Address length | 32-44 characters            |
| Address format | Base58 characters only      |
| Curve check    | Must be on Ed25519 curve    |
| System program | Cannot be system program ID |
| Amount range   | 0.001 - 100 SOL             |
| Amount type    | Positive, finite number     |

### 4.5 Types

**File**: `src/lib/solana/types.ts`

```typescript
import { PublicKey, Transaction } from "@solana/web3.js";

export interface FeeCalculation {
  totalLamports: bigint;
  platformFeeLamports: bigint;
  creatorLamports: bigint;
}

export interface DonationTransactionParams {
  donor: PublicKey;
  creator: PublicKey;
  amountSol: number;
}

export interface CampaignParams {
  wallet?: string;
  title?: string;
  desc?: string;
  image?: string;
  amount?: string;
}

export interface DonationResult {
  transaction: Transaction;
  message: string;
  feeCalculation: FeeCalculation;
}
```

---

## 5. API Routes

### 5.1 Route Organization

```
src/app/api/
├── actions/
│   └── donate/
│       └── route.ts           # Solana Actions endpoint (GET/POST)
├── campaigns/
│   └── [id]/
│       ├── route.ts           # GET/PATCH/DELETE single campaign
│       ├── pause/route.ts     # POST pause campaign
│       ├── publish/route.ts   # POST publish campaign
│       └── resume/route.ts    # POST resume campaign
│   └── route.ts               # GET list / POST create campaigns
├── creator/
│   └── campaigns/
│       └── route.ts           # GET creator's campaigns with stats
├── donations/
│   └── confirm/
│       └── route.ts           # POST confirm donation
└── wallet/
    └── route.ts               # GET challenge / POST verify
```

### 5.2 Solana Actions API

**Endpoint**: `GET/POST /api/actions/donate`

**File**: `src/app/api/actions/donate/route.ts`

**Purpose**: Solana Actions (Blinks) endpoint for donations.

**Supports Two Modes**:

1. **Legacy URL-Based Mode** (Stateless)

   - Query params: `wallet`, `title`, `desc`, `image`, `amount`
   - No database storage
   - Direct transfer to specified wallet

2. **Campaign-Based Mode** (Persistent)
   - Query param: `campaign` (campaign ID), `amount`
   - Database-backed with donation tracking
   - Progress tracking and updates

**GET Request Flow**:

```typescript
export const GET = async (req: NextRequest) => {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign");

  if (campaignId) {
    // Campaign mode: fetch from database
    const campaign = await getCampaignById(campaignId);
    if (!campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: ACTIONS_CORS_HEADERS,
      });
    }

    const raisedSol = lamportsToSol(campaign.raisedLamports);
    const goalSol = lamportsToSol(campaign.goalLamports);
    const progressPercent = Math.min((raisedSol / goalSol) * 100, 100);

    const actionResponse: ActionGetResponse = {
      type: "action",
      title: campaign.title,
      icon: campaign.imageUrl || SOLANA_CONFIG.DEFAULT_IMAGE,
      description:
        `${campaign.description || ""}\n\n` +
        `Progress: ${raisedSol.toFixed(2)} / ${goalSol.toFixed(2)} SOL (${progressPercent.toFixed(0)}%)`,
      label: "Donate",
      links: {
        actions: SOLANA_CONFIG.AMOUNT_PRESETS.map((amount) => ({
          label: `${amount} SOL`,
          href: `/api/actions/donate?campaign=${campaignId}&amount=${amount}`,
          type: "post" as const,
        })),
      },
    };

    return new Response(JSON.stringify(actionResponse), {
      status: 200,
      headers: {
        ...ACTIONS_CORS_HEADERS,
        "Cache-Control": "public, max-age=30", // 30 seconds for campaigns
      },
    });
  }

  // Legacy mode: use URL params
  // ... (similar structure with URL params)
};
```

**POST Request Flow**:

```typescript
export const POST = async (req: NextRequest) => {
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign");
  const amountParam = url.searchParams.get("amount");

  const body = await req.json();
  const { account } = postBodySchema.parse(body);

  const donor = validateWalletAddress(account);
  if (!donor) {
    return new Response(JSON.stringify({ error: "Invalid donor wallet" }), {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  const amount = validateAmount(amountParam || "0.1");
  if (!amount) {
    return new Response(JSON.stringify({ error: "Invalid amount" }), {
      status: 400,
      headers: ACTIONS_CORS_HEADERS,
    });
  }

  if (campaignId) {
    // Campaign mode
    const campaign = await getCampaignById(campaignId);
    const creator = new PublicKey(campaign.creatorWallet);

    // Create donation record
    const feeCalc = calculateFeeSplit(amount);
    await createDonation({
      campaignId,
      donorWallet: account,
      amountLamports: feeCalc.totalLamports.toString(),
      platformFeeLamports: feeCalc.platformFeeLamports.toString(),
      creatorLamports: feeCalc.creatorLamports.toString(),
    });

    // Build transaction
    const transaction = await buildDonationTransaction({
      donor,
      creator,
      amountSol: amount,
    });

    const serialized = transaction
      .serialize({ requireAllSignatures: false })
      .toString("base64");

    return new Response(
      JSON.stringify({
        type: "transaction",
        transaction: serialized,
        message: `Donating ${amount} SOL to ${campaign.title}`,
      }),
      {
        status: 200,
        headers: ACTIONS_CORS_HEADERS,
      },
    );
  }

  // Legacy mode: direct transfer
  // ...
};
```

**Response Formats**:

GET Response (ActionGetResponse):

```typescript
{
  type: "action",
  title: string,
  icon: string,
  description: string,
  label: "Donate",
  links: {
    actions: [
      { label: "0.1 SOL", href: "...", type: "post" },
      { label: "0.5 SOL", href: "...", type: "post" },
      { label: "1 SOL", href: "...", type: "post" },
      { label: "5 SOL", href: "...", type: "post" }
    ]
  }
}
```

POST Response (ActionPostResponse):

```typescript
{
  type: "transaction",
  transaction: "<base64-encoded-transaction>",
  message: "Donating 0.5 SOL to Campaign Title"
}
```

### 5.3 Campaign Management APIs

#### **POST `/api/campaigns`** - Create Campaign

**Requirements**:

- Wallet must be verified (valid signature on file)
- Verification must not be expired

**Request Body**:

```typescript
{
  wallet: string,           // Verified wallet address
  title: string,           // 3-100 characters
  description?: string,    // Max 2000 characters
  imageUrl?: string,       // Valid URL
  goalSol: number,        // 0.1 - 100,000 SOL
  deadline: string        // ISO datetime, must be future
}
```

**Response**:

```typescript
{
  id: string,
  slug: string,
  creatorWallet: string,
  title: string,
  description: string,
  imageUrl: string,
  goalSol: number,
  raisedSol: number,
  status: "draft",
  deadline: string,
  createdAt: string
}
```

#### **GET `/api/campaigns`** - List Campaigns

**Query Params**:

```typescript
{
  status?: "draft" | "active" | "paused" | "completed" | "cancelled",
  wallet?: string,    // Filter by creator
  limit?: number,     // 1-100, default 20
  offset?: number     // Default 0
}
```

**Response**:

```typescript
{
  campaigns: Array<{
    id: string,
    slug: string,
    title: string,
    description: string,
    imageUrl: string,
    creatorWallet: string,
    goalSol: number,
    raisedSol: number,
    progressPercent: number,
    donationCount: number,
    deadline: string,
    daysRemaining: number,
    status: string,
    createdAt: string,
    url: string
  }>,
  total: number,
  limit: number,
  offset: number
}
```

#### **GET `/api/campaigns/[id]`** - Get Campaign Details

**Supports both ID and slug lookup**

**Response includes calculated stats**:

- `progressPercent`: (raised / goal) \* 100
- `daysRemaining`: Days until deadline
- `isExpired`: Boolean
- `isGoalReached`: Boolean

#### **PATCH `/api/campaigns/[id]`** - Update Campaign

**Requires wallet ownership verification**

**Request Body**:

```typescript
{
  wallet: string,      // For ownership verification
  title?: string,
  description?: string,
  imageUrl?: string
}
```

#### **DELETE `/api/campaigns/[id]`** - Cancel Campaign

**Query Param**: `wallet` (ownership verification)

Changes status to `cancelled`

#### **POST `/api/campaigns/[id]/publish`** - Publish Campaign

**Request Body**: `{ wallet: string }`

Changes status: `draft` → `active`

**Validations**:

- Campaign must be in draft status
- Deadline must be in future
- Wallet must be verified

#### **POST `/api/campaigns/[id]/pause`** - Pause Campaign

Changes status: `active` → `paused`

#### **POST `/api/campaigns/[id]/resume`** - Resume Campaign

Changes status: `paused` → `active`

### 5.4 Wallet Verification APIs

**File**: `src/app/api/wallet/route.ts`

#### **GET `/api/wallet/challenge`** - Get Challenge Message

**Query Param**: `wallet`

**Response**:

```typescript
{
  message: string,     // Challenge with nonce and timestamp
  nonce: string,       // Unique identifier (extracted from message)
  wallet: string       // Echo back wallet
}
```

#### **POST `/api/wallet/verify`** - Verify Signature

**Request Body**:

```typescript
{
  wallet: string,      // Wallet address
  message: string,     // Original challenge message
  signature: string    // Base64-encoded signature
}
```

**Response (Success)**:

```typescript
{
  verified: true,
  wallet: string,
  verifiedAt: string,     // ISO timestamp
  expiresAt: string       // ISO timestamp (30 days from now)
}
```

**Database Operations**:

- Upserts wallet verification record
- Sets expiration to 30 days
- Subsequent verifications update existing record

#### **GET `/api/wallet/verify`** - Check Verification Status

**Query Param**: `wallet`

**Response**:

```typescript
{
  verified: boolean,
  wallet: string,
  verifiedAt?: string,
  expiresAt?: string,
  expired?: boolean
}
```

### 5.5 Creator APIs

#### **GET `/api/creator/campaigns`** - Get Creator's Campaigns

**Query Param**: `wallet`

**Response**:

```typescript
{
  campaigns: Array<Campaign>,
  stats: {
    totalCampaigns: number,
    activeCampaigns: number,
    totalRaisedSol: number,
    totalDonations: number
  }
}
```

### 5.6 Donation APIs

#### **POST `/api/donations/confirm`** - Confirm Donation

**Request Body**:

```typescript
{
  donationId: string,
  txSignature: string
}
```

**Updates**:

- Changes donation status to `confirmed`
- Updates campaign `raisedLamports` and `donationCount`
- Records transaction signature

### 5.7 Actions Manifest

**File**: `src/app/actions.json/route.ts`

```typescript
import { ACTIONS_CORS_HEADERS, ActionsJson } from "@solana/actions";
import { NextResponse } from "next/server";

export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      {
        pathPattern: "/api/actions/donate**",
        apiPath: "/api/actions/donate",
      },
    ],
  };

  return NextResponse.json(payload, {
    headers: {
      ...ACTIONS_CORS_HEADERS,
      "Cache-Control": "public, max-age=3600", // 1 hour
    },
  });
};

export const OPTIONS = GET;
```

---

## 6. Campaign System

### 6.1 Campaign Validation

**File**: `src/lib/campaigns/validation.ts`

```typescript
import { z } from "zod";

export const createCampaignSchema = z.object({
  wallet: z.string().min(32).max(44),
  title: z.string().min(3).max(100),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  goalSol: z.number().min(0.1).max(100000),
  deadline: z.string().datetime(),
});

export const updateCampaignSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
});

export const campaignQuerySchema = z.object({
  status: z
    .enum(["draft", "active", "paused", "completed", "cancelled"])
    .optional(),
  wallet: z.string().min(32).max(44).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignQueryInput = z.infer<typeof campaignQuerySchema>;
```

### 6.2 Campaign Utilities

```typescript
import { LAMPORTS_PER_SOL } from "../solana/config";

export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}

export function lamportsToSol(lamports: string | bigint | number): number {
  const value =
    typeof lamports === "string" ? BigInt(lamports) : BigInt(lamports);
  return Number(value) / LAMPORTS_PER_SOL;
}

export function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const suffix = crypto.randomUUID().slice(0, 6);
  return `${baseSlug}-${suffix}`;
}
```

### 6.3 Campaign Queries

**File**: `src/lib/campaigns/queries.ts`

**Database Operations**:

```typescript
// Create new campaign
export async function createCampaign(data: NewCampaign): Promise<Campaign>;

// Get campaign by ID
export async function getCampaignById(id: string): Promise<Campaign | null>;

// Get campaign by slug
export async function getCampaignBySlug(slug: string): Promise<Campaign | null>;

// List campaigns with filters and pagination
export async function listCampaigns(query: CampaignQueryInput): Promise<{
  campaigns: Campaign[];
  total: number;
}>;

// Update campaign
export async function updateCampaign(
  id: string,
  data: Partial<Campaign>,
): Promise<Campaign | null>;

// Publish campaign (draft → active)
export async function publishCampaign(id: string): Promise<Campaign | null>;

// Cancel campaign
export async function cancelCampaign(id: string): Promise<Campaign | null>;

// Pause campaign (active → paused)
export async function pauseCampaign(id: string): Promise<Campaign | null>;

// Resume campaign (paused → active)
export async function resumeCampaign(id: string): Promise<Campaign | null>;

// Update raised amount (after donation confirmation)
export async function updateCampaignRaisedAmount(
  id: string,
  additionalLamports: bigint,
): Promise<Campaign | null>;

// Get all campaigns by creator wallet
export async function getCampaignsByWallet(wallet: string): Promise<Campaign[]>;

// Check if slug is available
export async function isSlugAvailable(slug: string): Promise<boolean>;

// Get campaign with calculated stats
export async function getCampaignWithStats(
  id: string,
): Promise<CampaignWithStats | null>;
```

**Calculated Stats**:

```typescript
interface CampaignWithStats extends Campaign {
  progressPercent: number; // (raised / goal) * 100
  daysRemaining: number; // Days until deadline
  isExpired: boolean; // deadline <= now
  isGoalReached: boolean; // raised >= goal
  goalSol: number; // Goal in SOL
  raisedSol: number; // Raised in SOL
}
```

---

## 7. Wallet Verification System

### 7.1 Verification Flow

```
1. User clicks "Verify Wallet" button
2. Frontend calls GET /api/wallet/challenge?wallet={address}
3. Server generates unique challenge with nonce and timestamp
4. Frontend encodes message as bytes
5. Wallet signs message (user approves in extension)
6. Frontend gets base64 signature
7. Frontend POSTs to /api/wallet/verify with wallet, message, signature
8. Server verifies Ed25519 signature using TweetNaCl
9. Server upserts wallet verification record (30-day expiry)
10. Frontend shows "Wallet Verified" success state
```

### 7.2 Challenge Message Format

```
Sign this message to verify ownership of {walletAddress}

This signature is used to authenticate your wallet for BlinkFund.
This request will not trigger a blockchain transaction or cost any fees.

Nonce: {uuid}
Timestamp: {iso-timestamp}
```

### 7.3 Verification Record

**Expiration**: 30 days from verification

**Stored Data**:

- Wallet address (unique constraint)
- Original signed message
- Base64-encoded signature
- Verification timestamp
- Expiration timestamp

**Verification Check**:

```typescript
const verification = await db
  .select()
  .from(walletVerifications)
  .where(eq(walletVerifications.walletAddress, wallet));

if (!verification.length) {
  return { verified: false };
}

const record = verification[0];
const expired = record.expiresAt && new Date(record.expiresAt) < new Date();

return {
  verified: !expired,
  expired,
  verifiedAt: record.verifiedAt,
  expiresAt: record.expiresAt,
};
```

---

## 8. UI Components & Pages

### 8.1 Campaign Components

**Location**: `src/components/campaigns/`

#### **ProgressBar.tsx**

```typescript
interface ProgressBarProps {
  raised: number; // SOL raised
  goal: number; // SOL goal
  className?: string;
}
```

**Features**:

- Visual progress bar with percentage
- Shows "X.XX / Y.YY SOL" format
- "Goal reached!" message when complete
- Color: green when complete, primary otherwise

#### **DeadlineCountdown.tsx**

```typescript
interface DeadlineCountdownProps {
  deadline: Date;
  className?: string;
}
```

**Features**:

- Real-time countdown (updates every second)
- Shows: days, hours, minutes, seconds
- Orange highlight when < 3 days remaining
- Red "Campaign ended" message when expired

#### **DonationList.tsx**

```typescript
interface DonationListProps {
  campaignId: string;
  limit?: number; // Default 10
}
```

**Features**:

- Displays recent confirmed donations
- Shows donor wallet (abbreviated)
- Amount in SOL
- Link to Solana Explorer
- Relative timestamp

#### **ShareButtons.tsx**

```typescript
interface ShareButtonsProps {
  campaignUrl: string;
  campaignTitle: string;
}
```

**Features**:

- Twitter/X share button with pre-filled text
- Copy link to clipboard with toast notification
- Dialog for Blink URL sharing

### 8.2 Dashboard Components

**Location**: `src/components/dashboard/`

#### **CampaignStats.tsx**

**Stats Cards**:

- Total campaigns count
- Active campaigns count
- Total raised (SOL)
- Total donations

#### **DonationTable.tsx**

**Features**:

- Paginated table of donations
- Sortable columns
- Status filter
- Amount and date display

### 8.3 Wallet Component

**File**: `src/components/wallet/WalletSignatureVerify.tsx`

```typescript
interface WalletSignatureVerifyProps {
  onVerified: (wallet: string) => void;
  onError?: (error: string) => void;
}
```

**States**:

- `idle`: Waiting for action
- `loading`: Fetching challenge
- `signing`: Wallet signing
- `verifying`: Server verification
- `verified`: Success
- `error`: Failed verification

**UI Flow**:

```
1. Show wallet connection state (WalletMultiButton)
2. Display wallet address (abbreviated)
3. "Verify Ownership" button
4. Loading states for each step
5. Success checkmark on verified
6. Error message display
```

### 8.4 Provider Components

#### **Providers.tsx** (`src/app/Providers.tsx`)

```typescript
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <WalletProvider>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              success: "bg-green-500 text-white",
              error: "bg-red-500 text-white",
            },
          }}
        />
      </WalletProvider>
    </ThemeProvider>
  );
}
```

#### **WalletProvider.tsx** (`src/components/solana/WalletProvider.tsx`)

```typescript
"use client";

import {
  ConnectionProvider,
  WalletProvider as SolanaWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";
import { SOLANA_CONFIG } from "@/lib/solana/config";

import "@solana/wallet-adapter-react-ui/styles.css";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => {
    return SOLANA_CONFIG.RPC_URL || clusterApiUrl(SOLANA_CONFIG.CLUSTER);
  }, []);

  const wallets = useMemo(() => [], []); // Auto-detect wallets

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
}
```

### 8.5 Pages

#### **Home Page** (`src/app/page.tsx`)

**Sections**:

1. **Header**: Logo, Dashboard link, Network indicator, CTA button
2. **Hero**: Main value proposition with animated SOL icon
3. **Value Props**: Goals, Deadlines, Verified - 3 feature cards
4. **How It Works**: 3-step process flow
5. **Features**: 6 detailed feature cards
6. **Donation Presets**: Preview of donation amounts
7. **Final CTA**: Call to action
8. **Footer**: Links, status, branding

#### **Create Campaign Page** (`src/app/create/page.tsx`)

**Multi-Step Wizard (4 steps)**:

**Step 1: Verify Wallet**

- Uses `WalletSignatureVerify` component
- Proves wallet ownership before proceeding

**Step 2: Campaign Details**

- Title input (3-100 chars)
- Description textarea (max 2000 chars)
- Goal input (0.1-100,000 SOL)
- Deadline picker (must be future)
- Image URL input (optional)
- Real-time character counters
- Validation error display

**Step 3: Preview**

- Card preview of campaign
- Shows title, description, goal, deadline
- Edit button to return to step 2

**Step 4: Success**

- Success message with campaign details
- Copy campaign URL button
- View campaign link
- Dashboard link

#### **Campaign Page** (`src/app/campaign/[slug]/page.tsx`)

**Server Component** (for SEO):

- Dynamic metadata (title, description, OG)
- Fetches campaign by slug
- Passes data to client component

**Client Component** (`client.tsx`):

- Progress sidebar with percentage
- Deadline countdown
- Donation count
- Donate button (if active)
- About section (description)
- Recent donations list
- Share buttons

#### **Dashboard Page** (`src/app/dashboard/page.tsx`)

**Requires Connected Wallet**:

- Prompts connection if not connected

**Dashboard Content**:

- Header with "New Campaign" button
- Stats cards (campaigns, active, raised, donations)
- Campaign list with:
  - Title and status badge
  - Progress bar and percentage
  - Donation count
  - Days remaining
  - Action buttons

#### **Donate Fallback** (`src/app/donate/page.tsx`)

For non-wallet users who land on Blink:

- Explanation of what Blinks are
- Instructions to use wallet
- Link to campaigns list

---

## 9. Utilities & Helpers

### 9.1 General Utilities

**File**: `src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 9.2 Donation Queries

**File**: `src/lib/donations/queries.ts`

```typescript
// Create new donation record
export async function createDonation(data: NewDonation): Promise<Donation>;

// Get donation by ID
export async function getDonationById(id: string): Promise<Donation | null>;

// Get donation by transaction signature
export async function getDonationByTxSignature(
  sig: string,
): Promise<Donation | null>;

// List donations for a campaign
export async function getDonationsByCampaign(
  campaignId: string,
  options?: { limit?: number; offset?: number },
): Promise<{ donations: Donation[]; total: number }>;

// Confirm donation (update status and tx signature)
export async function confirmDonation(
  id: string,
  txSignature: string,
): Promise<Donation | null>;

// Mark donation as failed
export async function failDonation(id: string): Promise<Donation | null>;

// Get confirmed donations for display
export async function getConfirmedDonations(
  campaignId: string,
  limit?: number,
): Promise<Donation[]>;
```

### 9.3 API Response Helpers

**File**: `src/lib/api/response.ts` (if exists)

Standard response patterns used across API routes:

```typescript
// Success response
return NextResponse.json({ data }, { status: 200 });

// Error response
return NextResponse.json(
  { error: "Error message", details: "..." },
  { status: 400 },
);

// Solana Actions response with CORS
return new Response(JSON.stringify(payload), {
  status: 200,
  headers: ACTIONS_CORS_HEADERS,
});
```

---

## 10. Data Flow Diagrams

### 10.1 Campaign Creation Flow

```
┌─────────────────┐
│  User visits    │
│  /create page   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Connect Wallet │──NO──│  Show connection │
│  (Phantom, etc) │      │  prompt          │
└────────┬────────┘      └──────────────────┘
         │ YES
         ▼
┌─────────────────┐
│  Click "Verify" │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GET /api/wallet │
│ /challenge      │
│ ?wallet=...     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sign message   │
│  in wallet      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/wallet│
│ /verify         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Fill campaign  │
│  details form   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Preview card   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/      │
│ campaigns       │
│ (creates draft) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/      │
│ campaigns/[id]/ │
│ publish         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Success page   │
│  with URLs      │
└─────────────────┘
```

### 10.2 Donation Flow (Campaign-Based)

```
┌─────────────────┐
│  User sees Blink│
│  in X/Twitter   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GET /api/actions│
│ /donate?campaign│
│ =<id>           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Wallet renders │
│  Action card    │
│  with presets   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User taps      │
│  "0.5 SOL"      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/      │
│ actions/donate  │
│ ?campaign=...   │
│ &amount=0.5     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create pending │
│  donation record│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build TX with  │
│  fee split:     │
│  - Creator: 98% │
│  - Platform: 2% │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Return base64  │
│  transaction    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Wallet shows   │
│  TX summary     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User signs TX  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TX broadcasts  │
│  to Solana      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/      │
│ donations/      │
│ confirm         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Update:        │
│  - Donation     │
│  - Campaign     │
│    raised amt   │
└─────────────────┘
```

### 10.3 Wallet Verification Flow

```
┌─────────────────┐
│  User clicks    │
│  "Verify"       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GET /api/wallet │
│ /challenge      │
│ ?wallet=<addr>  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Server creates │
│  challenge with │
│  nonce & time   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend gets  │
│  message bytes  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Wallet prompts │
│  user to sign   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User approves  │
│  signature      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Frontend gets  │
│  base64 sig     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/wallet│
│ /verify         │
│ {wallet, msg,   │
│  signature}     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Server verifies│
│  Ed25519 sig    │
│  via TweetNaCl  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Valid?  │
    └────┬────┘
    YES  │  NO
    ▼    ▼
┌─────┐ ┌─────┐
│Upsrt│ │Error│
│ DB  │ │ 400 │
└──┬──┘ └─────┘
   │
   ▼
┌─────────────────┐
│  Return success │
│  with expiry    │
│  (30 days)      │
└─────────────────┘
```

---

## 11. Security Considerations

### 11.1 Wallet Verification

- **Ed25519 Signatures**: Using TweetNaCl for cryptographic verification
- **Challenge Messages**: Include nonce and timestamp to prevent replay attacks
- **30-Day Expiration**: Enforces periodic re-verification
- **No Private Keys**: Server never holds or sees private keys

### 11.2 Input Validation

- **Zod Schemas**: All API inputs validated with strict schemas
- **Wallet Validation**: Checks format, length, and Ed25519 curve
- **Amount Bounds**: Enforced range (0.001 - 100 SOL)
- **Campaign Fields**: Size limits on title, description, URL

### 11.3 Database Security

- **Parameterized Queries**: Via Drizzle ORM (no SQL injection)
- **Foreign Key Constraints**: Proper referential integrity
- **Unique Constraints**: On slugs, tx signatures, wallet verifications
- **Indexes**: Optimized for common query patterns

### 11.4 API Security

- **CORS Headers**: Proper Solana Actions CORS compliance
- **Ownership Checks**: Verify wallet ownership before modifications
- **Verification Status**: Check before campaign operations
- **Error Messages**: Clear but don't expose internals

### 11.5 Non-Custodial Design

- **Direct Transfers**: Funds go directly to creator wallets
- **No Server Signing**: All transactions signed by users
- **Platform Fee**: Mandatory 2% fee collected on every donation
- **Transparent**: All transactions visible on Solana Explorer

### 11.6 Transaction Security

- **Fee Payer**: Always the donor (prevents fee manipulation)
- **Recent Blockhash**: Transactions include recent blockhash for expiry
- **Dual Transfer**: Separate transfers for creator and platform
- **System Program**: Rejected as donation target

---

## 12. Deployment Guide

### 12.1 Environment Variables

**Required**:

```env
DATABASE_URL=postgresql://...@neon.tech/dbname?sslmode=require

# Platform wallet for collecting 2% fee on all donations (REQUIRED)
NEXT_PUBLIC_PLATFORM_WALLET=<your-solana-wallet>
```

**Optional**:

```env

# Network configuration
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta  # or "devnet"
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# App URLs for OG images and campaign links
NEXT_PUBLIC_APP_URL=https://blinkfund.vercel.app
NEXT_PUBLIC_BASE_URL=https://blinkfund.vercel.app

# Email (for future notifications)
EMAIL_FROM=noreply@blinkfund.io
```

### 12.2 Database Setup

```bash
# Generate migrations
pnpm db:generate

# Push schema to database
pnpm db:push

# Open studio for inspection
pnpm db:studio
```

### 12.3 Vercel Deployment

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy (automatic on push to main)
4. Verify `/actions.json` is accessible

### 12.4 Testing Checklist

- [ ] Wallet connection works
- [ ] Wallet verification completes
- [ ] Campaign creation succeeds
- [ ] Campaign page renders correctly
- [ ] Actions endpoint returns valid response
- [ ] Donations process correctly
- [ ] Progress updates after donation

### 12.5 Blinks Testing

Use Dialect's Blink viewer for testing:

- **Devnet**: `https://dial.to/devnet?action=solana-action:https://your-app.vercel.app/api/actions/donate`
- **Mainnet**: `https://dial.to/?action=solana-action:https://your-app.vercel.app/api/actions/donate`

---

## Quick Reference

### Key Constants

| Constant            | Value                |
| ------------------- | -------------------- |
| Platform Fee        | 2%                   |
| Min Donation        | 0.001 SOL            |
| Max Donation        | 100 SOL              |
| Campaign Goal Range | 0.1 - 100,000 SOL    |
| Verification Expiry | 30 days              |
| Donation Presets    | [0.1, 0.5, 1, 5] SOL |
| Lamports per SOL    | 1,000,000,000        |

### Key File Locations

| Purpose             | File                                  |
| ------------------- | ------------------------------------- |
| App config          | `src/lib/config.ts`                   |
| Solana config       | `src/lib/solana/config.ts`            |
| DB connection       | `src/db/index.ts`                     |
| Campaign schema     | `src/db/schema/campaigns.ts`          |
| Donation schema     | `src/db/schema/donations.ts`          |
| Actions endpoint    | `src/app/api/actions/donate/route.ts` |
| Campaign queries    | `src/lib/campaigns/queries.ts`        |
| Wallet verification | `src/lib/solana/signature.ts`         |

### API Endpoints Summary

| Endpoint                      | Method           | Purpose                    |
| ----------------------------- | ---------------- | -------------------------- |
| `/api/actions/donate`         | GET/POST         | Solana Actions             |
| `/api/campaigns`              | GET/POST         | List/Create campaigns      |
| `/api/campaigns/[id]`         | GET/PATCH/DELETE | Campaign CRUD              |
| `/api/campaigns/[id]/publish` | POST             | Publish campaign           |
| `/api/campaigns/[id]/pause`   | POST             | Pause campaign             |
| `/api/campaigns/[id]/resume`  | POST             | Resume campaign            |
| `/api/wallet/challenge`       | GET              | Get verification challenge |
| `/api/wallet/verify`          | GET/POST         | Check/Submit verification  |
| `/api/creator/campaigns`      | GET              | Creator's campaigns        |
| `/api/donations/confirm`      | POST             | Confirm donation           |
| `/actions.json`               | GET              | Solana Actions manifest    |

---

_This documentation covers the complete BlinkFund codebase as of December 2025. For the latest changes, always refer to the source code directly._
