import OpenAI from "openai";
import {
  PROMPT_ENHANCEMENT_SYSTEM,
  PROMPT_REFINEMENT_SYSTEM,
  buildPromptEnhancementUserMessage,
  buildPromptRefinementUserMessage,
} from "@/lib/prompts";

// Lazy initialization to avoid errors during build
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export interface EnhancePromptParams {
  userPrompt: string;
  referenceImages?: string[];
  aspectRatio?: string;
  resolution?: string;
  durationSeconds?: number;
  negativeTerms?: string[];
}

export interface RefinePromptParams {
  geminiAnalysis: { answer: string; explanation: string };
  existingPrompt: string;
  originalUserGoal: string;
}

/**
 * Enhance a user's rough prompt into a cinema-grade Veo 3.1 prompt
 */
export async function enhancePrompt(params: EnhancePromptParams): Promise<string> {
  const userMessage = buildPromptEnhancementUserMessage(params);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: PROMPT_ENHANCEMENT_SYSTEM },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return content.trim();
}

/**
 * Refine a prompt based on Gemini's quality analysis feedback
 */
export async function refinePrompt(params: RefinePromptParams): Promise<string> {
  const userMessage = buildPromptRefinementUserMessage(params);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: PROMPT_REFINEMENT_SYSTEM },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OpenAI for refinement");
  }

  return content.trim();
}

