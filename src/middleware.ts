/**
 * Global Authentication & Security Middleware
 *
 * Centralized route protection to ensure consistent security across all routes.
 * This replaces ad-hoc auth checks in individual routes.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./auth";
import { isSuperAdmin } from "./lib/auth/withSuperAdminAuthRequired";

/**
 * Route configurations
 */
const ROUTE_CONFIG = {
  /** Routes that require authentication */
  protected: ["/app", "/api/app"],

  /** Routes that require super admin access */
  admin: ["/super-admin", "/api/super-admin"],

  /** Auth pages - redirect to /app if already authenticated */
  authPages: ["/sign-in", "/sign-up"],

  /** Public API routes - no auth required */
  publicApi: [
    "/api/actions",
    "/api/campaigns",
    "/api/wallet",
    "/api/donations",
    "/api/webhooks",
    "/api/contact",
    "/api/waitlist",
    "/api/og",
    "/api/upload",
  ],
};

/**
 * Check if a path matches any of the prefixes
 */
function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // === Public API Routes ===
  // These don't require authentication (they have their own security like wallet signatures)
  // Check this BEFORE calling auth() to avoid unnecessary auth checks
  if (matchesPrefix(pathname, ROUTE_CONFIG.publicApi)) {
    return NextResponse.next();
  }

  // Get session once for all checks (only for routes that need it)
  const session = await auth();
  const isAuthenticated = !!session?.user?.id;

  // === Auth Pages ===
  // Redirect authenticated users away from auth pages (except sign-out)
  if (matchesPrefix(pathname, ROUTE_CONFIG.authPages)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return NextResponse.next();
  }

  // Sign-out page - always accessible
  if (pathname.startsWith("/sign-out")) {
    return NextResponse.next();
  }

  // === Super Admin Routes ===
  if (matchesPrefix(pathname, ROUTE_CONFIG.admin)) {
    if (!isAuthenticated) {
      // Redirect to sign-in for pages, return 401 for API
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        );
      }
      return NextResponse.redirect(
        new URL(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`, request.url)
      );
    }

    // Check super admin status
    if (!isSuperAdmin(session.user.email)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden", message: "Super admin access required" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(
        new URL("/sign-in?error=unauthorized", request.url)
      );
    }

    return NextResponse.next();
  }

  // === Protected Routes ===
  if (matchesPrefix(pathname, ROUTE_CONFIG.protected)) {
    if (!isAuthenticated) {
      // Redirect to sign-in for pages, return 401 for API
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        );
      }

      // Build callback URL including search params
      let callbackUrl = pathname;
      if (request.nextUrl.search) {
        callbackUrl += request.nextUrl.search;
      }

      return NextResponse.redirect(
        new URL(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`, request.url)
      );
    }

    return NextResponse.next();
  }

  // === All other routes ===
  // Public routes - no auth required
  return NextResponse.next();
}

/**
 * Matcher configuration
 *
 * Run middleware on these paths. Excludes:
 * - Static files (_next/static, favicon, images)
 * - Public assets
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - public API routes (actions, og, webhooks, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/actions|api/og|api/webhooks|api/campaigns|api/wallet|api/donations|api/contact|api/waitlist|api/upload|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
