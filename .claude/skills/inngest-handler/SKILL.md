---
name: inngest-handler
description: Create and register Inngest functions for background jobs, workflows, and scheduled tasks
tools: Read, Write, Edit
model: inherit
---

# Inngest Function Handler Skill

This skill helps you create typesafe Inngest functions with proper folder structure and registration.

## Core Principles

1.  **Folder Structure**: Derived from event names (e.g., `user.created` -> `src/lib/inngest/functions/user/created/sendWelcomeEmail.ts`).
2.  **Type Safety**: Always register events in `src/lib/inngest/functions/index.ts`.
3.  **Multi-Step**: Use `step.run`, `step.sleep`, `step.waitForEvent` for reliable execution.

## Usage

### 1. Create a New Function

When creating a function, you must:
1.  Identify the event name (e.g., `app/invoice.created`) or Cron schedule.
2.  Create the folder path: `src/lib/inngest/functions/app/invoice/created/`.
3.  Create the handler file: `generatePdf.ts`.
4.  Register the event type in `index.ts` (skip for Cron).
5.  Register the function in the `functions` array in `index.ts`.

### 2. Event-Based Function Template

```typescript
import { inngest } from "@/lib/inngest/client";

export const yourFunctionName = inngest.createFunction(
  { 
    id: "unique-function-id", // e.g., "invoice-generate-pdf"
    // Concurrency: Run max 2 of these at a time per user
    concurrency: { limit: 2, key: "event.data.userId" },
    // Rate Limit: Max 10 per minute
    rateLimit: { limit: 10, period: "1m", key: "event.data.userId" },
    // Cancel this function if the invoice is cancelled
    cancelOn: [{ event: "app/invoice.cancelled", match: "data.invoiceId" }]
  },
  { event: "app/invoice.created" },
  async ({ event, step }) => {
    // 1. Standard Step: reliable execution with auto-retries
    const data = await step.run("fetch-data", async () => {
      const result = await db.query(...);
      if (!result) throw new Error("No data found"); // Will retry automatically
      return result;
    });

    // 2. Sleep: Pause execution for a duration
    await step.sleep("wait-for-processing", "10s");

    // 3. Wait for Event: Pause until another event occurs (or timeout)
    const payment = await step.waitForEvent("wait-for-payment", {
      event: "app/invoice.paid",
      match: "data.invoiceId",
      timeout: "24h"
    });

    if (!payment) {
      // 4. Conditional Logic based on events
      await step.run("send-reminder", async () => {
        // send email logic
      });
    }
    
    return { success: true };
  }
);
```

### 3. Scheduled (Cron) Function Template

```typescript
import { inngest } from "@/lib/inngest/client";

export const weeklyDigest = inngest.createFunction(
  { id: "weekly-digest-email" },
  { cron: "0 9 * * MON" }, // Every Monday at 9am
  async ({ step }) => {
    const users = await step.run("fetch-users", async () => {
      return await db.users.findMany({ where: { newsletter: true } });
    });

    // Loop handling: Inngest handles loops best when the heavy lifting is inside a step
    // OR distribute work by sending events for each user (Fan-out pattern)
    const events = users.map(user => ({
      name: "app/send.digest",
      data: { userId: user.id }
    }));

    await step.sendEvent("fan-out-emails", events);
    
    return { count: events.length };
  }
);
```

### 4. Registration (Critical)

You **MUST** update `src/lib/inngest/functions/index.ts`:

```typescript
// 1. Import your function
import { yourFunctionName } from "./app/invoice/created/generatePdf";
import { weeklyDigest } from "./cron/weeklyDigest";

// 2. Add event type definition (Only for event-based functions)
export type InngestEvents = {
  "app/invoice.created": {
    data: {
      invoiceId: string;
      amount: number;
    };
  };
  "app/send.digest": {
    data: { userId: string };
  }
  // ... existing events
};

// 3. Add to functions array
export const functions = [
  // ... existing functions
  yourFunctionName,
  weeklyDigest
];
```

## Advanced Features & Patterns

### Flow Control
- **Rate Limit**: `{ rateLimit: { key: "event.data.userId", limit: 1, period: "1m" } }` - Prevent bursts.
- **Throttle**: `{ throttle: { key: "event.data.userId", limit: 1, period: "1h" } }` - Drop excess events.
- **Debounce**: `{ debounce: { key: "event.data.itemId", period: "5m" } }` - Wait for "quiet" period.
- **Priority**: `{ priority: { run: "event.data.isPremium ? 100 : 0" } }` - Prioritize VIP users.

### Error Handling & Retries
- **Automatic Retries**: Inngest retries failed steps automatically with exponential backoff.
- **Non-Retriable Errors**: Throw `new NonRetriableError("Stop")` to halt immediately.
- **Custom Retries**: `{ retries: 0 }` in function config to disable, or handle `try/catch` inside `step.run` (be careful, `step.run` captures errors).

```typescript
// Failure Handler (runs if the function fails all retries)
export const myFunction = inngest.createFunction(
  { 
    id: "process-payment",
    onFailure: async ({ error, event, step }) => {
      await step.run("notify-admin", async () => {
        await sendSlackAlert(`Function failed: ${error.message}`);
      });
    }
  },
  { event: "app/payment.process" },
  async ({ event }) => { /* ... */ }
);
```

### Local Development
- The Inngest Dev Server runs at `http://localhost:8288` by default.
- Use it to trigger events manually and inspect function runs.
- Any changes to files in `src/lib/inngest/functions` hot-reload automatically.

Refer to [reference.md](reference.md) for more details.
