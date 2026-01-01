/**
 * Request Size Limits
 *
 * Prevents DoS attacks via memory exhaustion by limiting request body sizes.
 * All API routes should use parseJsonWithLimit() instead of req.json().
 */

import { NextResponse } from "next/server";

/**
 * Default size limits for different endpoint types (in bytes)
 */
export const REQUEST_SIZE_LIMITS = {
  /** Default limit for most endpoints */
  default: 100 * 1024, // 100KB
  /** Campaign creation/updates */
  campaigns: 50 * 1024, // 50KB
  /** Contact form submissions */
  contact: 10 * 1024, // 10KB
  /** Webhook payloads from payment providers */
  webhooks: 1024 * 1024, // 1MB
  /** Solana action requests */
  actions: 10 * 1024, // 10KB
  /** Wallet verification */
  wallet: 5 * 1024, // 5KB
} as const;

export type RequestSizeLimit = keyof typeof REQUEST_SIZE_LIMITS;

/**
 * Error response for payload too large
 */
export function payloadTooLarge(maxSize: number): NextResponse {
  return NextResponse.json(
    {
      error: "Payload Too Large",
      message: `Request body exceeds maximum size of ${Math.round(maxSize / 1024)}KB`,
    },
    { status: 413 }
  );
}

/**
 * Error response for invalid JSON
 */
export function invalidJson(): NextResponse {
  return NextResponse.json(
    {
      error: "Bad Request",
      message: "Invalid JSON in request body",
    },
    { status: 400 }
  );
}

/**
 * Parse JSON from request with size limit protection
 *
 * @param request - The incoming request
 * @param maxSize - Maximum allowed size in bytes (use REQUEST_SIZE_LIMITS)
 * @returns Parsed JSON or NextResponse error
 *
 * @example
 * ```typescript
 * const result = await parseJsonWithLimit(req, REQUEST_SIZE_LIMITS.campaigns);
 * if (result instanceof NextResponse) {
 *   return result; // Error response
 * }
 * const body = result; // Parsed JSON
 * ```
 */
export async function parseJsonWithLimit<T = unknown>(
  request: Request,
  maxSize: number = REQUEST_SIZE_LIMITS.default
): Promise<T | NextResponse> {
  // Check Content-Length header first (fast path)
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > maxSize) {
      return payloadTooLarge(maxSize);
    }
  }

  // Read body with streaming size check
  const reader = request.body?.getReader();
  if (!reader) {
    return invalidJson();
  }

  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      receivedLength += value.length;

      // Check size limit during streaming
      if (receivedLength > maxSize) {
        reader.cancel();
        return payloadTooLarge(maxSize);
      }
    }

    // Combine chunks into single buffer
    const body = new Uint8Array(receivedLength);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }

    // Decode and parse JSON
    const text = new TextDecoder().decode(body);
    return JSON.parse(text) as T;
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return invalidJson();
    }
    throw error;
  }
}

/**
 * Validate request body size without parsing
 * Useful for non-JSON payloads like webhooks that need raw body
 *
 * @param request - The incoming request
 * @param maxSize - Maximum allowed size in bytes
 * @returns true if valid, NextResponse error if too large
 */
export async function validateBodySize(
  request: Request,
  maxSize: number = REQUEST_SIZE_LIMITS.default
): Promise<true | NextResponse> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > maxSize) {
      return payloadTooLarge(maxSize);
    }
  }
  return true;
}

/**
 * Get raw body with size limit protection
 * For webhooks that need to verify signatures on raw body
 *
 * @param request - The incoming request
 * @param maxSize - Maximum allowed size in bytes
 * @returns Raw body string or NextResponse error
 */
export async function getRawBodyWithLimit(
  request: Request,
  maxSize: number = REQUEST_SIZE_LIMITS.webhooks
): Promise<string | NextResponse> {
  // Check Content-Length header first
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > maxSize) {
      return payloadTooLarge(maxSize);
    }
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return "";
  }

  const chunks: Uint8Array[] = [];
  let receivedLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      receivedLength += value.length;

      if (receivedLength > maxSize) {
        reader.cancel();
        return payloadTooLarge(maxSize);
      }
    }

    const body = new Uint8Array(receivedLength);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder().decode(body);
  } catch {
    return "";
  }
}
