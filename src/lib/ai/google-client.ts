/**
 * Google AI Client for Celea
 * Unified client for Gemini 2.5 Pro and Veo 3.1
 */

const GOOGLE_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function getApiKey(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Make a request to Google AI API
 */
export async function googleAIRequest<T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "DELETE";
    body?: object;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const apiKey = getApiKey();
  const { method = "GET", body, headers = {} } = options;

  const url = endpoint.startsWith("http")
    ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${apiKey}`
    : `${GOOGLE_AI_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google AI API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Upload a file to Google AI Files API
 */
export async function uploadFileToGoogleAI(
  fileBuffer: Buffer,
  mimeType: string,
  displayName: string
): Promise<{ name: string; uri: string }> {
  const apiKey = getApiKey();

  // Step 1: Start resumable upload
  const startResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(fileBuffer.length),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: { display_name: displayName },
      }),
    }
  );

  const uploadUrl = startResponse.headers.get("X-Goog-Upload-Url");
  if (!uploadUrl) {
    throw new Error("Failed to get upload URL from Google AI");
  }

  // Step 2: Upload the file bytes
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(fileBuffer.length),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: new Uint8Array(fileBuffer),
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
  }

  const fileInfo = await uploadResponse.json();
  return {
    name: fileInfo.file.name,
    uri: fileInfo.file.uri,
  };
}

/**
 * Wait for a file to be processed by Google AI
 */
export async function waitForFileProcessing(
  fileName: string,
  maxWaitMs: number = 300000 // 5 minutes
): Promise<void> {
  const apiKey = getApiKey();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(
      `${GOOGLE_AI_BASE_URL}/files/${fileName}?key=${apiKey}`
    );
    const fileInfo = await response.json();

    if (fileInfo.state === "ACTIVE") {
      return;
    }

    if (fileInfo.state === "FAILED") {
      throw new Error(`File processing failed: ${fileInfo.error?.message}`);
    }

    // Wait 5 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error("File processing timed out");
}

/**
 * Delete a file from Google AI Files API
 */
export async function deleteFileFromGoogleAI(fileName: string): Promise<void> {
  const apiKey = getApiKey();
  await fetch(`${GOOGLE_AI_BASE_URL}/${fileName}?key=${apiKey}`, {
    method: "DELETE",
  });
}

/**
 * Download a file from Google AI (used for Veo generated videos)
 */
export async function downloadFromGoogleAI(uri: string): Promise<Buffer> {
  const apiKey = getApiKey();
  const downloadUrl = uri.includes("?")
    ? `${uri}&key=${apiKey}`
    : `${uri}?key=${apiKey}`;

  const response = await fetch(downloadUrl, {
    headers: {
      "x-goog-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

