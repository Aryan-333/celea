/**
 * Veo 3.1 Video Generation Integration for Celea
 * Model: veo-3.1-generate-preview
 */

import { googleAIRequest, downloadFromGoogleAI } from "./google-client";
import { VEO_CONFIG } from "@/lib/prompts";
import { createAdminClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const VEO_MODEL = "veo-3.1-generate-preview";
const GOOGLE_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

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
 */
export async function generateVideo(
  params: GenerateVideoParams
): Promise<GenerateVideoResult> {
  const { prompt, referenceImages, aspectRatio, resolution, duration } = params;

  // Validate settings - 1080p requires 8 seconds
  if (resolution === "1080p" && duration !== 8) {
    throw new Error("1080p resolution requires 8 seconds duration");
  }

  // Limit reference images
  const images = (referenceImages || []).slice(0, VEO_CONFIG.maxReferenceImages);

  // Build the request body
  const requestBody: {
    instances: Array<{
      prompt: string;
      image?: { bytesBase64Encoded: string };
    }>;
    parameters: {
      videoConfig: {
        duration: string;
        aspectRatio: string;
        resolution: string;
      };
    };
  } = {
    instances: [
      {
        prompt,
      },
    ],
    parameters: {
      videoConfig: {
        duration: `${duration}s`,
        aspectRatio,
        resolution,
      },
    },
  };

  // Add reference images if provided (Veo 3.1 supports up to 3)
  if (images.length > 0) {
    // For Veo, we add reference images as additional instances or in config
    // Based on the API, reference images go in the instance
    requestBody.instances[0].image = {
      bytesBase64Encoded: images[0].toString("base64"),
    };
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY environment variable is not set");
  }

  // Step 1: Start the generation operation
  console.log("Starting Veo 3.1 video generation...");
  const startResponse = await fetch(
    `${GOOGLE_AI_BASE_URL}/models/${VEO_MODEL}:predictLongRunning?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!startResponse.ok) {
    const errorText = await startResponse.text();
    throw new Error(`Failed to start video generation: ${startResponse.status} - ${errorText}`);
  }

  const operation: VeoOperation = await startResponse.json();
  console.log("Video generation started, operation:", operation.name);

  // Step 2: Poll for completion
  const videoUri = await pollForCompletion(operation.name, apiKey);

  // Step 3: Download the video and upload to Supabase
  console.log("Downloading generated video from:", videoUri);
  const videoBuffer = await downloadFromGoogleAI(videoUri);

  // Step 4: Upload to Supabase storage
  const supabase = createAdminClient();
  const fileName = `videos/${uuidv4()}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("celea-media")
    .upload(fileName, videoBuffer, {
      contentType: "video/mp4",
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload video to Supabase:", uploadError);
    // Return the Google URI as fallback
    return {
      videoUrl: videoUri,
      operationId: operation.name,
    };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("celea-media")
    .getPublicUrl(fileName);

  console.log("Video uploaded to Supabase:", urlData.publicUrl);

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
  maxWaitMs: number = 600000 // 10 minutes
): Promise<string> {
  const startTime = Date.now();
  const pollInterval = 10000; // 10 seconds

  while (Date.now() - startTime < maxWaitMs) {
    console.log("Polling operation status...");

    const response = await fetch(
      `${GOOGLE_AI_BASE_URL}/${operationName}?key=${apiKey}`,
      {
        headers: {
          "x-goog-api-key": apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to poll operation: ${response.status} - ${errorText}`);
    }

    const operation: VeoOperation = await response.json();

    if (operation.error) {
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    if (operation.done) {
      // Extract video URI from response
      const videoUri =
        operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

      if (!videoUri) {
        throw new Error("Video generation completed but no video URI found in response");
      }

      console.log("Video generation completed!");
      return videoUri;
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Video generation timed out after 10 minutes");
}

/**
 * Check the status of a Veo generation operation
 */
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
    `${GOOGLE_AI_BASE_URL}/${operationName}?key=${apiKey}`,
    {
      headers: {
        "x-goog-api-key": apiKey,
      },
    }
  );

  if (!response.ok) {
    return {
      done: false,
      error: `Failed to check status: ${response.statusText}`,
    };
  }

  const operation: VeoOperation = await response.json();

  if (operation.error) {
    return {
      done: true,
      error: operation.error.message,
    };
  }

  if (operation.done) {
    const videoUri =
      operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

    return {
      done: true,
      videoUrl: videoUri,
    };
  }

  return {
    done: false,
  };
}
