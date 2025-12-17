"use client";

import dynamic from "next/dynamic";

// Dynamically import the donate content to avoid SSR issues with wallet adapter
const DonatePageContent = dynamic(() => import("./DonateContent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/80">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  ),
});

export default function DonatePage() {
  return <DonatePageContent />;
}
