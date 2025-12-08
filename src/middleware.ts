import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const INVITE_COOKIE_NAME = "celea_invite_verified";

// Simple hash using Web Crypto API (Edge Runtime compatible)
async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Verify cookie signature (async for Web Crypto)
async function verifyCookieSignature(cookieValue: string): Promise<boolean> {
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;

  const [value, signature] = parts;
  const secret = process.env.INVITE_SECRET || "celea-default-secret-change-in-production";
  const expectedSignature = (await hashString(value + secret)).slice(0, 16);

  return signature === expectedSignature;
}

// Routes that require invite code verification
const PROTECTED_ROUTES = ["/projects"];

export async function middleware(request: NextRequest) {
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
  const isValid = await verifyCookieSignature(inviteCookie.value);
  if (!isValid) {
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
