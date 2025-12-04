import { NextRequest, NextResponse } from "next/server";
import { generateVideo } from "@/lib/ai/veo";
import { z } from "zod";

const generateSchema = z.object({
  prompt: z.string().min(1),
  referenceImageUrls: z.array(z.string()).max(3).optional(),
  aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
  resolution: z.enum(["720p", "1080p"]).default("1080p"),
  duration: z.number().refine((v) => [4, 6, 8].includes(v)).default(8),
});

// POST /api/generate-video - Generate video using Veo 3.1
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = generateSchema.parse(body);

    // Download reference images if provided
    const referenceImages: Buffer[] = [];
    if (validatedData.referenceImageUrls) {
      for (const url of validatedData.referenceImageUrls) {
        const response = await fetch(url);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          referenceImages.push(buffer);
        }
      }
    }

    const result = await generateVideo({
      prompt: validatedData.prompt,
      referenceImages,
      aspectRatio: validatedData.aspectRatio,
      resolution: validatedData.resolution,
      duration: validatedData.duration as 4 | 6 | 8,
    });

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

    console.error("Error generating video:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate video",
      },
      { status: 500 }
    );
  }
}

