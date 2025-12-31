/**
 * Solana Actions Error Response Helpers
 *
 * Provides standardized error responses for Solana Actions endpoints.
 * Ensures compliance with the Actions protocol error format.
 */

import { NextResponse } from "next/server";
import { ACTIONS_CORS_HEADERS } from "@solana/actions";
import { SOLANA_CONFIG, BLOCKCHAIN_IDS, ACTION_VERSION } from "./config";

/**
 * Get headers for Solana Actions responses
 * Includes required X-Action-Version and X-Blockchain-Ids headers
 */
function getActionHeaders(
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  return {
    ...ACTIONS_CORS_HEADERS,
    "X-Action-Version": ACTION_VERSION,
    "X-Blockchain-Ids": BLOCKCHAIN_IDS[SOLANA_CONFIG.CLUSTER],
    ...extraHeaders,
  };
}

/**
 * Standard error response format for Solana Actions
 * The `message` field is required by the protocol
 */
export interface ActionErrorResponse {
  message: string;
  error?: string; // For backwards compatibility
}

/**
 * Create a standardized error response for Actions endpoints
 *
 * @param message - Human-readable error message
 * @param status - HTTP status code (default 400)
 * @returns NextResponse with proper headers and format
 */
export function actionErrorResponse(
  message: string,
  status: number = 400,
): NextResponse<ActionErrorResponse> {
  return NextResponse.json(
    {
      message,
      error: message, // Backwards compatibility
    },
    {
      status,
      headers: getActionHeaders(),
    },
  );
}

/**
 * Create a 400 Bad Request error response
 */
export function actionBadRequest(
  message: string,
): NextResponse<ActionErrorResponse> {
  return actionErrorResponse(message, 400);
}

/**
 * Create a 404 Not Found error response
 */
export function actionNotFound(
  message: string,
): NextResponse<ActionErrorResponse> {
  return actionErrorResponse(message, 404);
}

/**
 * Create a 500 Internal Server Error response
 */
export function actionServerError(
  message: string = "Internal server error",
): NextResponse<ActionErrorResponse> {
  return actionErrorResponse(message, 500);
}

/**
 * Create a 429 Rate Limited error response
 */
export function actionRateLimited(
  retryAfter: number,
): NextResponse<ActionErrorResponse> {
  return NextResponse.json(
    {
      message: "Too many requests. Please try again later.",
      error: "Rate limit exceeded",
    },
    {
      status: 429,
      headers: getActionHeaders({ "Retry-After": retryAfter.toString() }),
    },
  );
}
