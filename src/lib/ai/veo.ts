/**
 * Veo 3.1 Video Generation Integration for Celea
 * Model: veo-3.1-generate-preview
 * 
 * Uses :predictLongRunning endpoint for video generation
 * Generates VIDEO ONLY (no audio)
 * 
 * FULL LOGGING ENABLED - No truncation
 */

import { downloadFromGoogleAI } from "./google-client";
import { VEO_CONFIG } from "@/lib/prompts";
import { createAdminClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const VEO_MODEL = "veo-3.1-generate-preview";
const GOOGLE_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Detect image mime type from buffer by reading magic bytes
 */
function detectImageMimeType(buffer: Buffer): string {
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return "image/gif";
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return "image/webp";
  if (buffer[0] === 0x42 && buffer[1] === 0x4D) return "image/bmp";
  
  console.warn("[Veo] Unknown image format, defaulting to image/jpeg");
  return "image/jpeg";
}

export interface GenerateVideoParams {
  prompt: string;
  referenceImages?: Buffer[];
  aspectRatio: "16:9" | "9:16";
  resolution: "720p" | "1080p";
  duration: 4 | 6 | 8;
}

export interface GenerateVideoResult {
  videoUrl: string;
  operationId: string;
}

interface VeoOperation {
  name: string;
  done: boolean;
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: {
          uri?: string;
        };
      }>;
    };
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Start video generation with Veo 3.1
 * Uses :predictLongRunning endpoint with proper request format
 */
export async function generateVideo(
  params: GenerateVideoParams
): Promise<GenerateVideoResult> {
  console.log("\n" + "█".repeat(80));
  console.log("█ VEO 3.1 VIDEO GENERATION - START");
  console.log("█".repeat(80));

  const { prompt, referenceImages, aspectRatio } = params;

  console.log("\n[Veo] INPUT PARAMS:");
  console.log(`[Veo] Aspect Ratio: ${aspectRatio}`);
  console.log(`[Veo] Resolution: ${params.resolution}`);
  console.log(`[Veo] Duration: ${params.duration}s`);
  console.log(`[Veo] Reference Images: ${referenceImages?.length || 0}`);
  
  console.log("\n[Veo] PROMPT (FULL):");
  console.log("=".repeat(40));
  console.log(prompt);
  console.log("=".repeat(40));

  // Limit reference images
  const images = (referenceImages || []).slice(0, VEO_CONFIG.maxReferenceImages);

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY environment variable is not set");
  }

  // Define the base instance with prompt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance: any = {
    prompt,
  };

  // FIXED: Using camelCase 'referenceImages' (Vertex AI Spec)
  // This tells Veo to use the image as a CHARACTER/ASSET REFERENCE
  // NOT a Start Frame.
  if (images.length > 0) {
    instance.referenceImages = images.map((buf: Buffer, index: number) => {
      const mimeType = detectImageMimeType(buf);
      console.log(`[Veo] Reference image ${index + 1}: ${buf.length} bytes, ${mimeType}`);
      return {
        image: {
          bytesBase64Encoded: buf.toString("base64"),
          mimeType,
        },
        // 'asset' mode preserves the subject identity (Character/Object)
        referenceType: "asset",
      };
    });
    console.log(`[Veo] Included ${images.length} reference images (Asset Mode)`);
  }

  const requestBody = {
    instances: [instance],
    parameters: {
      aspectRatio: aspectRatio,
      sampleCount: 1,
    },
  };

  console.log("\n[Veo] REQUEST BODY (FULL - excluding base64 data):");
  console.log("-".repeat(40));
  // Log without the huge base64 data
  const logBody = JSON.parse(JSON.stringify(requestBody));
  if (logBody.instances[0].referenceImages) {
    logBody.instances[0].referenceImages = logBody.instances[0].referenceImages.map((ref: { image: { bytesBase64Encoded: string; mimeType: string }; referenceType: string }) => ({
      ...ref,
      image: {
        ...ref.image,
        bytesBase64Encoded: `[BASE64_DATA: ${ref.image.bytesBase64Encoded.length} chars]`,
      },
    }));
  }
  console.log(JSON.stringify(logBody, null, 2));
  console.log("-".repeat(40));

  const startUrl = `${GOOGLE_AI_BASE_URL}/models/${VEO_MODEL}:predictLongRunning`;
  console.log(`\n[Veo] Endpoint: ${startUrl}`);
  
  const startResponse = await fetch(startUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  console.log(`[Veo] Response Status: ${startResponse.status} ${startResponse.statusText}`);

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    console.log("\n[Veo] ERROR RESPONSE (FULL):");
    console.log("=".repeat(40));
    console.log(errorText);
    console.log("=".repeat(40));
    console.log("█".repeat(80));
    console.log("█ VEO 3.1 VIDEO GENERATION - FAILED");
    console.log("█".repeat(80) + "\n");
    throw new Error(`Failed to start video generation: ${startResponse.status} - ${errorText}`);
  }

  const operation: VeoOperation = await startResponse.json();
  
  console.log("\n[Veo] OPERATION RESPONSE (FULL):");
  console.log("-".repeat(40));
  console.log(JSON.stringify(operation, null, 2));
  console.log("-".repeat(40));
  
  console.log(`[Veo] Operation started: ${operation.name}`);

  if (!operation.name) {
    console.error("[Veo] No operation name in response");
    throw new Error("No operation name returned from Veo");
  }

  // Step 2: Poll for completion
  const videoUri = await pollForCompletion(operation.name, apiKey);

  // Step 3: Download the video and upload to Supabase
  console.log(`\n[Veo] Downloading video from Google AI...`);
  const videoBuffer = await downloadFromGoogleAI(videoUri);
  console.log(`[Veo] Downloaded ${videoBuffer.length} bytes`);

  // Step 4: Upload to Supabase storage
  console.log(`[Veo] Uploading to Supabase storage...`);
  const supabase = createAdminClient();
  const fileName = `videos/${uuidv4()}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("celea-media")
    .upload(fileName, new Uint8Array(videoBuffer), {
      contentType: "video/mp4",
      upsert: false,
    });

  if (uploadError) {
    console.error("[Veo] Failed to upload to Supabase:", uploadError);
    // Return the Google URI as fallback
    console.log("█".repeat(80));
    console.log("█ VEO 3.1 VIDEO GENERATION - COMPLETE (with fallback URL)");
    console.log("█".repeat(80) + "\n");
    return {
      videoUrl: videoUri,
      operationId: operation.name,
    };
  }

  const { data: urlData } = supabase.storage
    .from("celea-media")
    .getPublicUrl(fileName);

  console.log(`[Veo] Video uploaded to: ${urlData.publicUrl}`);
  
  console.log("\n" + "█".repeat(80));
  console.log("█ VEO 3.1 VIDEO GENERATION - COMPLETE");
  console.log("█".repeat(80) + "\n");

  return {
    videoUrl: urlData.publicUrl,
    operationId: operation.name,
  };
}

/**
 * Poll the operation until it's done
 */
async function pollForCompletion(
  operationName: string,
  apiKey: string,
  maxWaitMs: number = 600000
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 10000;
  let pollCount = 0;

  console.log("\n[Veo] POLLING OPERATION:");
  console.log(`[Veo] Operation: ${operationName}`);
  console.log(`[Veo] Max wait: ${maxWaitMs / 1000}s`);

  while (Date.now() - startTime < maxWaitMs) {
    pollCount++;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    const pollUrl = `${GOOGLE_AI_BASE_URL}/${operationName}`;
    
    const response = await fetch(pollUrl, {
      headers: {
        "x-goog-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[Veo] Poll ${pollCount} ERROR: ${response.status}`);
      console.log(errorText);
      throw new Error(`Failed to poll operation: ${response.status} - ${errorText}`);
    }

    const operation: VeoOperation = await response.json();
    
    console.log(`[Veo] Poll ${pollCount} (${elapsed}s elapsed): done=${operation.done}`);
    
    if (operation.error) {
      console.log("[Veo] Operation error:");
      console.log(JSON.stringify(operation.error, null, 2));
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    if (operation.done) {
      console.log("\n[Veo] OPERATION COMPLETE RESPONSE (FULL):");
      console.log("-".repeat(40));
      console.log(JSON.stringify(operation, null, 2));
      console.log("-".repeat(40));
      
      const videoUri = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

      if (!videoUri) {
        console.error("[Veo] No video URI in completed operation");
        throw new Error("Video generation completed but no video URI found");
      }

      console.log(`[Veo] Video ready: ${videoUri}`);
      return videoUri;
    }

    console.log(`[Veo] Waiting ${pollInterval / 1000}s before next poll...`);
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Video generation timed out after 10 minutes");
}

export async function checkOperationStatus(operationName: string): Promise<{
  done: boolean;
  videoUrl?: string;
  error?: string;
}> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY environment variable is not set");
  }

  const response = await fetch(
    `${GOOGLE_AI_BASE_URL}/${operationName}`,
    {
      headers: { "x-goog-api-key": apiKey },
    }
  );

  if (!response.ok) {
    return { done: false, error: `Failed to check status: ${response.statusText}` };
  }

  const operation: VeoOperation = await response.json();

  if (operation.error) {
    return { done: true, error: operation.error.message };
  }

  if (operation.done) {
    const videoUri = operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    return { done: true, videoUrl: videoUri };
  }

  return { done: false };
}
