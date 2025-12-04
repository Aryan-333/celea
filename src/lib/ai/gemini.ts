/**
 * Gemini 2.5 Pro Integration for Celea
 * Used for: Prompt Enhancement + Video Analysis
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
  const userMessage = buildPromptEnhancementUserMessage(params);

  // Build the content parts
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

  // Add reference images if provided
  if (params.referenceImages && params.referenceImages.length > 0) {
    for (const imageUrl of params.referenceImages.slice(0, 3)) {
      try {
        // Download image and convert to base64
        const response = await fetch(imageUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString("base64");
          const mimeType = response.headers.get("content-type") || "image/jpeg";
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          });
        }
      } catch (e) {
        console.error("Failed to fetch reference image:", imageUrl, e);
      }
    }
  }

  // Add the text prompt
  parts.push({
    text: `${PROMPT_ENHANCEMENT_SYSTEM}\n\n${userMessage}`,
  });

  const response = await googleAIRequest<{
    candidates: Array<{
      content: {
        parts: Array<{ text: string }>;
      };
    }>;
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
        maxOutputTokens: 1024,
      },
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response from Gemini for prompt enhancement");
  }

  return text.trim();
}

// =============================================================================
// PROMPT REFINEMENT (For iteration loop)
// =============================================================================

export interface RefinePromptParams {
  geminiAnalysis: { answer: string; explanation: string };
  existingPrompt: string;
  originalUserGoal: string;
}

/**
 * Refine a prompt based on video analysis feedback
 */
export async function refinePrompt(params: RefinePromptParams): Promise<string> {
  const userMessage = buildPromptRefinementUserMessage(params);

  const response = await googleAIRequest<{
    candidates: Array<{
      content: {
        parts: Array<{ text: string }>;
      };
    }>;
  }>(`/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    body: {
      contents: [
        {
          parts: [
            {
              text: `${PROMPT_REFINEMENT_SYSTEM}\n\n${userMessage}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    },
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("No response from Gemini for prompt refinement");
  }

  return text.trim();
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
  userGoal: string
): Promise<AnalysisResult> {
  // Download the video
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
  }

  const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
  const videoSize = videoBuffer.length;

  let fileUri: string;
  let fileName: string | null = null;

  // For small videos (<20MB), use inline data; for larger, use Files API
  if (videoSize < 20 * 1024 * 1024) {
    // Use inline data for small videos
    const base64Video = videoBuffer.toString("base64");
    const prompt = buildVideoAnalysisPrompt(userGoal);

    const response = await googleAIRequest<{
      candidates: Array<{
        content: {
          parts: Array<{ text: string }>;
        };
      }>;
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

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    return parseAnalysisResponse(text);
  } else {
    // Use Files API for larger videos
    const uploadResult = await uploadFileToGoogleAI(
      videoBuffer,
      "video/mp4",
      `video-${Date.now()}.mp4`
    );

    fileName = uploadResult.name;
    fileUri = uploadResult.uri;

    // Wait for processing
    await waitForFileProcessing(fileName.replace("files/", ""));

    const prompt = buildVideoAnalysisPrompt(userGoal);

    const response = await googleAIRequest<{
      candidates: Array<{
        content: {
          parts: Array<{ text: string }>;
        };
      }>;
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

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    return parseAnalysisResponse(text);
  }
}

/**
 * Parse the analysis response from Gemini
 */
function parseAnalysisResponse(text: string | undefined): AnalysisResult {
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
    return {
      answer: parsed.answer?.toLowerCase() === "yes" ? "yes" : "no",
      explanation: parsed.explanation || "No explanation provided",
    };
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", text);
    return {
      answer: "no",
      explanation: `Analysis parsing failed. Raw response: ${text.substring(0, 500)}`,
    };
  }
}
