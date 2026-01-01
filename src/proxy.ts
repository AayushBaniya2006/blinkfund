import { NextResponse } from "next/server";
import { auth } from "./auth";
import type { NextRequest } from "next/server";
import { isSuperAdmin } from "./lib/auth/withSuperAdminAuthRequired";

export async function proxy(req: NextRequest) {
  const session = await auth();
  const isAuth = !!session?.user;

  const isAPI = req.nextUrl.pathname.startsWith("/api/app");

  const isAuthPage =
    req.nextUrl.pathname.startsWith("/sign-in") ||
    req.nextUrl.pathname.startsWith("/sign-up") ||
    req.nextUrl.pathname.startsWith("/sign-out");

  if (isAuthPage) {
    if (isAuth && !req.nextUrl.pathname.startsWith("/sign-out")) {
      return NextResponse.redirect(new URL("/app", req.url));
    }
    return NextResponse.next();
  }

  if (isAPI) {
    if (!isAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!isAuth && req.nextUrl.pathname.startsWith("/app")) {
    let callbackUrl = req.nextUrl.pathname;
    if (req.nextUrl.search) {
      callbackUrl += req.nextUrl.search;
    }

    return NextResponse.redirect(
      new URL(
        `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        req.url
      )
    );
  }

  if (req.nextUrl.pathname.startsWith("/super-admin")) {
    // SECURITY: Use case-insensitive super admin check
    if (!isSuperAdmin(session?.user?.email)) {
      return NextResponse.redirect(
        new URL("/sign-in?error=unauthorized", req.url)
      );
    }
    // Allow access to super admin pages
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/app/:path*",
    "/app/:path*",
    "/sign-in",
    "/sign-up",
    "/sign-out",
    "/super-admin/:path*",
  ],
};
