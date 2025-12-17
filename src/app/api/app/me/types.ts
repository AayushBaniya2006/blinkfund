/**
 * Types for the /api/app/me endpoint
 */

// Credit record type - mirrors the schema definition
// Note: Must match creditTypeSchema in @/lib/credits/config
export type CreditRecord = {
  image_generation?: number;
  video_generation?: number;
  [key: string]: number | undefined;
};

export interface MeResponse {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: Date | null;
    planId: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    lemonSqueezyCustomerId: string | null;
    lemonSqueezySubscriptionId: string | null;
    dodoCustomerId: string | null;
    dodoSubscriptionId: string | null;
    emailVerified: Date | null;
    credits: CreditRecord | null;
  } | null;
  currentPlan: {
    id: string;
    name: string | null;
    codename: string | null;
    quotas: {
      permiumSupport: boolean;
      monthlyImages: number;
      somethingElse: string;
    } | null;
    default: boolean | null;
  } | null;
}
