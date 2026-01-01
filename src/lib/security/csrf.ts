/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Provides CSRF token generation and verification for state-changing operations.
 *
 * Note: Solana Action endpoints (/api/actions/*) need Access-Control-Allow-Origin: *
 * for Twitter embeds, so they use wallet signature verification instead of CSRF tokens.
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * CSRF cookie configuration
 * Uses __Host- prefix for additional security (requires Secure, Path=/, no Domain)
 */
const CSRF_COOKIE_NAME = "__Host-csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(length: number = CSRF_TOKEN_LENGTH): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Create HMAC signature for the token
 */
async function signToken(token: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(token)
  );

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * Verify HMAC signature
 */
async function verifyTokenSignature(
  token: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await signToken(token, secret);

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Get the CSRF secret from environment
 * Falls back to AUTH_SECRET if CSRF_SECRET is not set
 */
function getCsrfSecret(): string {
  const secret = process.env.CSRF_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "CSRF_SECRET or AUTH_SECRET environment variable is required"
    );
  }
  return secret;
}

/**
 * Generate a new CSRF token and set it as a cookie
 *
 * Call this in your page/layout to generate a token for forms.
 * Returns the token value to include in forms/requests.
 *
 * @example
 * ```tsx
 * // In a Server Component or API route
 * const csrfToken = await generateCsrfToken();
 * // Pass to client component or include in form
 * <input type="hidden" name="csrf_token" value={csrfToken} />
 * ```
 */
export async function generateCsrfToken(): Promise<string> {
  const token = generateSecureToken();
  const secret = getCsrfSecret();
  const signature = await signToken(token, secret);

  const cookieValue = `${token}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
}

/**
 * Verify a CSRF token from a request
 *
 * Checks that:
 * 1. The token in the header/body matches the token in the cookie
 * 2. The cookie signature is valid
 *
 * @param tokenFromRequest - Token from request header or body
 * @returns true if valid, false otherwise
 */
export async function verifyCsrfToken(
  tokenFromRequest: string
): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(CSRF_COOKIE_NAME)?.value;

    if (!cookieValue) {
      return false;
    }

    const [storedToken, storedSignature] = cookieValue.split(".");

    if (!storedToken || !storedSignature) {
      return false;
    }

    // Verify the cookie signature
    const secret = getCsrfSecret();
    const isSignatureValid = await verifyTokenSignature(
      storedToken,
      storedSignature,
      secret
    );

    if (!isSignatureValid) {
      return false;
    }

    // Compare tokens (constant-time)
    if (tokenFromRequest.length !== storedToken.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < tokenFromRequest.length; i++) {
      result |= tokenFromRequest.charCodeAt(i) ^ storedToken.charCodeAt(i);
    }

    return result === 0;
  } catch {
    return false;
  }
}

/**
 * Get CSRF token from request (header or body)
 */
export function getCsrfTokenFromRequest(
  request: Request,
  body?: Record<string, unknown>
): string | null {
  // Check header first
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  // Check body
  if (body && typeof body.csrf_token === "string") {
    return body.csrf_token;
  }

  if (body && typeof body.csrfToken === "string") {
    return body.csrfToken;
  }

  return null;
}

/**
 * Middleware helper to require CSRF token validation
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const body = await parseJsonWithLimit(req, REQUEST_SIZE_LIMITS.default);
 *   if (body instanceof NextResponse) return body;
 *
 *   const csrfResult = await requireCsrfToken(req, body);
 *   if (csrfResult) return csrfResult; // Error response
 *
 *   // Proceed with request...
 * }
 * ```
 */
export async function requireCsrfToken(
  request: Request,
  body?: Record<string, unknown>
): Promise<NextResponse | null> {
  const token = getCsrfTokenFromRequest(request, body);

  if (!token) {
    return NextResponse.json(
      {
        error: "CSRF token missing",
        message:
          "This request requires a CSRF token. Include it in the x-csrf-token header or csrf_token body field.",
      },
      { status: 403 }
    );
  }

  const isValid = await verifyCsrfToken(token);

  if (!isValid) {
    return NextResponse.json(
      {
        error: "CSRF token invalid",
        message:
          "The CSRF token is invalid or expired. Please refresh the page and try again.",
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check if a route should skip CSRF validation
 *
 * Routes that should skip CSRF:
 * - Solana Actions (use wallet signatures instead)
 * - Webhooks (use provider signatures)
 * - Public read-only APIs
 */
export function shouldSkipCsrf(pathname: string): boolean {
  const skipPatterns = [
    // Solana Actions - use wallet signatures
    /^\/api\/actions\//,
    // Webhooks - use provider signatures
    /^\/api\/webhooks\//,
    // Wallet challenge/verify - uses its own signature system
    /^\/api\/wallet\//,
    // Donation confirmation - uses transaction signatures
    /^\/api\/donations\/confirm/,
  ];

  return skipPatterns.some((pattern) => pattern.test(pathname));
}

/**
 * CSRF token for client-side use
 * Export as a constant for easy access in client components
 */
export const CSRF_HEADER = CSRF_HEADER_NAME;
