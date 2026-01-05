/**
 * Solana Actions Manifest
 * Serves the actions.json file at /actions.json
 * Required by wallets to discover Solana Actions
 */

import { NextResponse } from "next/server";
import { ACTIONS_CORS_HEADERS } from "@solana/actions";

export async function GET() {
  const payload = {
    rules: [
      // Map campaign page URLs to donate action (for X/Twitter unfurling)
      {
        pathPattern: "/campaign/*",
        apiPath: "/api/actions/donate?slug=*",
      },
      // Map direct API calls
      {
        pathPattern: "/api/actions/donate**",
        apiPath: "/api/actions/donate",
      },
    ],
  };

  return NextResponse.json(payload, {
    headers: {
      ...ACTIONS_CORS_HEADERS,
      "Cache-Control": "no-store, no-cache, must-revalidate", // No caching to ensure updates propagate
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: ACTIONS_CORS_HEADERS,
  });
}
