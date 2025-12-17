"use client";

import React from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
      <Toaster position="top-center" richColors closeButton />
    </ThemeProvider>
  );
}

export default Providers;
