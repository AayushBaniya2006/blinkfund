"use client";

import React from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import WalletProvider from "@/components/solana/WalletProvider";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <WalletProvider>{children}</WalletProvider>
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}

export default Providers;
