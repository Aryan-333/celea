import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHash } from "crypto";

const INVITE_COOKIE_NAME = "celea_invite_verified";

// Verify cookie signature
function verifyCookieSignature(cookieValue: string): boolean {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  
  const [value, signature] = parts;
  const secret = process.env.INVITE_SECRET || "celea-default-secret-change-in-production";
  const expectedSignature = createHash("sha256").update(value + secret).digest("hex").slice(0, 16);
  
  return signature === expectedSignature;
}

// Routes that require invite code verification
const PROTECTED_ROUTES = ["/projects"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if the route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check for valid invite cookie
  const inviteCookie = request.cookies.get(INVITE_COOKIE_NAME);
  
  if (!inviteCookie?.value) {
    // No cookie - redirect to invite page
    return NextResponse.redirect(new URL("/invite", request.url));
  }

  // Verify cookie signature to prevent tampering
  if (!verifyCookieSignature(inviteCookie.value)) {
    // Invalid/tampered cookie - redirect to invite page
    const response = NextResponse.redirect(new URL("/invite", request.url));
    // Clear the invalid cookie
    response.cookies.delete(INVITE_COOKIE_NAME);
    return response;
  }

  // Valid invite - allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all /projects routes
    "/projects/:path*",
  ],
};

