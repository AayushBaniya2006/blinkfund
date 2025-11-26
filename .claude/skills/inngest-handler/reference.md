# Inngest Reference

## File Structure
- **Client**: `src/lib/inngest/client.ts`
- **Index/Registry**: `src/lib/inngest/functions/index.ts`
- **Functions**: `src/lib/inngest/functions/[domain]/[action]/[handler].ts`

## Common Patterns

### Sleep
```typescript
// Wait for a duration
await step.sleep("wait-1-day", "1d");
// Wait until a specific timestamp
await step.sleepUntil("wait-for-date", new Date("2024-01-01"));
```

### Wait For Event
```typescript
const result = await step.waitForEvent("wait-approval", {
  event: "app/approval.received",
  match: "data.requestId", // Matches event.data.requestId with current event.data.requestId
  timeout: "7d"
});
```

### Send Event (Fan-out)
```typescript
await step.sendEvent("notify-users", [
  { name: "app/notify", data: { id: 1 } },
  { name: "app/notify", data: { id: 2 } }
]);
```

### Invoke Function directly
```typescript
await step.invoke("call-another-fn", {
  function: anotherFunction,
  data: { foo: "bar" }
});
```

### Cron Schedule
```typescript
// Run every Monday at 9am
{ cron: "0 9 * * MON" }
```

### Failure Handler
```typescript
onFailure: async ({ error, step }) => {
  await step.run("log-failure", () => console.error(error));
}
```
