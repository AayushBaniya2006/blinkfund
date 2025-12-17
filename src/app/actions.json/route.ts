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
      {
        pathPattern: "/api/actions/donate**",
        apiPath: "/api/actions/donate",
      },
    ],
  };

  return NextResponse.json(payload, {
    headers: {
      ...ACTIONS_CORS_HEADERS,
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: ACTIONS_CORS_HEADERS,
  });
}
