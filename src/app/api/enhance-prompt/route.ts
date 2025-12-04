import { NextRequest, NextResponse } from "next/server";
import { enhancePrompt } from "@/lib/ai/gemini";
import { z } from "zod";

const enhanceSchema = z.object({
  userPrompt: z.string().min(1),
  referenceImages: z.array(z.string()).max(3).optional(),
  aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
  resolution: z.enum(["720p", "1080p"]).default("1080p"),
  durationSeconds: z.number().refine((v) => [4, 6, 8].includes(v)).default(8),
  negativeTerms: z.array(z.string()).optional(),
});

// POST /api/enhance-prompt - Enhance a prompt using Gemini 2.5 Pro
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = enhanceSchema.parse(body);

    const enhancedPrompt = await enhancePrompt({
      userPrompt: validatedData.userPrompt,
      referenceImages: validatedData.referenceImages,
      aspectRatio: validatedData.aspectRatio,
      resolution: validatedData.resolution,
      durationSeconds: validatedData.durationSeconds,
      negativeTerms: validatedData.negativeTerms,
    });

    return NextResponse.json({
      success: true,
      data: {
        originalPrompt: validatedData.userPrompt,
        enhancedPrompt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error enhancing prompt:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to enhance prompt",
      },
      { status: 500 }
    );
  }
}
