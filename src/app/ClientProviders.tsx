"use client";

import dynamic from "next/dynamic";

// Dynamically import Providers with SSR disabled to prevent hydration issues with error pages
const Providers = dynamic(() => import("./Providers"), { ssr: false });

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
