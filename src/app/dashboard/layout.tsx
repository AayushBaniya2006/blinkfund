import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Dashboard",
  description:
    "Manage your crowdfunding campaigns, track donations, and monitor progress.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
