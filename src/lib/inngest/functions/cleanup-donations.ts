/**
 * Inngest function to clean up stale pending donations and expired challenges
 * Runs every 5 minutes
 */

import { inngest } from "../client";
import { expireStalePendingDonations } from "@/lib/donations/queries";
import { cleanupExpiredChallenges } from "@/lib/wallet/challenges";
import { log } from "@/lib/logging";

export const cleanupDonations = inngest.createFunction(
  {
    id: "cleanup-donations",
    name: "Cleanup Stale Donations and Challenges",
  },
  { cron: "*/5 * * * *" }, // Every 5 minutes
  async ({ step }) => {
    // Step 1: Expire stale pending donations
    const expiredDonations = await step.run(
      "expire-stale-donations",
      async () => {
        const count = await expireStalePendingDonations(10); // 10 minutes
        log("info", "Expired stale pending donations", {
          expiredCount: count,
        });
        return count;
      }
    );

    // Step 2: Clean up expired wallet challenges
    const expiredChallenges = await step.run(
      "cleanup-expired-challenges",
      async () => {
        const count = await cleanupExpiredChallenges();
        log("info", "Cleaned up expired wallet challenges", {
          expiredCount: count,
        });
        return count;
      }
    );

    return {
      expiredDonations,
      expiredChallenges,
      timestamp: new Date().toISOString(),
    };
  }
);
