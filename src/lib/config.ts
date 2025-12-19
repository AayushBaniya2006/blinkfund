/**
 * Micro-Crowdfund Blink Platform Configuration
 */

export const appConfig = {
  projectName: "BlinkFund",
  projectSlug: "blinkfund",
  tagline: "Real Crowdfunding on Solana",
  keywords: [
    "Solana Blinks",
    "Crowdfunding",
    "Crypto Donations",
    "Solana Actions",
    "Web3 Fundraising",
    "Decentralized Crowdfunding",
    "Solana Crowdfunding",
    "Crypto Fundraising",
    "Blockchain Donations",
    "Twitter Blinks",
    "SOL Donations",
    "Web3 Crowdfunding Platform",
  ],
  description:
    "Run real crowdfunding campaigns on Solana with goals, deadlines, and progress tracking. Blinks let people send money - BlinkFund lets you raise it.",
  longDescription:
    "BlinkFund is the leading Solana Blinks crowdfunding platform. Create verified fundraising campaigns with goals, deadlines, and real-time progress tracking. Share on Twitter/X and receive donations directly to your wallet. Non-custodial, transparent, and powered by Solana Actions.",
  // Auth config for compatibility with existing auth system
  auth: {
    enablePasswordAuth: false,
  },
  // Email config for compatibility
  email: {
    senderName: "BlinkFund",
    senderEmail: process.env.EMAIL_FROM || "blinkfund28@gmail.com",
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
    email: process.env.EMAIL_FROM || "blinkfund28@gmail.com",
    phone: "+1 000-000-0000",
  },
  // Social links
  social: {
    twitter: "https://x.com/FundOnBlink",
  },
};
