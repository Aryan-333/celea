import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildVideoAnalysisPrompt } from "@/lib/prompts";

// Lazy initialization to avoid errors during build
let genAIClient: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAIClient) {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY environment variable is not set");
    }
    genAIClient = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
  }
  return genAIClient;
}

export interface AnalysisResult {
  answer: "yes" | "no";
  explanation: string;
}

/**
 * Analyze a video against the user's original goal using Gemini 2.5 Pro
 */
export async function analyzeVideo(
  videoUrl: string,
  userGoal: string
): Promise<AnalysisResult> {
  const model = getGenAI().getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });

  // Download video and upload to Gemini
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) {
    throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
  }

  const videoBuffer = await videoResponse.arrayBuffer();
  const videoBase64 = Buffer.from(videoBuffer).toString("base64");

  const prompt = buildVideoAnalysisPrompt(userGoal);

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "video/mp4",
        data: videoBase64,
      },
    },
    { text: prompt },
  ]);

  const response = result.response;
  const text = response.text();

  // Parse JSON response
  try {
    // Extract JSON from response (might be wrapped in markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      answer: parsed.answer?.toLowerCase() === "yes" ? "yes" : "no",
      explanation: parsed.explanation || "No explanation provided",
    };
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", text);
    // If parsing fails, assume it needs refinement
    return {
      answer: "no",
      explanation: `Analysis parsing failed. Raw response: ${text.substring(0, 500)}`,
    };
  }
}

/**
 * Upload a file to Gemini File API for processing
 */
export async function uploadToGemini(
  buffer: Buffer,
  mimeType: string,
  displayName: string
): Promise<{ uri: string; mimeType: string }> {
  const fileManager = getGenAI().getGenerativeModel({ model: "gemini-2.5-pro-preview-06-05" });

  // For now, use inline data instead of File API
  // The File API requires different setup
  return {
    uri: `data:${mimeType};base64,${buffer.toString("base64")}`,
    mimeType,
  };
}

