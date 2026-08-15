/**
 * middleware.ts — Next.js Edge Middleware for auth + route protection.
 *
 * Protects:
 *   - /dashboard/* — redirect unauthenticated users to /login
 *   - /api/analytics/* — return 401 JSON for unauthenticated API requests
 *
 * Public routes (no auth required):
 *   - /api/ingestion/* — Discord webhook (protected by DISCORD_PUBLIC_KEY signature, not session)
 *   - /api/health — health check
 *   - /api/auth/* — NextAuth endpoints
 *   - /login, /signup, /onboarding — public pages
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Let NextAuth's own routes through immediately.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Public API routes — no session needed.
  if (
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/ingestion")
  ) {
    return NextResponse.next();
  }

  // ── Protected routes ──────────────────────────────────────────────────────

  const isDashboardPage = pathname.startsWith("/dashboard");
  const isDashboardApi = pathname.startsWith("/api/analytics");

  if (isDashboardPage || isDashboardApi) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      if (isDashboardApi) {
        // API consumers get a JSON 401, not a redirect.
        return NextResponse.json(
          { error: "Unauthorized — valid session required" },
          { status: 401 }
        );
      }
      // Browser requests get redirected to login.
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on dashboard pages, dashboard APIs, and public APIs we
  // want to gate. Exclude static assets and _next internals.
  matcher: [
    "/dashboard/:path*",
    "/api/analytics/:path*",
    "/api/health",
    "/api/ingestion/:path*",
  ],
};
