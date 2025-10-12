import { PlanProvider } from "@/lib/plans/getSubscribeUrl";
import CreditsSuccessRedirector from "./CreditsSuccessRedirector";

export default async function CreditsSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string; // STRIPE
    provider: PlanProvider;
    creditType?: string;
    amount?: string;
    payment_id?: string; // PAYPAL
  }>;
}) {
  const { provider, session_id, payment_id } = await searchParams;

  // For now, we'll assume success and let the success component handle the display
  // In a real implementation, you might want to verify the payment status here
  // similar to how it's done in the subscription success page

  switch (provider) {
    case PlanProvider.STRIPE:
      // You could verify the Stripe session here if needed
      if (session_id) {
        // Optionally verify the session status
      }
      break;
    case PlanProvider.PAYPAL:
      // You could verify the PayPal payment here if needed  
      if (payment_id) {
        // Optionally verify the payment status
      }
      break;
  }

  return <CreditsSuccessRedirector />;
}
