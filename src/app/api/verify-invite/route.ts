import { NextRequest, NextResponse } from "next/server";
import { verifyInviteCode, INVITE_COOKIE_NAME, INVITE_COOKIE_MAX_AGE } from "@/lib/invite-codes";
import { createHash } from "crypto";

// Generate a secure session token
function generateSessionToken(): string {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(randomBytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Create a signed cookie value (prevents tampering)
function signCookieValue(value: string): string {
  const secret = process.env.INVITE_SECRET || "celea-default-secret-change-in-production";
  const signature = createHash("sha256").update(value + secret).digest("hex").slice(0, 16);
  return `${value}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    // Rate limiting check (basic - in production use Redis)
    const clientIP = request.headers.get("x-forwarded-for") || "unknown";
    
    // Verify the code
    const isValid = verifyInviteCode(code);

    if (!isValid) {
      // Add small delay to prevent brute force
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      return NextResponse.json(
        { success: false, error: "Invalid invite code" },
        { status: 401 }
      );
    }

    // Generate session token and sign it
    const sessionToken = generateSessionToken();
    const signedValue = signCookieValue(sessionToken);

    // Create response with secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: "Welcome to Celea!",
    });

    // Set secure HTTP-only cookie
    response.cookies.set(INVITE_COOKIE_NAME, signedValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: INVITE_COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Error verifying invite code:", error);
    return NextResponse.json(
      { success: false, error: "Verification failed" },
      { status: 500 }
    );
  }
}

