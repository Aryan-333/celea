import { inngest } from "./client";
import { db } from "@/lib/db";
import { enhancePrompt, refinePrompt, analyzeVideo } from "@/lib/ai/gemini";
import { generateVideo } from "@/lib/ai/veo";
import { PIPELINE_CONFIG } from "@/lib/prompts";

interface PipelineStartData {
  jobId: string;
  userPrompt: string;
  referenceImageUrls: string[];
  settings: {
    aspectRatio: "16:9" | "9:16";
    resolution: "720p" | "1080p";
    duration: number;
  };
}

/**
 * Main video generation pipeline (PRODUCTION)
 * 
 * This runs as an Inngest background job, which can execute for up to 2 hours.
 * This is necessary because video generation with Veo 3.1 takes 5-10 minutes.
 * 
 * Handles the full flow: enhance → generate → analyze → (refine → repeat if needed)
 * Uses Gemini 2.5 Pro for all text operations and Veo 3.1 for video generation
 */
export const videoPipeline = inngest.createFunction(
  {
    id: "video-pipeline",
    name: "Video Generation Pipeline",
    retries: 1, // Retry once on failure
  },
  { event: "pipeline/start" },
  async ({ event, step }) => {
    const { jobId, userPrompt, referenceImageUrls, settings } =
      event.data as PipelineStartData;

    // Update job status to processing
    await step.run("update-job-processing", async () => {
      await db.job.update({
        where: { id: jobId },
        data: {
          status: "PROCESSING",
          currentStage: "enhancing_prompt",
        },
      });
    });

    let currentPrompt = userPrompt;
    let enhancedPrompt = "";
    let finalVideoUrl: string | null = null;

    for (
      let iteration = 1;
      iteration <= PIPELINE_CONFIG.maxIterations;
      iteration++
    ) {
      // Create iteration record
      const iterationRecord = await step.run(
        `create-iteration-${iteration}`,
        async () => {
          return await db.iteration.create({
            data: {
              jobId,
              number: iteration,
              enhancedPrompt: "",
              status: "ENHANCING",
            },
          });
        }
      );

      // Step 1: Enhance prompt using Gemini 2.5 Pro (with reference images)
      enhancedPrompt = await step.run(
        `enhance-prompt-${iteration}`,
        async () => {
          await db.job.update({
            where: { id: jobId },
            data: { currentStage: "enhancing_prompt" },
          });

          if (iteration === 1) {
            // First iteration: enhance the original prompt with reference images
            return await enhancePrompt({
              userPrompt: currentPrompt,
              referenceImages: referenceImageUrls,
              aspectRatio: settings.aspectRatio,
              resolution: settings.resolution,
              durationSeconds: settings.duration,
            });
          } else {
            // Subsequent iterations: use the refined prompt directly
            return currentPrompt;
          }
        }
      );

      // Update iteration with enhanced prompt
      await step.run(`update-iteration-prompt-${iteration}`, async () => {
        await db.iteration.update({
          where: { id: iterationRecord.id },
          data: {
            enhancedPrompt,
            status: "GENERATING",
          },
        });
      });

      // Step 2: Generate video with Veo 3.1
      await step.run(`update-stage-generating-${iteration}`, async () => {
        await db.job.update({
          where: { id: jobId },
          data: { currentStage: "generating_video" },
        });
      });

      const videoResult = await step.run(
        `generate-video-${iteration}`,
        async () => {
          // Download reference images for Veo
          const referenceImages: Buffer[] = [];
          for (const url of referenceImageUrls) {
            try {
              const response = await fetch(url);
              if (response.ok) {
                referenceImages.push(Buffer.from(await response.arrayBuffer()));
              }
            } catch (e) {
              console.error("Failed to download reference image:", url);
            }
          }

          return await generateVideo({
            prompt: enhancedPrompt,
            referenceImages,
            aspectRatio: settings.aspectRatio,
            resolution: settings.resolution,
            duration: settings.duration as 4 | 6 | 8,
          });
        }
      );

      const videoUrl = videoResult.videoUrl;

      // Update iteration with video URL
      await step.run(`update-iteration-video-${iteration}`, async () => {
        await db.iteration.update({
          where: { id: iterationRecord.id },
          data: {
            videoUrl,
            status: "ANALYZING",
          },
        });
      });

      // Step 3: Analyze video with Gemini 2.5 Pro
      await step.run(`update-stage-analyzing-${iteration}`, async () => {
        await db.job.update({
          where: { id: jobId },
          data: { currentStage: "analyzing_video" },
        });
      });

      const analysis = await step.run(
        `analyze-video-${iteration}`,
        async () => {
          // Pass the enhanced prompt so Gemini knows what was requested for this video
          return await analyzeVideo(videoUrl, userPrompt, enhancedPrompt);
        }
      );

      // Update iteration with analysis
      await step.run(`update-iteration-analysis-${iteration}`, async () => {
        await db.iteration.update({
          where: { id: iterationRecord.id },
          data: {
            analysisResult: analysis,
            status: "COMPLETED",
          },
        });
      });

      // Check if video passes quality check
      if (analysis.answer === "yes") {
        finalVideoUrl = videoUrl;
        break;
      }

      // If not the last iteration, refine the prompt using Gemini 2.5 Pro
      if (iteration < PIPELINE_CONFIG.maxIterations) {
        await step.run(`update-stage-refining-${iteration}`, async () => {
          await db.job.update({
            where: { id: jobId },
            data: { currentStage: "refining_prompt" },
          });
        });

        currentPrompt = await step.run(
          `refine-prompt-${iteration}`,
          async () => {
            return await refinePrompt({
              geminiAnalysis: analysis,
              existingPrompt: enhancedPrompt,
              originalUserGoal: userPrompt,
              referenceImages: referenceImageUrls, // Pass reference images for visual context
            });
          }
        );
      } else {
        // Last iteration didn't pass, use the last video anyway
        finalVideoUrl = videoUrl;
      }
    }

    // Update job as completed
    await step.run("complete-job", async () => {
      await db.job.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          currentStage: "completed",
          finalVideoUrl,
        },
      });
    });

    return {
      success: true,
      jobId,
      finalVideoUrl,
    };
  }
);

// Export all functions for the Inngest route
export const functions = [videoPipeline];
