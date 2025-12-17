# BlinkFund - Micro-Crowdfund Blink Platform

A Solana Actions/Blinks backend that lets anyone create crowdfunding campaigns shareable directly on Twitter/X.

## What is This?

BlinkFund is the **backend infrastructure** that powers Solana Blinks for crowdfunding. When someone shares a campaign link on Twitter, wallet extensions (Phantom, Backpack) call YOUR API to:

1. Get campaign info (title, image, donation buttons)
2. Build the actual Solana transaction
3. Split funds between creator and platform fee

## Understanding the Architecture

### What BlinkFund Does (This Project)

| Responsibility | Description |
|----------------|-------------|
| **Host API endpoints** | `/api/actions/donate` - the brain of the Blink |
| **Build transactions** | Constructs Solana transfers with fee splitting |
| **Validate inputs** | Checks wallet addresses, amounts, etc. |
| **Take platform fee** | Configurable % on each donation (default 2%) |
| **Generate campaign URLs** | User-friendly form at `/create` |

### What dial.to Does (NOT this project)

| Responsibility | Description |
|----------------|-------------|
| **Render UI** | Displays the Blink card visually |
| **Testing tool** | Preview Blinks before sharing on Twitter |
| **Pass-through** | Calls YOUR API, displays result, forwards to wallet |

### What Wallet Extensions Do (Phantom, Backpack)

| Responsibility | Description |
|----------------|-------------|
| **Detect Blink URLs** | On Twitter/X, recognize Solana Action links |
| **Render in-feed** | Show interactive donation card in Twitter |
| **Sign transactions** | Prompt user to approve and broadcast |

### The Key Difference

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTENDS                               │
│              (just display UI, no business logic)               │
│                                                                 │
│    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│    │   dial.to   │    │   Twitter   │    │  Any Blink  │       │
│    │  (testing)  │    │  + Wallet   │    │   Client    │       │
│    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘       │
│           │                  │                  │               │
└───────────┼──────────────────┼──────────────────┼───────────────┘
            │                  │                  │
            └──────────────────┼──────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│                    (the actual business)                        │
│                                                                 │
│    ┌─────────────────────────────────────────────────────┐     │
│    │                   BlinkFund API                      │     │
│    │                                                      │     │
│    │  • GET  /api/actions/donate → Return card info      │     │
│    │  • POST /api/actions/donate → Build transaction     │     │
│    │  • Fee splitting (creator + platform)               │     │
│    │  • Validation & security                            │     │
│    └─────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Without BlinkFund:** dial.to and wallets have nothing to call. No transactions. No donations.

**Without dial.to:** Everything still works. Users just interact via Twitter instead.

## How Money Flows

```
User clicks "Donate 0.5 SOL"
         │
         ▼
Wallet calls BlinkFund API (POST)
         │
         ▼
BlinkFund builds transaction:
  ├── 0.49 SOL → Creator's wallet
  └── 0.01 SOL → Platform wallet (2% fee)
         │
         ▼
Transaction returned to wallet
         │
         ▼
User signs → Solana blockchain
         │
         ▼
Done! Creator got paid, platform got fee
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A Solana wallet for testing (Phantom/Backpack)
- SOL on devnet for testing

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file:

```env
# Required
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Solana Configuration
NEXT_PUBLIC_PLATFORM_WALLET=YourSolanaWalletAddressHere
NEXT_PUBLIC_SOLANA_CLUSTER=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Running Locally

```bash
# Clear any old build cache first
rm -rf .next

# Start development server
pnpm dev

# Or just Next.js without other services
npx next dev
```

The app will be available at `http://localhost:3000`

## Testing Your Blink

### Step 1: Create a Campaign

1. Go to `http://localhost:3000/create`
2. Enter your Solana wallet address
3. Add title, description, image (optional)
4. Copy the generated URL

### Step 2: Test on dial.to

1. Go to [https://dial.to](https://dial.to)
2. Paste your campaign URL
3. You should see your Blink card rendered
4. Connect wallet and test a donation

### Step 3: Get Devnet SOL

- Go to [https://faucet.solana.com](https://faucet.solana.com)
- Request SOL for your test wallet

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── create/
│   │   └── page.tsx                # Campaign URL generator
│   ├── api/
│   │   └── actions/
│   │       └── donate/
│   │           └── route.ts        # GET & POST handlers
│   └── actions.json/
│       └── route.ts                # Solana Actions manifest
│
├── lib/
│   └── solana/
│       ├── config.ts               # Platform configuration
│       ├── validation.ts           # Wallet & amount validation
│       ├── transaction.ts          # Transaction building
│       └── types.ts                # TypeScript types
│
└── components/
    └── ui/                         # shadcn/ui components
```

## Configuration

All platform settings are in `src/lib/solana/config.ts`:

```typescript
export const SOLANA_CONFIG = {
  // Your wallet that receives platform fees
  PLATFORM_WALLET: "YourWalletHere",

  // Platform fee (2% = 0.02)
  PLATFORM_FEE_PERCENT: 0.02,

  // Donation button presets (in SOL)
  AMOUNT_PRESETS: [0.1, 0.5, 1, 5],

  // Donation limits
  MIN_AMOUNT: 0.001,
  MAX_AMOUNT: 100,

  // Network
  CLUSTER: "devnet", // or "mainnet-beta"
};
```

## API Reference

### GET /api/actions/donate

Returns the Blink card configuration.

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `wallet` | Yes (for POST) | Creator's Solana wallet |
| `title` | No | Campaign title |
| `desc` | No | Campaign description |
| `image` | No | Campaign image URL |

**Response:**
```json
{
  "type": "action",
  "title": "Save the Whales",
  "icon": "https://example.com/whale.jpg",
  "description": "Help ocean wildlife",
  "label": "Donate",
  "links": {
    "actions": [
      { "label": "Donate 0.1 SOL", "href": "...?amount=0.1", "type": "post" },
      { "label": "Donate 0.5 SOL", "href": "...?amount=0.5", "type": "post" }
    ]
  }
}
```

### POST /api/actions/donate

Builds and returns a donation transaction.

**Query Parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `wallet` | Yes | Creator's Solana wallet |
| `amount` | Yes | Donation amount in SOL |

**Request Body:**
```json
{
  "account": "DonorWalletPublicKey"
}
```

**Response:**
```json
{
  "transaction": "base64-encoded-transaction",
  "message": "Donating 0.5 SOL to Save the Whales (2% platform fee)"
}
```

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
pnpm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Production Checklist

1. Set `NEXT_PUBLIC_PLATFORM_WALLET` to your real Solana wallet
2. Change `NEXT_PUBLIC_SOLANA_CLUSTER` to `mainnet-beta` when ready
3. Use HTTPS - wallets require secure connections
4. Test thoroughly on devnet first!

## Campaign URL Format

```
https://your-app.vercel.app/api/actions/donate?wallet=7EcD...LtV&title=My%20Campaign&desc=Help%20me&image=https://...
```

Share this URL on Twitter/X and wallets will render it as an interactive donation card.

## Security Considerations

- **No private keys** on server - users sign locally
- **Devnet default** - prevents accidental mainnet losses
- **Wallet validation** - rejects invalid addresses
- **Amount bounds** - enforces min/max limits
- **System program blocked** - can't donate to null address

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Solana:** @solana/web3.js, @solana/actions
- **Styling:** Tailwind CSS, shadcn/ui
- **Deployment:** Vercel

## FAQ

**Q: Do I need dial.to?**
A: No. It's just a testing tool. Your Blinks work directly on Twitter via wallet extensions.

**Q: Where do fees go?**
A: To the `PLATFORM_WALLET` address you configure.

**Q: Can I change the fee percentage?**
A: Yes, edit `PLATFORM_FEE_PERCENT` in the config.

**Q: Is this custodial?**
A: No. You never hold user funds. Transactions go directly from donor to creator (minus fee to you).

**Q: What wallets are supported?**
A: Any wallet that supports Solana Actions - Phantom, Backpack, and others.

## License

MIT
