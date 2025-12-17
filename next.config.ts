import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Skip static generation for error pages
  experimental: {
    // @ts-expect-error - Next.js 16 experimental option
    missingSuspenseWithCSRBailout: false,
  },
  // Don't fail build on prerender errors for internal pages
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
