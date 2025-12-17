# Micro-Crowdfund Blink Platform — Product Requirements Document

## 1. Goal & Overview
- Ship a **multi-project** Solana Actions/Blink platform that lets **anyone** create their own fundraising campaign and collect donations directly from X (Twitter) feeds.
- Creators generate campaign URLs with their wallet address and project details.
- Wallets render the UI; our surface is a Next.js API route with URL-based configuration.
- Support an optional platform fee (1–3%), devnet-first, deployable to Vercel.
- **No database required** - fully stateless, URL-based project configuration.

## 2. Success Metrics
- Time-to-first-campaign: < 1 minute to generate a shareable Blink URL.
- Time-to-first-donation: < 2 clicks after wallet connect.
- Transaction success rate: ≥ 95% on devnet (observed via explorer/logs).
- P95 endpoint latency: < 500 ms excluding RPC/blockhash calls.
- Adoption: Multiple creators using the platform with successful donations pre-mainnet.

## 3. Users & Stories
- **Donor**: Sees Blink card with project info and preset buttons; taps once, signs once, funds split (project + fee) with clear summary.
- **Creator**: Visits `/create`, enters wallet address and project details, gets a shareable Blink URL. No signup required.
- **Operator**: Configures platform fee, cluster, min/max donation, presets, default metadata without code changes.

## 4. Scope
- **In-scope**: Multi-project donation Blink via URL params; link generator page; GET menu + POST transaction; static presets; simple fee split; `/actions.json`; validation; devnet-first; Vercel deployment.
- **Out-of-scope (MVP)**: Database storage, creator accounts/dashboards, refunds, escrowed goals, fiat on-ramps, analytics UI, donation tracking.

## 5. Constraints
- Stack: Next.js App Router, TypeScript, `@solana/actions`, `@solana/web3.js`.
- Hosting: Vercel (HTTPS required by wallets).
- Compliance: Solana Actions spec; CORS headers.
- Wallets: Phantom/Backpack baseline compatibility.
- URL length: ~2000 character limit for full URLs with all params.

## 6. Experience & Flows

### Creator Flow
1. Creator visits `/create` page.
2. Enters wallet address, project title, description, image URL.
3. Clicks "Generate" to get shareable Blink URL.
4. Shares URL on X (Twitter).
5. Supporters see the Blink card and can donate.

### Donation Flow
1. User sees Blink link in X feed; wallet renders Action card.
2. User taps preset donation amount (e.g., 0.1 SOL).
3. Wallet POSTs user account + query params.
4. API builds tx with two transfers (creator + platform fee) and returns ActionPostResponse.
5. Wallet shows summary, user signs, transaction broadcasts, success view shown.

### Error Flow
- Invalid wallet/account/amount → 400 with readable message and CORS headers; wallet renders error.

## 7. Functional Requirements

### GET `/api/actions/donate`
- **Query params**: `wallet` (required for donation), `title`, `desc`, `image` (all optional, use defaults)
- Returns `ActionGetResponse` with title, description, image, label.
- `links.actions`: preset donation buttons with all params passed through.
- Validates `wallet` if provided (must be valid Solana address, not system program).

### POST `/api/actions/donate`
- **Query params**: `wallet` (required), `amount` (required), `title` (optional for message)
- Accepts JSON `{ "account": "<user pubkey>" }`.
- Validates `account` is a valid `PublicKey`.
- Validates `wallet` is a valid destination address.
- Validates amount: numeric, finite, > 0, within `[MIN_AMOUNT, MAX_AMOUNT]`.
- Fee: `floor(totalLamports * FEE_PCT)`; project share = total − fee; require project share > 0.
- Transaction: fee payer = user; two `SystemProgram.transfer` instructions (creator + platform fee if fee > 0).
- Returns `ActionPostResponse` via `createPostResponse` with message summarizing donation and fee.

### OPTIONS
- Present for CORS on all endpoints.

### `/actions.json`
- Wildcard rule: `/api/actions/donate**` to match any query params.

### `/create` Page
- Form to generate campaign URLs.
- Inputs: wallet address (required), title, description, image URL.
- Output: shareable Blink URL with link to test on dial.to.

### Config (Platform-wide)
- `PLATFORM_WALLET`: Fee collection wallet.
- `PLATFORM_FEE_PERCENT`: Platform fee (0-99%).
- `AMOUNT_PRESETS`: Donation button amounts.
- `MIN_AMOUNT`, `MAX_AMOUNT`: Donation bounds.
- `DEFAULT_TITLE`, `DEFAULT_DESCRIPTION`, `DEFAULT_IMAGE`: Fallbacks.
- `CLUSTER`: "devnet" | "mainnet-beta".

## 8. Non-Functional Requirements
- Performance: P95 < 500 ms excluding RPC call; cache GET payload (edge caching ok), POST not cached.
- Availability: Best-effort on Vercel; degrade gracefully if RPC unavailable.
- Security: No server-side keys; devnet default to avoid accidental loss; validate all user inputs.
- Observability: Log request id, cluster, shortened accounts, amount, success/error without PII.
- Compliance: Full Actions spec headers and shapes.

## 9. API Contracts (Samples)

### Campaign URL Format
```
https://yourapp.vercel.app/api/actions/donate?wallet=7EcD...LtV&title=Save%20the%20Whales&desc=Help%20ocean%20wildlife&image=https://example.com/whale.jpg
```

### GET Response
```json
{
  "type": "action",
  "title": "Save the Whales",
  "icon": "https://example.com/whale.jpg",
  "description": "Help ocean wildlife",
  "label": "Donate",
  "links": {
    "actions": [
      { "label": "Donate 0.1 SOL", "href": "...?wallet=7EcD...&title=...&amount=0.1", "type": "post" },
      { "label": "Donate 0.5 SOL", "href": "...?wallet=7EcD...&title=...&amount=0.5", "type": "post" }
    ]
  }
}
```

### POST Response
- 200: `ActionPostResponse` with serialized tx and message.
- 400: `Invalid "wallet"` | `Invalid "account"` | `Invalid "amount"` | generic error; always includes CORS headers.

## 10. Validation Rules
- Wallet must be valid base58 Solana address, not system program address.
- Amount must be finite, > 0, within min/max bounds.
- Fee lamports = `floor(totalLamports * FEE_PCT)`; project lamports = total − fee; must remain > 0.
- Reject NaN, Infinity, negative, zero, or above max.

## 11. Configuration (Platform)
- Platform-wide constants in `src/lib/config.ts`:
  - `PLATFORM_WALLET`, `PLATFORM_FEE_PERCENT`
  - `AMOUNT_PRESETS`, `MIN_AMOUNT`, `MAX_AMOUNT`
  - `DEFAULT_TITLE`, `DEFAULT_DESCRIPTION`, `DEFAULT_IMAGE`
  - `CLUSTER`, `RPC_URL`

## 12. Data/State
- Stateless API; no database.
- Project configuration passed via URL parameters.
- Goal/progress text is static (no on-chain reads in MVP).

## 13. Error Handling
- Include `ACTIONS_CORS_HEADERS` on all responses.
- Return human-readable 400s for validation failures; 500 for unexpected errors.
- Log errors with context (wallet, account, amount, cluster) for debugging.

## 14. Security & Abuse
- Default to devnet; mainnet requires explicit config change.
- No private keys server-side; users sign locally.
- Validate wallet addresses to prevent invalid destinations.
- Block system program address as donation destination.
- Optional: Rate limiting via Vercel Edge middleware.

## 15. Testing Plan
- Unit: Amount validator; wallet validator; fee split math; lamports rounding.
- Integration: GET returns valid schema with/without wallet param; POST builds correct tx; POST rejects invalid inputs; OPTIONS responds with CORS headers.
- Manual: Use dial.to against deployed URL on devnet; test link generator; confirm wallet shows project + fee; send donation; verify transfers on explorer.
- Edge cases: invalid wallet format; system program as wallet; missing wallet on POST; zero/negative amount; RPC failure.

## 16. Deployment
- Host on Vercel; Node 18+.
- Set `PLATFORM_WALLET` before deployment.
- Ensure `/actions.json` reachable at root.
- Use HTTPS URL when sharing.

## 17. Risks & Mitigations
- Malicious URLs with wrong wallets: Users should verify wallet in confirmation dialog; platform shows wallet in card.
- URL tampering: All params visible in URL; no hidden configuration.
- Fee rounding errors: Test lamports math; assert project lamports > 0.
- RPC instability: Allow RPC override; surface friendly error.
- Mainnet accidents: Keep devnet default.

## 18. Rollout
- Phase 1: Local + devnet testing with dial.to; test link generator and donations.
- Phase 2: Deploy to Vercel; share with early testers; monitor logs.
- Phase 3: If enabling mainnet, switch cluster, set real platform wallet, raise max donation.

## 19. Open Questions (Resolved)
- ✅ Multi-project support: Implemented via URL parameters.
- ✅ Creator registration: No signup needed; URL-based.
- Fee default: 2% (configurable).
- Custom amount input: Presets only in MVP.
- Success/error URLs: Optional, not implemented in MVP.
