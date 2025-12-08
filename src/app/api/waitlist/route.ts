import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// Email validation schema
const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate email
    const validation = waitlistSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await db.waitlist.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "You're already on the waitlist! We'll be in touch soon.",
        alreadyExists: true,
      });
    }

    // Add to waitlist
    await db.waitlist.create({
      data: {
        email: normalizedEmail,
        source: "invite_page",
      },
    });

    return NextResponse.json({
      success: true,
      message: "You've been added to the waitlist! We'll send you an invite code soon.",
    });
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

