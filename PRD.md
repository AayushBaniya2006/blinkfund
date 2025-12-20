# BlinkFund — Product Requirements Document

## 1. Goal & Overview

BlinkFund is a **multi-project** Solana Actions/Blink crowdfunding platform that lets **anyone** create fundraising campaigns and collect donations directly from X (Twitter) feeds.

### Key Features
- **Campaign Creation**: Creators verify their wallet via cryptographic signature and create persistent campaigns with goals, deadlines, and progress tracking.
- **Solana Blinks**: Wallets render donation UI directly in social feeds; donations are processed via Solana Actions API.
- **Two Donation Modes**:
  - **Campaign-based**: Persistent campaigns with progress tracking, stored in PostgreSQL.
  - **Legacy URL-based**: Stateless tip-jar style donations via URL parameters (backwards compatible).
- **Platform Fee**: Configurable fee (default 2%) split on each donation.
- **Deployment**: Vercel-hosted with Neon PostgreSQL database.

## 2. Success Metrics

- **Time-to-first-campaign**: < 2 minutes including wallet verification.
- **Time-to-first-donation**: < 2 clicks after wallet connect.
- **Transaction success rate**: ≥ 95% (observed via explorer/logs).
- **P95 endpoint latency**: < 500 ms excluding RPC/blockhash calls.
- **Campaign completion rate**: Track campaigns reaching their funding goals.

## 3. Users & Stories

### Donor
- Sees Blink card with campaign info, progress bar, and preset donation buttons.
- Taps once, signs once, funds split (creator + platform fee) with clear summary.
- Can view campaign page with donation history and progress.

### Creator
- Visits `/create`, connects wallet, and signs verification message.
- Enters campaign details: title, description, goal, deadline, image.
- Gets shareable Blink URL and campaign page URL.
- Manages campaigns via `/dashboard`: pause, resume, or cancel.
- Tracks donations and progress in real-time.

### Operator
- Configures platform fee, cluster, min/max donation, presets via environment variables.
- Monitors campaigns and donations via database.

## 4. Scope

### In-Scope
- Campaign CRUD with lifecycle management (draft → active → paused/completed/cancelled)
- Wallet verification via Ed25519 signatures
- Donation Blink via `/api/actions/donate` (GET menu + POST transaction)
- Campaign-based and legacy URL-based donation modes
- Preset donation amounts with fee split
- Campaign progress tracking (raised amount, percentage, time remaining)
- Creator dashboard for campaign management
- Public campaign pages with donation history
- `/actions.json` manifest for Solana Actions discovery
- PostgreSQL database via Drizzle ORM

### Out-of-Scope
- Refunds and escrow
- Fiat on-ramps
- Advanced analytics dashboard
- Email notifications for donations
- Social login (wallet-only authentication)

## 5. Tech Stack & Constraints

### Stack
- **Framework**: Next.js 16 (App Router), TypeScript
- **Database**: PostgreSQL (Neon serverless) + Drizzle ORM
- **Solana**: `@solana/actions`, `@solana/web3.js`, wallet adapters
- **UI**: Tailwind CSS, Shadcn UI
- **Validation**: Zod
- **Hosting**: Vercel (HTTPS required by wallets)

### Constraints
- Solana Actions spec compliance with CORS headers
- Phantom/Backpack wallet compatibility
- URL length ~2000 character limit for legacy mode

## 6. Experience & Flows

### Campaign Creation Flow
1. Creator visits `/create` page.
2. Connects Solana wallet (Phantom, Backpack, etc.).
3. Signs verification message (Ed25519 challenge-response).
4. Enters campaign details:
   - Title (3-100 characters)
   - Description
   - Funding goal (0.1 - 100,000 SOL)
   - Deadline (must be in future)
   - Image URL (optional)
5. Previews campaign card.
6. Clicks "Launch Campaign" to publish.
7. Receives shareable Blink URL and campaign page URL.

### Donation Flow (Campaign-based)
1. User sees Blink link in X feed; wallet renders Action card.
2. Card shows: title, description, image, progress bar, preset buttons.
3. User taps preset donation amount (e.g., 0.1 SOL).
4. Wallet POSTs to `/api/actions/donate?campaign=<id>&amount=<sol>`.
5. API builds transaction with two transfers (creator + platform fee).
6. Wallet shows summary, user signs, transaction broadcasts.
7. Donation recorded in database with "pending" status.
8. Campaign progress updates on confirmation.

### Legacy Donation Flow (Stateless)
1. User visits Blink URL with query params: `?wallet=<address>&title=...&amount=...`.
2. API returns Action card with preset buttons.
3. User selects amount, signs transaction.
4. Funds transfer directly (no database tracking).

### Campaign Management Flow
1. Creator visits `/dashboard`.
2. Views all their campaigns with status and progress.
3. Can pause active campaigns (stops accepting donations).
4. Can resume paused campaigns.
5. Can cancel/delete campaigns.

## 7. Functional Requirements

### Database Schema

#### `campaigns` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| slug | VARCHAR | Unique URL-friendly identifier |
| creatorWallet | VARCHAR | Verified Solana wallet address |
| title | VARCHAR | Campaign title (3-100 chars) |
| description | TEXT | Campaign description |
| imageUrl | VARCHAR | Campaign image URL |
| goalLamports | NUMERIC | Funding goal in lamports |
| raisedLamports | NUMERIC | Total raised in lamports |
| donationCount | INTEGER | Number of donations |
| deadline | DATE | Campaign end date |
| status | ENUM | draft, active, paused, completed, cancelled |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |
| publishedAt | TIMESTAMP | When campaign went active |

#### `donations` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaignId | UUID | Foreign key to campaigns |
| donorWallet | VARCHAR | Donor's Solana address |
| amountLamports | NUMERIC | Total donation in lamports |
| platformFeeLamports | NUMERIC | Platform fee portion |
| creatorLamports | NUMERIC | Creator's portion |
| txSignature | VARCHAR | Solana transaction signature (unique) |
| status | ENUM | pending, confirmed, failed |
| createdAt | TIMESTAMP | Donation timestamp |
| confirmedAt | TIMESTAMP | Confirmation timestamp |

#### `walletVerifications` Table
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| walletAddress | VARCHAR | Verified wallet (unique) |
| signedMessage | TEXT | Challenge message that was signed |
| signature | TEXT | Base64 encoded signature |
| verifiedAt | TIMESTAMP | Verification timestamp |
| expiresAt | TIMESTAMP | Expiration (30 days) |

### API Endpoints

#### GET `/api/actions/donate`
**Query params**:
- Campaign mode: `campaign` (campaign ID)
- Legacy mode: `wallet`, `title`, `desc`, `image`

**Returns**: `ActionGetResponse` with:
- Title, description, image
- Progress info (campaign mode): raised/goal SOL, percentage
- Preset donation buttons linking to POST endpoint

**Caching**: 60s for legacy, 30s for campaigns

#### POST `/api/actions/donate`
**Query params**: `campaign` or `wallet`, `amount` (required)

**Body**: `{ "account": "<donor pubkey>" }`

**Validation**:
- Valid destination wallet (base58, on curve, not system program)
- Valid donor account
- Amount: > 0, within [MIN_AMOUNT, MAX_AMOUNT]
- Campaign exists and is active (campaign mode)

**Transaction**:
- Fee payer: donor wallet
- Instruction 1: Transfer to creator wallet (amount - fee)
- Instruction 2: Transfer to platform wallet (fee)

**Returns**: `ActionPostResponse` with serialized transaction and message

#### GET `/api/wallet/challenge`
**Query params**: `wallet` (required)

**Returns**: Challenge message with nonce and timestamp to sign

#### POST `/api/wallet/verify`
**Body**: `{ wallet, message, signature }`

**Validates**: Ed25519 signature using TweetNaCl

**Returns**: Verification status, stores in database (30-day expiry)

#### Campaign CRUD (`/api/campaigns/*`)
- `POST /api/campaigns` - Create campaign (requires verified wallet)
- `GET /api/campaigns` - List campaigns (filter by wallet, status)
- `GET /api/campaigns/[id]` - Get campaign details
- `PUT /api/campaigns/[id]` - Update campaign
- `DELETE /api/campaigns/[id]` - Cancel campaign
- `POST /api/campaigns/[id]/publish` - Publish draft campaign
- `POST /api/campaigns/[id]/pause` - Pause active campaign
- `POST /api/campaigns/[id]/resume` - Resume paused campaign

#### `/actions.json`
```json
{
  "rules": [
    {
      "pathPattern": "/api/actions/donate**",
      "apiPath": "/api/actions/donate"
    }
  ]
}
```

### Pages

| Route | Description |
|-------|-------------|
| `/create` | Multi-step campaign creation wizard |
| `/dashboard` | Creator's campaign management dashboard |
| `/campaign/[slug]` | Public campaign page with progress and donations |
| `/donate` | Fallback page for non-wallet users |

## 8. Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_PLATFORM_WALLET` | Fee collection wallet | System program (invalid) |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | Solana cluster | mainnet-beta |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | RPC endpoint | Public RPC |
| `DATABASE_URL` | PostgreSQL connection string | Required |

### Platform Constants (`src/lib/solana/config.ts`)
| Constant | Value | Description |
|----------|-------|-------------|
| `PLATFORM_FEE_PERCENT` | 0.02 (2%) | Platform fee percentage |
| `AMOUNT_PRESETS` | [0.1, 0.5, 1, 5] | Donation button amounts (SOL) |
| `MIN_AMOUNT` | 0.001 | Minimum donation (SOL) |
| `MAX_AMOUNT` | 100 | Maximum donation (SOL) |
| `DEFAULT_TITLE` | "Support This Project" | Fallback title |
| `DEFAULT_DESCRIPTION` | "Help fund this project..." | Fallback description |

## 9. Validation Rules

### Wallet Validation
- Must be valid base58 Solana address
- Must be on ed25519 curve
- Cannot be system program address (11111...1111)

### Amount Validation
- Must be finite number
- Must be > 0
- Must be within [MIN_AMOUNT, MAX_AMOUNT]
- Fee lamports = `floor(totalLamports * FEE_PCT)`
- Creator lamports = total - fee (must be > 0)

### Campaign Validation
- Title: 3-100 characters
- Goal: 0.1 - 100,000 SOL
- Deadline: Must be in future
- Creator wallet: Must be verified

## 10. Security

- **No server-side keys**: Users sign transactions locally
- **Wallet verification**: Ed25519 signatures with 30-day expiry
- **Input validation**: All user inputs validated with Zod
- **CORS headers**: Full Solana Actions spec compliance
- **Ownership checks**: Only verified creators can manage their campaigns
- **Transaction safety**: Donor is fee payer, no hidden transfers

## 11. Error Handling

- All responses include `ACTIONS_CORS_HEADERS`
- 400: Validation failures with human-readable messages
- 404: Campaign/resource not found
- 403: Unauthorized (wallet not verified, not campaign owner)
- 500: Unexpected errors with generic message

## 12. Deployment

### Requirements
- Vercel account
- Neon PostgreSQL database
- Platform wallet for fee collection

### Steps
1. Set environment variables in Vercel
2. Run database migrations: `pnpm drizzle-kit push`
3. Deploy to Vercel
4. Verify `/actions.json` is accessible
5. Test with dial.to on devnet before mainnet

### Environment Setup
```bash
NEXT_PUBLIC_PLATFORM_WALLET=<your-fee-wallet>
NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=<your-rpc-url>
DATABASE_URL=<neon-connection-string>
```

## 13. Testing Plan

### Unit Tests
- Wallet validation (base58, curve, system program)
- Amount validation (bounds, fee calculation)
- Lamports conversion and rounding

### Integration Tests
- GET `/api/actions/donate` returns valid ActionGetResponse
- POST `/api/actions/donate` builds correct transaction
- Campaign CRUD operations
- Wallet verification flow

### Manual Testing
1. Create campaign via `/create`
2. Test Blink on dial.to
3. Send donation, verify on Solana explorer
4. Check campaign progress updates
5. Test pause/resume/cancel flows

## 14. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Malicious campaign URLs | Show creator wallet in confirmation dialog |
| Database unavailability | Legacy mode works without database |
| RPC instability | Allow RPC URL override, surface friendly errors |
| Fee rounding errors | Comprehensive lamports math tests |
| Wallet verification expiry | 30-day window, re-verify flow available |

## 15. Future Enhancements

- [ ] Email notifications for donations
- [ ] Campaign categories and discovery
- [ ] Social sharing cards (OG images)
- [ ] Milestone-based funding
- [ ] Donation matching
- [ ] Analytics dashboard for creators
- [ ] Webhook notifications
- [ ] Multi-currency support (USDC, etc.)
