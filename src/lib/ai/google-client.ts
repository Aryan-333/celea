/**
 * Google AI Client for Celea
 * Unified client for Gemini 2.5 Pro and Veo 3.1
 * 
 * FULL LOGGING ENABLED - No truncation
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
 * FULL LOGGING - shows complete request and response
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

  // Build URL - always include API key in URL
  let url: string;
  if (endpoint.startsWith("http")) {
    url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${apiKey}`;
  } else {
    url = `${GOOGLE_AI_BASE_URL}${endpoint}?key=${apiKey}`;
  }

  console.log("\n" + "=".repeat(80));
  console.log(`[Google AI] REQUEST`);
  console.log("=".repeat(80));
  console.log(`[Google AI] Method: ${method}`);
  console.log(`[Google AI] URL: ${url.replace(apiKey, "API_KEY_HIDDEN")}`);
  
  // Log FULL request body (no truncation)
  if (body) {
    console.log(`[Google AI] Request Body (FULL):`);
    // For readability, stringify with indentation but show everything
    const bodyStr = JSON.stringify(body, (key, value) => {
      // Only truncate base64 data which can be huge
      if (key === 'data' && typeof value === 'string' && value.length > 200) {
        return `[BASE64_DATA: ${value.length} chars - first 100: ${value.substring(0, 100)}...]`;
      }
      if (key === 'bytesBase64Encoded' && typeof value === 'string' && value.length > 200) {
        return `[BASE64_DATA: ${value.length} chars - first 100: ${value.substring(0, 100)}...]`;
      }
      return value;
    }, 2);
    console.log(bodyStr);
  }

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  console.log("\n" + "-".repeat(80));
  console.log(`[Google AI] RESPONSE`);
  console.log("-".repeat(80));
  console.log(`[Google AI] Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`[Google AI] Error Response (FULL):`);
    console.log(errorText);
    console.log("=".repeat(80) + "\n");
    throw new Error(`Google AI API error: ${response.status} - ${errorText}`);
  }

  const responseData = await response.json();
  
  // Log FULL response (no truncation)
  console.log(`[Google AI] Response Body (FULL):`);
  const responseStr = JSON.stringify(responseData, null, 2);
  console.log(responseStr);
  console.log("=".repeat(80) + "\n");

  return responseData as T;
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

  console.log("\n" + "=".repeat(80));
  console.log(`[Google AI] FILE UPLOAD`);
  console.log("=".repeat(80));
  console.log(`[Google AI] File: ${displayName}`);
  console.log(`[Google AI] MimeType: ${mimeType}`);
  console.log(`[Google AI] Size: ${fileBuffer.length} bytes`);

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

  console.log(`[Google AI] Upload Start Response: ${startResponse.status}`);

  const uploadUrl = startResponse.headers.get("X-Goog-Upload-Url");
  if (!uploadUrl) {
    const errorText = await startResponse.text();
    console.log(`[Google AI] Upload Start Error: ${errorText}`);
    throw new Error(`Failed to get upload URL from Google AI: ${errorText}`);
  }

  console.log(`[Google AI] Upload URL obtained`);

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

  console.log(`[Google AI] Upload Finalize Response: ${uploadResponse.status}`);

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.log(`[Google AI] Upload Error: ${errorText}`);
    throw new Error(`Failed to upload file: ${uploadResponse.statusText} - ${errorText}`);
  }

  const fileInfo = await uploadResponse.json();
  console.log(`[Google AI] File Info (FULL):`);
  console.log(JSON.stringify(fileInfo, null, 2));
  console.log("=".repeat(80) + "\n");
  
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

  console.log(`[Google AI] Waiting for file processing: ${fileName}`);

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(
      `${GOOGLE_AI_BASE_URL}/files/${fileName}?key=${apiKey}`
    );
    const fileInfo = await response.json();

    console.log(`[Google AI] File state: ${fileInfo.state}`);

    if (fileInfo.state === "ACTIVE") {
      console.log(`[Google AI] File ready: ${fileName}`);
      return;
    }

    if (fileInfo.state === "FAILED") {
      console.log(`[Google AI] File processing failed:`);
      console.log(JSON.stringify(fileInfo, null, 2));
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
  console.log(`[Google AI] Deleting file: ${fileName}`);
  await fetch(`${GOOGLE_AI_BASE_URL}/${fileName}?key=${apiKey}`, {
    method: "DELETE",
  });
  console.log(`[Google AI] File deleted: ${fileName}`);
}

/**
 * Download a file from Google AI (used for Veo generated videos)
 */
export async function downloadFromGoogleAI(uri: string): Promise<Buffer> {
  const apiKey = getApiKey();
  const downloadUrl = uri.includes("?")
    ? `${uri}&key=${apiKey}`
    : `${uri}?key=${apiKey}`;

  console.log(`[Google AI] Downloading from: ${downloadUrl.replace(apiKey, "API_KEY_HIDDEN")}`);

  const response = await fetch(downloadUrl, {
    headers: {
      "x-goog-api-key": apiKey,
    },
  });

  console.log(`[Google AI] Download Response: ${response.status}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.log(`[Google AI] Download Error: ${errorText}`);
    throw new Error(`Failed to download file: ${response.statusText} - ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  console.log(`[Google AI] Downloaded ${arrayBuffer.byteLength} bytes`);
  return Buffer.from(arrayBuffer);
}
