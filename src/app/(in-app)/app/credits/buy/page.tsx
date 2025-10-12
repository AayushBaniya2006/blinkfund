import React from "react";
import { auth, signIn } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema/user";
import { plans } from "@/db/schema/plans";
import { createPaypalOrderLink } from "@/lib/paypal/api";
import { PlanProvider, PlanType } from "@/lib/plans/getSubscribeUrl";
import stripe from "@/lib/stripe";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  creditBuyParams,
  getCreditsPrice,
  type CreditType,
} from "@/lib/credits/credits";

async function CreditsBuyPage({
  searchParams,
}: {
  searchParams: Promise<{
    creditType: CreditType;
    amount: string;
    provider: PlanProvider;
  }>;
}) {
  const { creditType, amount, provider } = await searchParams;

  try {
    creditBuyParams.parse({
      creditType,
      amount: Number(amount),
      provider,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/error?code=INVALID_PARAMS&message=${error.message}`
      );
    }
    throw error;
  }

  const session = await auth();

  if (!session?.user?.email) {
    return signIn();
  }

  const dbUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!dbUsers?.[0]) {
    return signIn();
  }

  const user = dbUsers[0];
  const creditAmount = Number(amount);

  // Get user's current plan for pricing calculation
  let userPlan: { id: string; codename: string; quotas: any } | undefined =
    undefined;
  if (user.planId) {
    const currentPlan = await db
      .select({
        id: plans.id,
        codename: plans.codename,
        quotas: plans.quotas,
      })
      .from(plans)
      .where(eq(plans.id, user.planId))
      .limit(1)
      .then((res) => res[0]);

    if (currentPlan.codename && currentPlan.quotas) {
      userPlan = {
        id: currentPlan.id,
        codename: currentPlan.codename,
        quotas: currentPlan.quotas,
      };
    }
  }

  // Calculate the price for the credits with user's plan
  let totalPrice: number;
  try {
    totalPrice = getCreditsPrice(creditType, creditAmount, userPlan);
  } catch (error) {
    return redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/error?code=PRICE_CALCULATION_ERROR&message=${encodeURIComponent(
        error instanceof Error ? error.message : "Failed to calculate price"
      )}`
    );
  }

  switch (provider) {
    case PlanProvider.PAYPAL:
      // For now, redirect to error as PayPal requires more complex setup for credits
      // This would need a custom PayPal order creation function for credits
      return redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/error?code=PAYPAL_NOT_IMPLEMENTED&message=${encodeURIComponent(
          "PayPal support for credits is not yet implemented. Please use Stripe."
        )}`
      );

    case PlanProvider.STRIPE:
      // Create a one-time payment checkout session
      const stripeCheckoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${creditAmount} ${creditType} Credits`,
                description: `Purchase of ${creditAmount} credits for ${creditType}`,
              },
              unit_amount: Math.round(totalPrice * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        allow_promotion_codes: true,
        customer: user.stripeCustomerId ?? undefined,
        customer_email: user.stripeCustomerId
          ? undefined
          : (session?.user?.email ?? undefined),
        billing_address_collection: "required",
        tax_id_collection: {
          enabled: true,
        },
        customer_update: user.stripeCustomerId
          ? {
              name: "auto",
              address: "auto",
            }
          : undefined,
        customer_creation: user.stripeCustomerId ? undefined : "always",
        metadata: {
          creditType,
          amount: creditAmount.toString(),
          userId: user.id,
          type: "credits_purchase",
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/success?provider=${provider}&creditType=${creditType}&amount=${creditAmount}&sessionId={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/cancel?provider=${provider}&creditType=${creditType}&amount=${creditAmount}&sessionId={CHECKOUT_SESSION_ID}`,
      });

      if (!stripeCheckoutSession.url) {
        console.error(
          "Checkout session URL not created",
          stripeCheckoutSession
        );
        throw new Error("Checkout session URL not found");
      }

      // Success: redirect immediately to Stripe checkout
      redirect(stripeCheckoutSession.url);

    default:
      return redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/app/credits/buy/error?code=UNSUPPORTED_PROVIDER&message=Payment provider not supported`
      );
  }

  return <></>;
}

export default CreditsBuyPage;
