import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/server";

// DELETE /api/jobs/[id] - Delete a job and all associated files
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get job with all iterations and reference images
    const job = await db.job.findUnique({
      where: { id },
      include: {
        iterations: true,
        referenceImages: true,
      },
    });

    if (!job) {
      // Job already deleted or doesn't exist - return success to prevent UI errors
      console.log(`[Delete Job] Job ${id} not found (already deleted or doesn't exist)`);
      return NextResponse.json({
        success: true,
        message: "Job already deleted or does not exist",
      });
    }

    // Delete files from Supabase storage
    const supabase = createAdminClient();
    const filesToDelete: string[] = [];

    // Collect video URLs from iterations
    for (const iteration of job.iterations) {
      if (iteration.videoUrl) {
        // Extract file path from URL
        const match = iteration.videoUrl.match(/celea-media\/(.+)/);
        if (match) {
          filesToDelete.push(match[1]);
        }
      }
    }

    // Collect final video URL
    if (job.finalVideoUrl) {
      const match = job.finalVideoUrl.match(/celea-media\/(.+)/);
      if (match) {
        filesToDelete.push(match[1]);
      }
    }

    // Collect reference image URLs
    for (const img of job.referenceImages) {
      if (img.url) {
        const match = img.url.match(/celea-media\/(.+)/);
        if (match) {
          filesToDelete.push(match[1]);
        }
      }
    }

    // Delete files from storage (don't fail if some files don't exist)
    if (filesToDelete.length > 0) {
      console.log(`[Delete Job] Deleting ${filesToDelete.length} files from storage`);
      const { error: storageError } = await supabase.storage
        .from("celea-media")
        .remove(filesToDelete);
      
      if (storageError) {
        console.error("[Delete Job] Storage deletion error:", storageError);
        // Continue anyway - the DB record should still be deleted
      }
    }

    // Delete job from database (cascades to iterations and reference images)
    // Use deleteMany to avoid error if record was deleted by another request
    const deleteResult = await db.job.deleteMany({
      where: { id },
    });

    if (deleteResult.count === 0) {
      console.log(`[Delete Job] Job ${id} was already deleted by another request`);
    } else {
      console.log(`[Delete Job] Successfully deleted job ${id}`);
    }

    return NextResponse.json({
      success: true,
      message: "Job and associated files deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting job:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete job" },
      { status: 500 }
    );
  }
}

// PATCH /api/jobs/[id] - Rename a job (update displayName, NOT userPrompt)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { displayName } = body;

    if (!displayName || typeof displayName !== "string") {
      return NextResponse.json(
        { success: false, error: "displayName is required" },
        { status: 400 }
      );
    }

    // Update displayName only - userPrompt is preserved as the original prompt
    const job = await db.job.update({
      where: { id },
      data: { displayName: displayName.trim() },
    });

    return NextResponse.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Error updating job:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update job" },
      { status: 500 }
    );
  }
}

