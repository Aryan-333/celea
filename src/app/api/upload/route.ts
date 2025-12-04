import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { ERROR_MESSAGES } from "@/lib/prompts";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 3;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// POST /api/upload - Upload reference images
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.MAX_IMAGES_EXCEEDED },
        { status: 400 }
      );
    }

    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { success: false, error: ERROR_MESSAGES.FILE_SIZE_EXCEEDED },
          { status: 400 }
        );
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: `Invalid file type: ${file.type}` },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();
    const uploadedFiles: { url: string; filename: string }[] = [];

    for (const file of files) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `reference-images/${fileName}`;

      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("celea-media")
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Failed to upload file: ${file.name}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("celea-media")
        .getPublicUrl(filePath);

      uploadedFiles.push({
        url: urlData.publicUrl,
        filename: file.name,
      });
    }

    return NextResponse.json({
      success: true,
      data: uploadedFiles,
    });
  } catch (error) {
    console.error("Error uploading files:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload files",
      },
      { status: 500 }
    );
  }
}

