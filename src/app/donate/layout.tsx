import { Metadata } from "next";
import { appConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Donate",
  description: `Support crowdfunding campaigns on ${appConfig.projectName}. Send SOL donations directly to campaign creators using Solana Blinks.`,
  alternates: {
    canonical: "/donate",
  },
  openGraph: {
    title: `Donate | ${appConfig.projectName}`,
    description: "Support crowdfunding campaigns with SOL donations on Solana.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Donate | ${appConfig.projectName}`,
    description: "Support crowdfunding campaigns with SOL donations.",
  },
};

export default function DonateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
