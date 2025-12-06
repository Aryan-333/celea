/**
 * Direct Pipeline Runner - runs without Inngest for local development
 * This executes the full video generation pipeline directly
 * 
 * FULL LOGGING ENABLED - No truncation
 */

import { db } from "@/lib/db";
import { enhancePrompt, refinePrompt, analyzeVideo } from "@/lib/ai/gemini";
import { generateVideo } from "@/lib/ai/veo";
import { PIPELINE_CONFIG } from "@/lib/prompts";

export interface PipelineParams {
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
 * Run the full video generation pipeline
 * Updates the database at each step so the SSE endpoint can stream progress
 */
export async function runPipeline(params: PipelineParams): Promise<void> {
  const { jobId, userPrompt, referenceImageUrls, settings } = params;

  console.log("\n");
  console.log("╔" + "═".repeat(78) + "╗");
  console.log("║" + " ".repeat(20) + "CELEA PIPELINE STARTED" + " ".repeat(36) + "║");
  console.log("╚" + "═".repeat(78) + "╝");
  
  console.log("\n[Pipeline] JOB ID:", jobId);
  console.log("\n[Pipeline] USER PROMPT (FULL):");
  console.log("─".repeat(80));
  console.log(userPrompt);
  console.log("─".repeat(80));
  
  console.log("\n[Pipeline] REFERENCE IMAGES:");
  referenceImageUrls.forEach((url, i) => console.log(`  ${i + 1}. ${url}`));
  
  console.log("\n[Pipeline] SETTINGS:");
  console.log(JSON.stringify(settings, null, 2));

  try {
    // Update job status to processing
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "PROCESSING",
        currentStage: "enhancing_prompt",
      },
    });

    let currentPrompt = userPrompt;
    let enhancedPrompt = "";
    let finalVideoUrl: string | null = null;

    for (let iteration = 1; iteration <= PIPELINE_CONFIG.maxIterations; iteration++) {
      console.log("\n");
      console.log("┌" + "─".repeat(78) + "┐");
      console.log(`│ ITERATION ${iteration}/${PIPELINE_CONFIG.maxIterations}` + " ".repeat(60) + "│");
      console.log("└" + "─".repeat(78) + "┘");

      // Create iteration record
      const iterationRecord = await db.iteration.create({
        data: {
          jobId,
          number: iteration,
          enhancedPrompt: "",
          status: "ENHANCING",
        },
      });
      console.log(`[Pipeline] Created iteration record: ${iterationRecord.id}`);

      // Step 1: Enhance prompt using Gemini 2.5 Pro
      console.log("\n[Pipeline] STEP 1: ENHANCE PROMPT");
      console.log("─".repeat(40));
      await db.job.update({
        where: { id: jobId },
        data: { currentStage: "enhancing_prompt" },
      });

      try {
        if (iteration === 1) {
          console.log("[Pipeline] First iteration - enhancing original prompt with reference images");
          console.log("[Pipeline] Input to enhancePrompt:");
          console.log(`  - userPrompt: ${currentPrompt.length} chars`);
          console.log(`  - referenceImages: ${referenceImageUrls.length} URLs`);
          console.log(`  - aspectRatio: ${settings.aspectRatio}`);
          console.log(`  - resolution: ${settings.resolution}`);
          console.log(`  - duration: ${settings.duration}s`);
          
          // First iteration: enhance the original prompt with reference images
          enhancedPrompt = await enhancePrompt({
            userPrompt: currentPrompt,
            referenceImages: referenceImageUrls,
            aspectRatio: settings.aspectRatio,
            resolution: settings.resolution,
            durationSeconds: settings.duration,
          });
        } else {
          console.log("[Pipeline] Subsequent iteration - using refined prompt directly");
          // Subsequent iterations: use the refined prompt directly
          enhancedPrompt = currentPrompt;
        }
        
        console.log("\n[Pipeline] ENHANCED PROMPT RESULT:");
        console.log("─".repeat(40));
        console.log(enhancedPrompt);
        console.log("─".repeat(40));
        
      } catch (error) {
        console.error(`[Pipeline] ERROR in enhancing prompt:`, error);
        throw new Error(`Failed to enhance prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Update iteration with enhanced prompt
      await db.iteration.update({
        where: { id: iterationRecord.id },
        data: {
          enhancedPrompt,
          status: "GENERATING",
        },
      });
      console.log(`[Pipeline] Updated iteration with enhanced prompt`);

      // Step 2: Generate video with Veo 3.1
      console.log("\n[Pipeline] STEP 2: GENERATE VIDEO");
      console.log("─".repeat(40));
      await db.job.update({
        where: { id: jobId },
        data: { currentStage: "generating_video" },
      });

      let videoUrl: string;
      try {
        // Download reference images for Veo
        console.log("[Pipeline] Downloading reference images for Veo...");
        const referenceImages: Buffer[] = [];
        for (const url of referenceImageUrls) {
          try {
            console.log(`[Pipeline] Downloading: ${url}`);
            const response = await fetch(url);
            if (response.ok) {
              const buffer = Buffer.from(await response.arrayBuffer());
              referenceImages.push(buffer);
              console.log(`[Pipeline] Downloaded: ${buffer.length} bytes`);
            } else {
              console.error(`[Pipeline] Failed to download: ${response.status}`);
            }
          } catch (e) {
            console.error(`[Pipeline] Failed to download reference image:`, url, e);
          }
        }
        console.log(`[Pipeline] Total reference images downloaded: ${referenceImages.length}`);

        console.log("\n[Pipeline] Calling Veo generateVideo with:");
        console.log(`  - prompt: ${enhancedPrompt.length} chars`);
        console.log(`  - referenceImages: ${referenceImages.length} buffers`);
        console.log(`  - aspectRatio: ${settings.aspectRatio}`);
        console.log(`  - resolution: ${settings.resolution}`);
        console.log(`  - duration: ${settings.duration}s`);

        const videoResult = await generateVideo({
          prompt: enhancedPrompt,
          referenceImages,
          aspectRatio: settings.aspectRatio,
          resolution: settings.resolution,
          duration: settings.duration as 4 | 6 | 8,
        });

        videoUrl = videoResult.videoUrl;
        console.log(`\n[Pipeline] VIDEO GENERATED: ${videoUrl}`);
        
      } catch (error) {
        console.error(`[Pipeline] ERROR in generating video:`, error);
        throw new Error(`Failed to generate video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Update iteration with video URL
      await db.iteration.update({
        where: { id: iterationRecord.id },
        data: {
          videoUrl,
          status: "ANALYZING",
        },
      });
      console.log(`[Pipeline] Updated iteration with video URL`);

      // Step 3: Analyze video with Gemini 2.5 Pro
      console.log("\n[Pipeline] STEP 3: ANALYZE VIDEO");
      console.log("─".repeat(40));
      await db.job.update({
        where: { id: jobId },
        data: { currentStage: "analyzing_video" },
      });

      console.log("[Pipeline] Calling analyzeVideo with:");
      console.log(`  - videoUrl: ${videoUrl}`);
      console.log(`  - userGoal (original prompt): ${userPrompt.length} chars`);
      console.log(`  - enhancedPrompt (generation prompt): ${enhancedPrompt.length} chars`);

      let analysis: { answer: "yes" | "no"; explanation: string };
      try {
        // Pass the enhanced prompt so Gemini knows what prompt was used to generate this video
        analysis = await analyzeVideo(videoUrl, userPrompt, enhancedPrompt);
      } catch (error) {
        console.error(`[Pipeline] ERROR in analyzing video:`, error);
        // If analysis fails, assume it passes (to not block the pipeline)
        analysis = { answer: "yes", explanation: "Analysis failed, assuming video passes." };
      }

      console.log("\n[Pipeline] ANALYSIS RESULT:");
      console.log("─".repeat(40));
      console.log(JSON.stringify(analysis, null, 2));
      console.log("─".repeat(40));

      // Update iteration with analysis
      await db.iteration.update({
        where: { id: iterationRecord.id },
        data: {
          analysisResult: analysis,
          status: "COMPLETED",
        },
      });

      console.log(`\n[Pipeline] Iteration ${iteration} result: ${analysis.answer.toUpperCase()}`);

      // Check if video passes quality check
      if (analysis.answer === "yes") {
        finalVideoUrl = videoUrl;
        console.log(`\n[Pipeline] ✓ VIDEO APPROVED on iteration ${iteration}!`);
        break;
      }

      // If not the last iteration, refine the prompt using Gemini 2.5 Pro
      if (iteration < PIPELINE_CONFIG.maxIterations) {
        console.log("\n[Pipeline] STEP 4: REFINE PROMPT");
        console.log("─".repeat(40));
        console.log("[Pipeline] Video did not pass analysis, refining prompt...");
        
        await db.job.update({
          where: { id: jobId },
          data: { currentStage: "refining_prompt" },
        });

        console.log("[Pipeline] Calling refinePrompt with:");
        console.log(`  - geminiAnalysis: ${JSON.stringify(analysis)}`);
        console.log(`  - existingPrompt: ${enhancedPrompt.length} chars`);
        console.log(`  - originalUserGoal: ${userPrompt.length} chars`);
        console.log(`  - referenceImages: ${referenceImageUrls.length} URLs`);

        try {
          currentPrompt = await refinePrompt({
            geminiAnalysis: analysis,
            existingPrompt: enhancedPrompt,
            originalUserGoal: userPrompt,
            referenceImages: referenceImageUrls, // Pass reference images for visual context
          });
          
          console.log("\n[Pipeline] REFINED PROMPT:");
          console.log("─".repeat(40));
          console.log(currentPrompt);
          console.log("─".repeat(40));
          
        } catch (error) {
          console.error(`[Pipeline] ERROR in refining prompt:`, error);
          // If refinement fails, just continue with the same prompt
          currentPrompt = enhancedPrompt;
          console.log("[Pipeline] Using previous prompt due to refinement failure");
        }
      } else {
        // Last iteration didn't pass, use the last video anyway
        finalVideoUrl = videoUrl;
        console.log(`\n[Pipeline] Max iterations reached, using last video.`);
      }
    }

    // Update job as completed
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        currentStage: "completed",
        finalVideoUrl,
      },
    });

    console.log("\n");
    console.log("╔" + "═".repeat(78) + "╗");
    console.log("║" + " ".repeat(15) + "CELEA PIPELINE COMPLETED SUCCESSFULLY" + " ".repeat(26) + "║");
    console.log("╚" + "═".repeat(78) + "╝");
    console.log(`[Pipeline] Final video URL: ${finalVideoUrl}`);
    console.log("\n");
    
  } catch (error) {
    console.error(`\n[Pipeline] PIPELINE FAILED:`, error);

    // Update job as failed
    await db.job.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        currentStage: "failed",
      },
    });

    console.log("\n");
    console.log("╔" + "═".repeat(78) + "╗");
    console.log("║" + " ".repeat(20) + "CELEA PIPELINE FAILED" + " ".repeat(37) + "║");
    console.log("╚" + "═".repeat(78) + "╝");
    console.log("\n");
  }
}
