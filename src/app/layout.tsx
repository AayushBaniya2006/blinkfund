import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { appConfig } from "@/lib/config";
import ClientProviders from "./ClientProviders";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://blinkfund.vercel.app";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    template: `%s | ${appConfig.projectName}`,
    default: `${appConfig.projectName} - ${appConfig.tagline}`,
  },
  description: appConfig.description,
  keywords: appConfig.keywords,
  authors: [{ name: appConfig.projectName, url: baseUrl }],
  creator: appConfig.projectName,
  publisher: appConfig.projectName,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: appConfig.projectName,
    title: `${appConfig.projectName} - ${appConfig.tagline}`,
    description: appConfig.description,
    images: [
      {
        url: "/images/og.png",
        width: 1200,
        height: 630,
        alt: `${appConfig.projectName} - Solana Crowdfunding Platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${appConfig.projectName} - ${appConfig.tagline}`,
    description: appConfig.description,
    site: "@FundOnBlink",
    creator: "@FundOnBlink",
    images: ["/images/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/assets/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/assets/logo.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  category: "finance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.variable} antialiased bg-background`}>
        <ClientProviders>{children}</ClientProviders>
        <Analytics />
        {/* Structured Data for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "BlinkFund",
              url: baseUrl,
              logo: `${baseUrl}/assets/logo.png`,
              sameAs: ["https://x.com/FundOnBlink"],
              description: appConfig.description,
              foundingDate: "2024",
              contactPoint: {
                "@type": "ContactPoint",
                email: "blinkfund28@gmail.com",
                contactType: "customer support",
              },
            }),
          }}
        />
        {/* Structured Data for WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "BlinkFund",
              url: baseUrl,
              description: appConfig.description,
              potentialAction: {
                "@type": "SearchAction",
                target: `${baseUrl}/campaign/{search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
