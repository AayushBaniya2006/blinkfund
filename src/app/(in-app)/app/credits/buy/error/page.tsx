import CreditsErrorRedirector from "./CreditsErrorRedirector";

type ErrorCodeType =
  | "INVALID_PARAMS"
  | "PRICE_CALCULATION_ERROR"
  | "STRIPE_ERROR"
  | "PAYPAL_ERROR"
  | "UNSUPPORTED_PROVIDER";

export default async function CreditsErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; message?: string }>;
}) {
  // The error handling is done in the client component
  // This allows us to access URL parameters easily
  return <CreditsErrorRedirector />;
}
