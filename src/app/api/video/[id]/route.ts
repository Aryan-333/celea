import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/server";
import { ERROR_MESSAGES } from "@/lib/prompts";

// GET /api/video/[id] - Stream or download video
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const download = request.nextUrl.searchParams.get("download") === "true";

    // Find iteration with this video
    const iteration = await db.iteration.findFirst({
      where: {
        OR: [{ id }, { videoUrl: { contains: id } }],
      },
      include: {
        job: true,
      },
    });

    // Or check if it's a final video URL on a job
    const job = await db.job.findFirst({
      where: {
        OR: [{ id }, { finalVideoUrl: { contains: id } }],
      },
    });

    const videoUrl = iteration?.videoUrl || job?.finalVideoUrl;

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.VIDEO_NOT_FOUND(id) },
        { status: 404 }
      );
    }

    // If it's a Supabase URL, proxy the content
    if (videoUrl.includes("supabase")) {
      const supabase = createAdminClient();

      // Extract path from URL
      const urlParts = videoUrl.split("/celea-media/");
      if (urlParts.length < 2) {
        return NextResponse.json(
          { success: false, error: "Invalid video URL format" },
          { status: 400 }
        );
      }

      const filePath = urlParts[1];

      const { data, error } = await supabase.storage
        .from("celea-media")
        .download(filePath);

      if (error || !data) {
        console.error("Video download error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to retrieve video" },
          { status: 500 }
        );
      }

      const headers: HeadersInit = {
        "Content-Type": "video/mp4",
        "Cache-Control": "public, max-age=31536000",
      };

      if (download) {
        const filename = filePath.split("/").pop() || "video.mp4";
        headers["Content-Disposition"] = `attachment; filename="${filename}"`;
      }

      return new NextResponse(data, { headers });
    }

    // If it's an external URL, redirect
    return NextResponse.redirect(videoUrl);
  } catch (error) {
    console.error("Error streaming video:", error);
    return NextResponse.json(
      { success: false, error: "Failed to stream video" },
      { status: 500 }
    );
  }
}

