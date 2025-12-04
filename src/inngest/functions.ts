import { inngest } from "./client";
import { db } from "@/lib/db";
import { enhancePrompt, refinePrompt } from "@/lib/ai/openai";
import { generateVideo } from "@/lib/ai/veo";
import { analyzeVideo } from "@/lib/ai/gemini";
import { PIPELINE_CONFIG } from "@/lib/prompts";
import { createAdminClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

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
 * Main video generation pipeline
 * Handles the full flow: enhance → generate → analyze → (refine → repeat if needed)
 */
export const videoPipeline = inngest.createFunction(
  {
    id: "video-pipeline",
    name: "Video Generation Pipeline",
    retries: 0, // Handle retries manually for better control
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

      // Step 1: Enhance prompt (or refine if not first iteration)
      enhancedPrompt = await step.run(
        `enhance-prompt-${iteration}`,
        async () => {
          await db.job.update({
            where: { id: jobId },
            data: { currentStage: "enhancing_prompt" },
          });

          if (iteration === 1) {
            // First iteration: enhance the original prompt
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

      // Step 2: Generate video
      await step.run(`update-stage-generating-${iteration}`, async () => {
        await db.job.update({
          where: { id: jobId },
          data: { currentStage: "generating_video" },
        });
      });

      const videoResult = await step.run(
        `generate-video-${iteration}`,
        async () => {
          // Download reference images
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

      // Upload video to Supabase storage
      const videoUrl = await step.run(
        `upload-video-${iteration}`,
        async () => {
          // If the video is from Veo (external URL), download and re-upload to our storage
          // For now, use the URL directly
          // In production, you'd download the video and upload to Supabase
          
          const supabase = createAdminClient();
          const fileName = `videos/${jobId}/${uuidv4()}.mp4`;
          
          // For placeholder, just return the Veo URL
          // In production:
          // const videoResponse = await fetch(videoResult.videoUrl);
          // const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
          // await supabase.storage.from("celea-media").upload(fileName, videoBuffer);
          // return supabase.storage.from("celea-media").getPublicUrl(fileName).data.publicUrl;
          
          return videoResult.videoUrl;
        }
      );

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

      // Step 3: Analyze video
      await step.run(`update-stage-analyzing-${iteration}`, async () => {
        await db.job.update({
          where: { id: jobId },
          data: { currentStage: "analyzing_video" },
        });
      });

      const analysis = await step.run(
        `analyze-video-${iteration}`,
        async () => {
          return await analyzeVideo(videoUrl, userPrompt);
        }
      );

      // Update iteration with analysis
      await step.run(`update-iteration-analysis-${iteration}`, async () => {
        await db.iteration.update({
          where: { id: iterationRecord.id },
          data: {
            analysisResult: analysis,
            status: analysis.answer === "yes" ? "COMPLETED" : "COMPLETED",
          },
        });
      });

      // Check if video passes quality check
      if (analysis.answer === "yes") {
        finalVideoUrl = videoUrl;
        break;
      }

      // If not the last iteration, refine the prompt
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

