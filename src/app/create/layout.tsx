import { Metadata } from "next";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Create Campaign",
  description: `Create your crowdfunding campaign on ${appConfig.projectName}. Set goals, deadlines, and start raising funds with Solana Blinks. Verify your wallet and launch in minutes.`,
  alternates: {
    canonical: "/create",
  },
  openGraph: {
    title: `Create Campaign | ${appConfig.projectName}`,
    description:
      "Launch your Solana crowdfunding campaign in minutes. Set goals, verify your wallet, and share on Twitter/X.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Create Campaign | ${appConfig.projectName}`,
    description: "Launch your Solana crowdfunding campaign in minutes.",
  },
};

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
