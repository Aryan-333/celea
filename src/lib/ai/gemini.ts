/**
 * Gemini 2.5 Pro Integration for Celea
 * Used for: Prompt Enhancement + Video Analysis
 * 
 * FULL LOGGING ENABLED - No truncation
 */

import {
  googleAIRequest,
  uploadFileToGoogleAI,
  waitForFileProcessing,
  deleteFileFromGoogleAI,
} from "./google-client";
import {
  PROMPT_ENHANCEMENT_SYSTEM,
  PROMPT_REFINEMENT_SYSTEM,
  buildPromptEnhancementUserMessage,
  buildPromptRefinementUserMessage,
  buildVideoAnalysisPrompt,
} from "@/lib/prompts";

const GEMINI_MODEL = "gemini-2.5-pro";

// =============================================================================
// PROMPT ENHANCEMENT (Replaces GPT-4o)
// =============================================================================

export interface EnhancePromptParams {
  userPrompt: string;
  referenceImages?: string[]; // URLs to reference images
  aspectRatio?: string;
  resolution?: string;
  durationSeconds?: number;
  negativeTerms?: string[];
}

/**
 * Enhance a user's rough prompt into a cinema-grade Veo 3.1 prompt
 * Uses Gemini 2.5 Pro with optional reference images
 */
export async function enhancePrompt(params: EnhancePromptParams): Promise<string> {
  console.log("\n" + "█".repeat(80));
  console.log("█ GEMINI ENHANCE PROMPT - START");
  console.log("█".repeat(80));
  
  console.log("\n[Gemini] INPUT PARAMS:");
  console.log(JSON.stringify({
    userPrompt: params.userPrompt,
    referenceImages: params.referenceImages,
    aspectRatio: params.aspectRatio,
    resolution: params.resolution,
    durationSeconds: params.durationSeconds,
    negativeTerms: params.negativeTerms,
  }, null, 2));

  const userMessage = buildPromptEnhancementUserMessage(params);
  
  console.log("\n[Gemini] USER MESSAGE (FULL):");
  console.log("-".repeat(40));
  console.log(userMessage);
  console.log("-".repeat(40));

  // Build the content parts
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

  // Add reference images if provided
  if (params.referenceImages && params.referenceImages.length > 0) {
    console.log(`\n[Gemini] Processing ${params.referenceImages.length} reference images...`);
    for (const imageUrl of params.referenceImages.slice(0, 3)) {
      try {
        console.log(`[Gemini] Fetching image: ${imageUrl}`);
        // Download image and convert to base64
        const response = await fetch(imageUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "image/jpeg";
          console.log(`[Gemini] Image fetched: ${mimeType}, ${arrayBuffer.byteLength} bytes`);
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          });
        } else {
          console.error(`[Gemini] Failed to fetch image: ${response.status} ${response.statusText}`);
        }
      } catch (e) {
        console.error("[Gemini] Error fetching reference image:", imageUrl, e);
      }
    }
  }

  // Add the text prompt
  const fullPrompt = `${PROMPT_ENHANCEMENT_SYSTEM}\n\n${userMessage}`;
  
  console.log("\n[Gemini] SYSTEM PROMPT (FULL):");
  console.log("-".repeat(40));
  console.log(PROMPT_ENHANCEMENT_SYSTEM);
  console.log("-".repeat(40));
  
  console.log("\n[Gemini] COMBINED PROMPT (FULL):");
  console.log("-".repeat(40));
  console.log(fullPrompt);
  console.log("-".repeat(40));
  console.log(`[Gemini] Full prompt length: ${fullPrompt.length} chars`);
  
  parts.push({
    text: fullPrompt,
  });

  console.log(`\n[Gemini] Total parts: ${parts.length} (${parts.filter(p => p.inline_data).length} images, ${parts.filter(p => p.text).length} text)`);

  try {
    const response = await googleAIRequest<{
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
        finishReason?: string;
        safetyRatings?: Array<{ category: string; probability: string }>;
      }>;
      promptFeedback?: {
        blockReason?: string;
        safetyRatings?: Array<{ category: string; probability: string }>;
      };
      error?: {
        code: number;
        message: string;
        status: string;
      };
    }>(`/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      body: {
        contents: [
          {
            parts,
          },
        ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16384, // Gemini 2.5 Pro uses thinking tokens, need more headroom
      },
      },
    });

    // Check for API-level error
    if (response.error) {
      console.error(`[Gemini] API Error:`, response.error);
      throw new Error(`Gemini API Error: ${response.error.message}`);
    }

    // Check for prompt blocking
    if (response.promptFeedback?.blockReason) {
      console.error(`[Gemini] Prompt blocked:`, response.promptFeedback);
      throw new Error(`Prompt blocked by Gemini: ${response.promptFeedback.blockReason}`);
    }

    // Check candidates
    if (!response.candidates || response.candidates.length === 0) {
      console.error(`[Gemini] No candidates in response`);
      throw new Error("No candidates in Gemini response");
    }

    const candidate = response.candidates[0];
    console.log(`\n[Gemini] Candidate finish reason: ${candidate.finishReason}`);

    // Check finish reason
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      console.warn(`[Gemini] WARNING: Unusual finish reason: ${candidate.finishReason}`);
    }

    const text = candidate.content?.parts?.[0]?.text;
    if (!text) {
      console.error(`[Gemini] No text in response`);
      throw new Error("No text in Gemini response");
    }

    console.log("\n[Gemini] ENHANCED PROMPT OUTPUT (FULL):");
    console.log("=".repeat(40));
    console.log(text);
    console.log("=".repeat(40));
    console.log(`[Gemini] Output length: ${text.length} chars`);
    
    console.log("\n" + "█".repeat(80));
    console.log("█ GEMINI ENHANCE PROMPT - COMPLETE");
    console.log("█".repeat(80) + "\n");

    return text.trim();

  } catch (error) {
    console.error(`[Gemini] enhancePrompt error:`, error);
    console.log("█".repeat(80));
    console.log("█ GEMINI ENHANCE PROMPT - FAILED");
    console.log("█".repeat(80) + "\n");
    throw error;
  }
}

// =============================================================================
// PROMPT REFINEMENT (For iteration loop)
// =============================================================================

export interface RefinePromptParams {
  geminiAnalysis: { answer: string; explanation: string };
  existingPrompt: string;
  originalUserGoal: string;
  referenceImages?: string[]; // URLs of reference images
}

/**
 * Refine a prompt based on video analysis feedback
 * Now includes reference images for visual context (similar to enhancePrompt)
 */
export async function refinePrompt(params: RefinePromptParams): Promise<string> {
  console.log("\n" + "█".repeat(80));
  console.log("█ GEMINI REFINE PROMPT - START");
  console.log("█".repeat(80));
  
  console.log("\n[Gemini] REFINEMENT INPUT:");
  console.log(JSON.stringify({
    ...params,
    referenceImages: params.referenceImages?.length || 0,
  }, null, 2));
  
  const userMessage = buildPromptRefinementUserMessage(params);
  
  console.log("\n[Gemini] REFINEMENT SYSTEM PROMPT (FULL):");
  console.log("-".repeat(40));
  console.log(PROMPT_REFINEMENT_SYSTEM);
  console.log("-".repeat(40));
  
  console.log("\n[Gemini] REFINEMENT USER MESSAGE (FULL):");
  console.log("-".repeat(40));
  console.log(userMessage);
  console.log("-".repeat(40));

  // Build the content parts (similar to enhancePrompt)
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

  // Add reference images if provided
  if (params.referenceImages && params.referenceImages.length > 0) {
    console.log(`\n[Gemini] Processing ${params.referenceImages.length} reference images for refinement...`);
    for (const imageUrl of params.referenceImages.slice(0, 3)) {
      try {
        console.log(`[Gemini] Fetching image: ${imageUrl}`);
        const response = await fetch(imageUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "image/jpeg";
          console.log(`[Gemini] Image fetched: ${mimeType}, ${arrayBuffer.byteLength} bytes`);
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          });
        } else {
          console.error(`[Gemini] Failed to fetch image: ${response.status} ${response.statusText}`);
        }
      } catch (e) {
        console.error("[Gemini] Error fetching reference image:", imageUrl, e);
      }
    }
  }

  const fullPrompt = `${PROMPT_REFINEMENT_SYSTEM}\n\n${userMessage}`;
  console.log(`\n[Gemini] Combined prompt length: ${fullPrompt.length} chars`);

  // Add the text prompt
  parts.push({ text: fullPrompt });

  console.log(`\n[Gemini] Total parts: ${parts.length} (${parts.filter(p => p.inline_data).length} images, ${parts.filter(p => p.text).length} text)`);

  try {
    const response = await googleAIRequest<{
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
        finishReason?: string;
      }>;
      promptFeedback?: {
        blockReason?: string;
      };
      error?: {
        code: number;
        message: string;
      };
    }>(`/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      body: {
        contents: [
          {
            parts,
          },
        ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 16384, // Gemini 2.5 Pro uses thinking tokens, need more headroom
      },
      },
    });

    if (response.error) {
      throw new Error(`Gemini API Error: ${response.error.message}`);
    }

    if (response.promptFeedback?.blockReason) {
      throw new Error(`Prompt blocked: ${response.promptFeedback.blockReason}`);
    }

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error(`[Gemini] No text in refine response`);
      throw new Error("No response from Gemini for prompt refinement");
    }

    console.log("\n[Gemini] REFINED PROMPT OUTPUT (FULL):");
    console.log("=".repeat(40));
    console.log(text);
    console.log("=".repeat(40));
    console.log(`[Gemini] Output length: ${text.length} chars`);
    
    console.log("\n" + "█".repeat(80));
    console.log("█ GEMINI REFINE PROMPT - COMPLETE");
    console.log("█".repeat(80) + "\n");

    return text.trim();

  } catch (error) {
    console.error(`[Gemini] refinePrompt error:`, error);
    console.log("█".repeat(80));
    console.log("█ GEMINI REFINE PROMPT - FAILED");
    console.log("█".repeat(80) + "\n");
    throw error;
  }
}

// =============================================================================
// VIDEO ANALYSIS
// =============================================================================

export interface AnalysisResult {
  answer: "yes" | "no";
  explanation: string;
}

/**
 * Analyze a video against the user's original goal using Gemini 2.5 Pro
 * Uses the Files API for video upload
 */
export async function analyzeVideo(
  videoUrl: string,
  userGoal: string,
  enhancedPrompt?: string
): Promise<AnalysisResult> {
  console.log("\n" + "█".repeat(80));
  console.log("█ GEMINI ANALYZE VIDEO - START");
  console.log("█".repeat(80));
  
  console.log("\n[Gemini] ANALYSIS INPUT:");
  console.log(`[Gemini] Video URL: ${videoUrl}`);
  console.log(`[Gemini] User Goal (FULL): ${userGoal}`);
  if (enhancedPrompt) {
    console.log(`[Gemini] Enhanced Prompt (used for generation): ${enhancedPrompt.substring(0, 200)}...`);
  }

  // Download the video
  // If it's a Google AI URL, we need to add the API key header
  const isGoogleAIUrl = videoUrl.includes("generativelanguage.googleapis.com");
  const fetchHeaders: HeadersInit = isGoogleAIUrl
    ? { "x-goog-api-key": process.env.GOOGLE_AI_API_KEY || "" }
    : {};
  
  console.log(`[Gemini] Fetching video (Google AI URL: ${isGoogleAIUrl})`);
  
  const videoResponse = await fetch(videoUrl, { headers: fetchHeaders });
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.status} ${videoResponse.statusText}`);
  }

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  const videoSize = videoBuffer.length;
  console.log(`[Gemini] Video size: ${videoSize} bytes (${(videoSize / 1024 / 1024).toFixed(2)} MB)`);

  const prompt = buildVideoAnalysisPrompt({ userGoal, enhancedPrompt });
  
  console.log("\n[Gemini] VIDEO ANALYSIS PROMPT (FULL):");
  console.log("-".repeat(40));
  console.log(prompt);
  console.log("-".repeat(40));

  let fileName: string | null = null;

  // For small videos (<20MB), use inline data; for larger, use Files API
  if (videoSize < 20 * 1024 * 1024) {
    console.log(`[Gemini] Using inline data for small video`);
    // Use inline data for small videos
    const base64Video = videoBuffer.toString("base64");

    const response = await googleAIRequest<{
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      error?: { message: string };
    }>(`/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      body: {
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "video/mp4",
                  data: base64Video,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      },
    });

    if (response.error) {
      throw new Error(`Gemini API Error: ${response.error.message}`);
    }

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = parseAnalysisResponse(text);
    
    console.log("\n[Gemini] ANALYSIS RESULT (FULL):");
    console.log("=".repeat(40));
    console.log(JSON.stringify(result, null, 2));
    console.log("=".repeat(40));
    
    console.log("\n" + "█".repeat(80));
    console.log("█ GEMINI ANALYZE VIDEO - COMPLETE");
    console.log("█".repeat(80) + "\n");
    
    return result;
  } else {
    console.log(`[Gemini] Using Files API for large video`);
    // Use Files API for larger videos
    const uploadResult = await uploadFileToGoogleAI(
      videoBuffer,
      "video/mp4",
      `video-${Date.now()}.mp4`
    );

    fileName = uploadResult.name;
    const fileUri = uploadResult.uri;

    // Wait for processing
    await waitForFileProcessing(fileName.replace("files/", ""));

    const response = await googleAIRequest<{
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
      error?: { message: string };
    }>(`/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      body: {
        contents: [
          {
            parts: [
              {
                file_data: {
                  mime_type: "video/mp4",
                  file_uri: fileUri,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
      },
    });

    // Cleanup uploaded file
    if (fileName) {
      try {
        await deleteFileFromGoogleAI(fileName);
      } catch (e) {
        console.error("Failed to delete uploaded file:", e);
      }
    }

    if (response.error) {
      throw new Error(`Gemini API Error: ${response.error.message}`);
    }

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = parseAnalysisResponse(text);
    
    console.log("\n[Gemini] ANALYSIS RESULT (FULL):");
    console.log("=".repeat(40));
    console.log(JSON.stringify(result, null, 2));
    console.log("=".repeat(40));
    
    console.log("\n" + "█".repeat(80));
    console.log("█ GEMINI ANALYZE VIDEO - COMPLETE");
    console.log("█".repeat(80) + "\n");
    
    return result;
  }
}

/**
 * Parse the analysis response from Gemini
 */
function parseAnalysisResponse(text: string | undefined): AnalysisResult {
  console.log("\n[Gemini] RAW ANALYSIS RESPONSE (FULL):");
  console.log("-".repeat(40));
  console.log(text || "(undefined)");
  console.log("-".repeat(40));
  
  if (!text) {
    return {
      answer: "no",
      explanation: "No response from Gemini for video analysis",
    };
  }

  try {
    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to determine answer from text
      const lowerText = text.toLowerCase();
      if (lowerText.includes('"yes"') || lowerText.includes("'yes'")) {
        return {
          answer: "yes",
          explanation: text,
        };
      }
      return {
        answer: "no",
        explanation: text,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("[Gemini] Parsed JSON:", JSON.stringify(parsed, null, 2));
    
    return {
      answer: parsed.answer?.toLowerCase() === "yes" ? "yes" : "no",
      explanation: parsed.explanation || "No explanation provided",
    };
  } catch (parseError) {
    console.error("[Gemini] Failed to parse response:", parseError);
    return {
      answer: "no",
      explanation: `Analysis parsing failed. Raw response: ${text}`,
    };
  }
}
