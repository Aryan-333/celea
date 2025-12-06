/**
 * Central AI Prompts for Celea
 * AI-native video generation platform for Hollywood
 * 
 * This file contains all prompts used across the application.
 * Edit these prompts to customize AI behavior.
 */

// =============================================================================
// GEMINI 2.5 PRO PROMPT ENHANCEMENT (Initial)
// Purpose: Transform user's rough prompt into Veo 3.1 optimized cinematic prompt
// =============================================================================

export const PROMPT_ENHANCEMENT_SYSTEM = `ROLE
You turn (user_rough_prompt + assets) into:
1) a single high-quality Veo 3.1 prompt string 
You must obey all constraints below and keep the final Veo prompt under ~900 tokens (hard limit: 1024). 
STRICTLY DON'T GIVE ANY EXPLANATIONS JUST OUTPUT THE PROMPT TEXT NOT A SINGLE OTHER WORD

PROMPT STYLE RULES
- Lead with optics first (one concise paragraph ~35–60 words): Shot type · Camera position/angle · Lens/focus · Lighting/ambience · Time of day · Setting; then the subject performing concrete actions.
- Use explicit control lines, one per line, in this order when applicable:
  Camera: <motion + framing beats>
  Composition: <framing constraints>
  Ambience: <color/lighting/weather/particles>
  Style: <film look / animation style / era / color palette>
  Performance: <micro-actions/facial beats if people/creatures appear>
  Continuity: <things that must remain constant across frames>
  Audio: Dialogue "<line(s)>"; SFX: <comma nouns>; Ambient: <background bed>
- For negatives, list nouns only. DO NOT use "no/don't".
- If using reference images, bind traits explicitly to each ref index (e.g., "Match hair/eyes from ref#2; outfit from ref#1; glasses from ref#3").
- Maintain clarity and brevity; avoid vague adjectives; prefer concrete verbs and cinematography terms.
- Keep within token budget.

ASSEMBLY ALGORITHM
1) Parse user_rough_prompt → extract: subject(s), action(s), setting, time, mood, style hints, any audio cues, any negatives.
2) Normalize and enrich with cinematic specifics (shot type, camera motion, composition, lens/focus, lighting/ambience, color mood).
3) Compose the final prompt in this exact structure:

[OPENING PARAGRAPH ~35–60 words focusing on optics then subject+action]

Camera: <motion + framing beats>
Composition: <key framing constraints>
Ambience: <lighting/color/weather/particles>
Style: <aesthetic / era / palette>
Performance: <micro actions or facial beats>          // include only if people/creatures appear
Continuity: <props/wardrobe/identity to preserve>     // include if applicable
Audio: "<dialogue lines if any>"
SFX: <concrete sounds, comma-separated if any>
Ambient: <background bed if any>

Aspect ratio: <16:9|9:16>
Resolution: <720p|1080p>
Duration: <4s|6s|8s>
Negative prompt: <merged comma list>

TUNING HINTS
- Prefer concrete cinematography vocabulary (e.g., "slow dolly-in", "handheld micro-jitter", "rack focus to foreground", "medium close-up").
- Write dialogue in quotes; keep to ≤2 lines for 8s clips.
- When unspecified, choose default values provided.
- Keep control lines terse; avoid redundant adjectives; favor verbs (drifts, pans, tilts, holds, tracks).`;

// User message format for prompt enhancement
export function buildPromptEnhancementUserMessage(params: {
  userPrompt: string;
  referenceImages?: string[];
  aspectRatio?: string;
  resolution?: string;
  durationSeconds?: number;
  negativeTerms?: string[];
}): string {
  const {
    userPrompt,
    referenceImages = [],
    aspectRatio = "16:9",
    resolution = "1080p",
    durationSeconds = 8,
    negativeTerms = [],
  } = params;

  return `INPUTS (JSON to you)
{
  "mode": "text",
  "user_rough_prompt": "${userPrompt.replace(/"/g, '\\"')}",
  "assets": {
    "reference_images": ${JSON.stringify(referenceImages)}
  },
  "preferences": {
    "aspectRatio": "${aspectRatio}",
    "resolution": "${resolution}",
    "durationSeconds": "${durationSeconds}",
    "negative_terms": ${JSON.stringify(negativeTerms)}
  }
}

Combining in it the user entered prompt: ${userPrompt}`;
}

// =============================================================================
// GEMINI 2.5 PRO VIDEO ANALYSIS
// Purpose: Analyze generated video against user's original goal
// =============================================================================

export function buildVideoAnalysisPrompt(params: {
  userGoal: string;
  enhancedPrompt?: string;
}): string {
  const { userGoal, enhancedPrompt } = params;
  
  let prompt = `User's Original Goal: ${userGoal}`;
  
  if (enhancedPrompt) {
    prompt += `

Prompt used to generate this video:
${enhancedPrompt}`;
  }
  
  prompt += `

Analyze the video against the user's original Goal above. The "Prompt used to generate this video" shows the detailed prompt sent to the video generation model - use this context to understand what was intended.

Give Binary answer in JSON yes or no does this video actually up to the mark and satisfies the Goal defined above for the video.Take care about each of the specification made by the user even like small things. Make sure the transitions in the video are smooth and not dissolve or cross-dissolve until specifically asked by the user or that's the only way possible to do. But don't be too strict if it meet major criterias by the user, don;t try to over optimize and over strict.

Output:
{
"answer": " "
"explanation":" "
}`;

  return prompt;
}

// =============================================================================
// GEMINI 2.5 PRO PROMPT REFINEMENT (Iteration Loop)
// Purpose: Refine prompt based on video analysis feedback
// =============================================================================

export const PROMPT_REFINEMENT_SYSTEM = `The video didn't made up to the criteria and failed with the following analysis very precisely fix the given prompt to make sure it pass the criteria to exactly match of what user wants. STRICTLY DON'T GIVE ANY EXPLANATIONS JUST OUTPUT THE PROMPT TEXT NOT A SINGLE OTHER WORD`;

export function buildPromptRefinementUserMessage(params: {
  geminiAnalysis: { answer: string; explanation: string };
  existingPrompt: string;
  originalUserGoal: string;
  referenceImages?: string[]; // URLs of reference images
}): string {
  const { geminiAnalysis, existingPrompt, originalUserGoal, referenceImages = [] } = params;
  
  // Build reference images section if present
  const refImagesSection = referenceImages.length > 0
    ? `\nReference Images: ${JSON.stringify(referenceImages)}\n(The reference images are attached to this message for visual context)`
    : "";

  return `Gemini Analysis Response: 
${JSON.stringify(geminiAnalysis, null, 2)}

Existing Prompt Sent to Veo 3.1:
${existingPrompt}

User's Original Goal: ${originalUserGoal}${refImagesSection}

Please refine this prompt to better meet the user's goal. Keeping these rules in consideration to generate the best most optimal prompt to make the video with fixes that were remaining last time.

1) a single high-quality Veo 3.1 prompt string 
You must obey all constraints below and keep the final Veo prompt under ~900 tokens (hard limit: 1024). 
STRICTLY DON'T GIVE ANY EXPLANATIONS JUST OUTPUT THE PROMPT TEXT NOT A SINGLE OTHER WORD

PROMPT STYLE RULES
- Lead with optics first (one concise paragraph ~35–60 words): Shot type · Camera position/angle · Lens/focus · Lighting/ambience · Time of day · Setting; then the subject performing concrete actions.
- Use explicit control lines, one per line, in this order when applicable:
  Camera: <motion + framing beats>
  Composition: <framing constraints>
  Ambience: <color/lighting/weather/particles>
  Style: <film look / animation style / era / color palette>
  Performance: <micro-actions/facial beats if people/creatures appear>
  Continuity: <things that must remain constant across frames>
  Audio: Dialogue "<line(s)>"; SFX: <comma nouns>; Ambient: <background bed>
- For negatives, list nouns only. DO NOT use "no/don't".
- If using reference images, bind traits explicitly to each ref index (e.g., "Match hair/eyes from ref#2; outfit from ref#1; glasses from ref#3").
- Maintain clarity and brevity; avoid vague adjectives; prefer concrete verbs and cinematography terms.
- Keep within token budget.

ASSEMBLY ALGORITHM
1) Parse user_rough_prompt → extract: subject(s), action(s), setting, time, mood, style hints, any audio cues, any negatives and see the gemini anlaysis prompt to see what was lacking last time that should be improved now.
2) Normalize and enrich with cinematic specifics (shot type, camera motion, composition, lens/focus, lighting/ambience, color mood).
3) Compose the final prompt in this exact structure:

[OPENING PARAGRAPH ~35–60 words focusing on optics then subject+action]

Camera: <motion + framing beats>
Composition: <key framing constraints>
Ambience: <lighting/color/weather/particles>
Style: <aesthetic / era / palette>
Performance: <micro actions or facial beats>          // include only if people/creatures appear
Continuity: <props/wardrobe/identity to preserve>     // include if applicable
Audio: "<dialogue lines if any>"
SFX: <concrete sounds, comma-separated if any>
Ambient: <background bed if any>

Aspect ratio: <16:9|9:16>
Resolution: <720p|1080p>
Duration: <4s|6s|8s>
Negative prompt: <merged comma list>

TUNING HINTS
- Prefer concrete cinematography vocabulary (e.g., "slow dolly-in", "handheld micro-jitter", "rack focus to foreground", "medium close-up").
- Write dialogue in quotes; keep to ≤2 lines for 8s clips.
- When unspecified, choose default values provided.
- Keep control lines terse; avoid redundant adjectives; favor verbs (drifts, pans, tilts, holds, tracks).
`;
}

// =============================================================================
// VEO 3.1 CONFIGURATION
// =============================================================================

export const VEO_CONFIG = {
  model: "veo-3.1-generate-preview",
  maxReferenceImages: 3,
  supportedAspectRatios: ["16:9", "9:16"] as const,
  supportedResolutions: ["720p", "1080p"] as const,
  supportedDurations: [4, 6, 8] as const,
  // CRITICAL: 1080p REQUIRES 8 seconds
  get1080pDuration: () => 8,
};

// =============================================================================
// FRONTEND STAGE MESSAGES
// =============================================================================

export const STAGE_MESSAGES = {
  enhancing_prompt: (iteration: number) => `Iteration ${iteration}: Enhancing prompt...`,
  generating_video: (iteration: number) => `Iteration ${iteration}: Generating video...`,
  analyzing_video: (iteration: number) => `Iteration ${iteration}: Analyzing quality...`,
  refining_prompt: (iteration: number) => `Iteration ${iteration}: Reformulating and aligning...`,
  completed: "Process Completed!",
  preparing: "Preparing pipeline...",
  uploading_images: "Uploading reference images...",
  initiating: "Initiating AI pipeline...",
} as const;

export function getProgressMessage(stage: string, iteration: number = 1): string {
  switch (stage) {
    case "enhancing_prompt":
      return STAGE_MESSAGES.enhancing_prompt(iteration);
    case "generating_video":
      return STAGE_MESSAGES.generating_video(iteration);
    case "analyzing_video":
      return STAGE_MESSAGES.analyzing_video(iteration);
    case "refining_prompt":
      return STAGE_MESSAGES.refining_prompt(iteration);
    case "completed":
      return STAGE_MESSAGES.completed;
    case "preparing":
      return STAGE_MESSAGES.preparing;
    case "uploading_images":
      return STAGE_MESSAGES.uploading_images;
    case "initiating":
      return STAGE_MESSAGES.initiating;
    default:
      return `Processing... (${stage})`;
  }
}

// =============================================================================
// ERROR MESSAGES
// =============================================================================

export const ERROR_MESSAGES = {
  FILE_SIZE_EXCEEDED: "Maximum file size is 10MB",
  MAX_IMAGES_EXCEEDED: "Maximum 3 reference images allowed",
  INVALID_RESOLUTION_DURATION: "1080p resolution requires 8 seconds duration",
  PROMPT_ENHANCEMENT_FAILED: (details: string) => `Error enhancing prompt: ${details}`,
  VIDEO_GENERATION_FAILED: (details: string) => `Error generating video: ${details}`,
  VIDEO_ANALYSIS_FAILED: (details: string) => `Error analyzing video: ${details}`,
  VIDEO_NOT_FOUND: (id: string) => `Video file not found: ${id}`,
  PROJECT_FETCH_FAILED: (error: string) => `Error fetching projects: ${error}`,
  JOB_NOT_FOUND: (id: string) => `Job not found: ${id}`,
  PROJECT_NOT_FOUND: (id: string) => `Project not found: ${id}`,
} as const;

// =============================================================================
// PIPELINE CONFIGURATION
// =============================================================================

export const PIPELINE_CONFIG = {
  maxIterations: 5,
  defaultRetentionDays: 30,
  permanentRetention: -1,
} as const;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

export function validateVideoSettings(settings: {
  aspectRatio: string;
  resolution: string;
  duration: number;
}): { valid: boolean; correctedDuration?: number; error?: string } {
  const { resolution, duration } = settings;

  // 1080p requires 8 seconds
  if (resolution === "1080p" && duration !== 8) {
    return {
      valid: true,
      correctedDuration: 8,
    };
  }

  // Validate duration
  if (![4, 6, 8].includes(duration)) {
    return {
      valid: false,
      error: "Duration must be 4, 6, or 8 seconds",
    };
  }

  return { valid: true };
}

