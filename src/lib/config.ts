/**
 * Micro-Crowdfund Blink Platform Configuration
 */

export const appConfig = {
  projectName: "BlinkFund",
  projectSlug: "blinkfund",
  keywords: [
    "Solana Blinks",
    "Crowdfunding",
    "Crypto Donations",
    "Solana Actions",
    "Web3 Fundraising",
    "Decentralized Crowdfunding",
  ],
  description:
    "Create shareable Solana Blink links to collect donations directly from Twitter/X feeds. No signup required.",
  // Auth config for compatibility with existing auth system
  auth: {
    enablePasswordAuth: false,
  },
  // Email config for compatibility
  email: {
    senderName: "BlinkFund",
    senderEmail: process.env.EMAIL_FROM || "noreply@example.com",
  },
  // Legal config for email templates
  legal: {
    address: {
      street: "123 Blockchain St",
      city: "Web3 City",
      state: "Crypto State",
      postalCode: "00000",
      country: "Decentraland",
    },
    email: process.env.EMAIL_FROM || "support@example.com",
    phone: "+1 000-000-0000",
  },
  // Social links
  social: {
    twitter: "https://twitter.com/blinkfund",
  },
};
