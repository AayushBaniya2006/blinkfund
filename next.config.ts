import type { NextConfig } from "next";

/**
 * Security Headers Configuration
 *
 * These headers protect against common web vulnerabilities:
 * - HSTS: Forces HTTPS connections
 * - X-Content-Type-Options: Prevents MIME type sniffing
 * - X-Frame-Options: Prevents clickjacking
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Restricts browser features
 * - CSP: Controls resource loading (commented - enable carefully)
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

/**
 * Content Security Policy
 * Uncomment and customize based on your needs
 * Start permissive and tighten as you identify all resource sources
 */
const cspHeader = {
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    // Scripts: self + inline for Next.js + eval for dev
    process.env.NODE_ENV === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'",
    // Styles: self + inline for Tailwind/CSS-in-JS
    "style-src 'self' 'unsafe-inline'",
    // Images: self + data URIs + HTTPS (for user-uploaded content)
    "img-src 'self' data: https: blob:",
    // Fonts: self + Google Fonts
    "font-src 'self' https://fonts.gstatic.com",
    // Connect: API calls to self + Solana RPC + Vercel analytics
    "connect-src 'self' https://*.solana.com wss://*.solana.com https://*.vercel-insights.com https://*.vercel-analytics.com",
    // Frame ancestors: none (clickjacking protection)
    "frame-ancestors 'none'",
    // Form action: self only
    "form-action 'self'",
    // Base URI: self only
    "base-uri 'self'",
    // Upgrade insecure requests in production
    process.env.NODE_ENV === "production" ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; "),
};

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // Enable CSP - uncomment when ready
          // cspHeader,
        ],
      },
      {
        // Solana Actions need permissive CORS for Twitter embeds
        // These endpoints use wallet signature verification instead of CSRF
        source: "/api/actions/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
          },
          {
            key: "Access-Control-Expose-Headers",
            value: "X-Action-Version, X-Blockchain-Ids",
          },
          // Still include non-CORS security headers
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      {
        // actions.json endpoint also needs CORS + no cache
        source: "/actions.json",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
      {
        // Webhook endpoints - restrict to POST only, no browser access
        source: "/api/webhooks/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
