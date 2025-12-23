"use client";

import React, { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import WalletProvider from "@/components/solana/WalletProvider";

function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR/prerendering, render children without providers
  // This prevents context errors during static generation
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WalletProvider>{children}</WalletProvider>
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}

export default Providers;
