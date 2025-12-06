import { NextRequest, NextResponse } from "next/server";
import { analyzeVideo } from "@/lib/ai/gemini";
import { z } from "zod";

const analyzeSchema = z.object({
  videoUrl: z.string().url(),
  userGoal: z.string().min(1),
  enhancedPrompt: z.string().optional(), // The prompt used to generate the video
});

// POST /api/analyze-video - Analyze video using Gemini 2.5 Pro
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = analyzeSchema.parse(body);

    const result = await analyzeVideo(
      validatedData.videoUrl,
      validatedData.userGoal,
      validatedData.enhancedPrompt
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error analyzing video:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to analyze video",
      },
      { status: 500 }
    );
  }
}
