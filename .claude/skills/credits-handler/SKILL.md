---
name: credits-handler
description: Manage the credit system (allocation, purchasing, usage). Use when adding credit types, configuring pricing, or debugging balances.
---

# Credits Handler

## Instructions

### 1. Adding a New Credit Type
1.  **Config**: Add to `creditTypeSchema` in `src/lib/credits/config.ts`.
2.  **Pricing**: Configure in `creditsConfig` (slabs or calculator).
3.  **Defaults**: Set plan amounts in `onPlanChangeCredits`.
4.  **UI**: Update `src/components/website/website-credits-section.tsx`.

### 2. Core Operations
- **Display**: Use `useCredits()` (Frontend).
- **Buy UI**: Use `useBuyCredits()` (Frontend).
- **Add**: Use `addCredits()` (Server/API).
- **Deduct**: Use `deductCredits()` (Server/API).

### 3. Webhooks
- **Do not modify** core webhook logic unless adding a new provider.
- Ensure new providers pass `metadata` and use `addCredits` with a unique `paymentId`.

## Reference
For architecture, data types, and best practices, see [reference.md](reference.md).

