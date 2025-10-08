import { z } from "zod";

import { creditsConfig, creditTypeSchema } from "./config";
import { Quotas } from "@/db/schema/plans";

interface CreditBuySlab {
  from: number;
  to: number;
  pricePerUnit: number;
}

export type CreditsConfig = {
  [key in CreditType]: {
    name: string;
    currency: string;
    minimumAmount?: number;
    maximumAmount?: number;
    slabs?: CreditBuySlab[];
    priceCalculator?: (
      amount: number,
      userPlan?: {
        id: string;
        codename: string;
        quotas: Quotas;
      }
    ) => number;
  };
};

// Define credits type enum
export type CreditType = z.infer<typeof creditTypeSchema>;

export const getCreditsPrice = (
  creditType: CreditType,
  amount: number,
  userPlan?: {
    id: string;
    codename: string;
    quotas: Quotas;
  }
): number => {
  // TIP: You can also pass the user from both frontend and backend to get the price based on his current pla
  const minimumAmount = creditsConfig[creditType].minimumAmount;
  const maximumAmount = creditsConfig[creditType].maximumAmount;
  if (minimumAmount && amount < minimumAmount) {
    throw new Error(
      `${creditType} amount is less than minimum amount. Minimum amount is ${minimumAmount}`
    );
  }
  if (maximumAmount && amount > maximumAmount) {
    throw new Error(
      `${creditType} amount is greater than maximum amount. Maximum amount is ${maximumAmount}`
    );
  }
  //   Either of slabs or priceCalculator must be provided
  const slabs = creditsConfig[creditType].slabs;
  const priceCalculator = creditsConfig[creditType].priceCalculator;

  if (slabs && slabs.length > 0) {
    const slab = slabs.find((slab) => amount >= slab.from && amount <= slab.to);
    return slab?.pricePerUnit ?? 0 * amount;
  }
  if (priceCalculator) {
    return priceCalculator(amount, userPlan);
  }

  throw new Error("Either slabs or priceCalculator must be provided");
};

export const getCreditsBuyUrl = (creditType: CreditType, amount: number) => {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy?creditType=${creditType}&amount=${amount}`;
  return url;
};

// Re-export credit transaction functions
export {
  recalculateUserCredits,
  addCreditTransaction,
  addCredits,
  deductCredits,
  getUserCredits,
  getCreditTransactions,
} from "./recalculate";
