import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inngest } from "@/inngest/client";
import { z } from "zod";
import { PIPELINE_CONFIG, validateVideoSettings } from "@/lib/prompts";

const pipelineSchema = z.object({
  projectId: z.string(),
  userPrompt: z.string().min(1),
  referenceImages: z
    .array(
      z.object({
        url: z.string(),
        filename: z.string(),
      })
    )
    .max(3)
    .optional(),
  settings: z.object({
    aspectRatio: z.enum(["16:9", "9:16"]).default("16:9"),
    resolution: z.enum(["720p", "1080p"]).default("1080p"),
    duration: z.number().refine((v) => [4, 6, 8].includes(v)).default(8),
  }),
  retentionDays: z.number().min(-1).max(365).default(PIPELINE_CONFIG.defaultRetentionDays),
});

// Use Inngest when:
// 1. In production on Vercel, OR
// 2. Explicitly enabled via USE_INNGEST=true (for local dev with Inngest Dev Server)
const useInngest = 
  (process.env.VERCEL === "1" && process.env.NODE_ENV === "production") ||
  process.env.USE_INNGEST === "true";

// POST /api/pipeline - Start video generation pipeline
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = pipelineSchema.parse(body);

    // Validate and potentially correct settings
    const settingsValidation = validateVideoSettings({
      aspectRatio: validatedData.settings.aspectRatio,
      resolution: validatedData.settings.resolution,
      duration: validatedData.settings.duration,
    });

    if (!settingsValidation.valid && settingsValidation.error) {
      return NextResponse.json(
        { success: false, error: settingsValidation.error },
        { status: 400 }
      );
    }

    // Apply corrected duration if needed
    const finalDuration = settingsValidation.correctedDuration || validatedData.settings.duration;

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id: validatedData.projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // Create job in database
    const job = await db.job.create({
      data: {
        projectId: validatedData.projectId,
        userPrompt: validatedData.userPrompt,
        settings: {
          aspectRatio: validatedData.settings.aspectRatio,
          resolution: validatedData.settings.resolution,
          duration: finalDuration,
        },
        status: "PENDING",
        retentionDays: validatedData.retentionDays,
        referenceImages: validatedData.referenceImages
          ? {
              create: validatedData.referenceImages.map((img) => ({
                url: img.url,
                filename: img.filename,
              })),
            }
          : undefined,
      },
      include: {
        referenceImages: true,
      },
    });

    // Start the pipeline
    if (useInngest) {
      // PRODUCTION: Use Inngest for background jobs (handles long-running tasks)
      console.log(`[Pipeline] Starting job ${job.id} via Inngest (production mode)`);
      await inngest.send({
        name: "pipeline/start",
        data: {
          jobId: job.id,
          userPrompt: validatedData.userPrompt,
          referenceImageUrls: validatedData.referenceImages?.map((img) => img.url) || [],
          settings: {
            aspectRatio: validatedData.settings.aspectRatio,
            resolution: validatedData.settings.resolution,
            duration: finalDuration,
          },
        },
      });
    } else {
      // DEVELOPMENT: Run pipeline directly (works with bun dev)
      console.log(`[Pipeline] Starting job ${job.id} via direct runner (dev mode)`);
      const { runPipeline } = await import("@/lib/pipeline-runner");
      runPipeline({
        jobId: job.id,
        userPrompt: validatedData.userPrompt,
        referenceImageUrls: validatedData.referenceImages?.map((img) => img.url) || [],
        settings: {
          aspectRatio: validatedData.settings.aspectRatio,
          resolution: validatedData.settings.resolution,
          duration: finalDuration,
        },
      }).catch((error) => {
        console.error("[Pipeline] Failed with unhandled error:", error);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId: job.id,
        status: "PENDING",
        message: useInngest 
          ? "Pipeline started via Inngest (background job)" 
          : "Pipeline started directly (dev mode)",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error starting pipeline:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to start pipeline" 
      },
      { status: 500 }
    );
  }
}
