import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// GET /api/job-status/[id] - Get job status (with optional SSE streaming)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isSSE = request.headers.get("accept") === "text/event-stream";

  if (isSSE) {
    // Server-Sent Events for real-time updates
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Poll for updates
        let lastStatus = "";
        let lastIteration = 0;

        const poll = async () => {
          try {
            const job = await db.job.findUnique({
              where: { id },
              include: {
                iterations: {
                  orderBy: { number: "asc" },
                },
              },
            });

            if (!job) {
              sendEvent({ error: "Job not found" });
              controller.close();
              return;
            }

            // Send update if status or iterations changed
            const currentIterationCount = job.iterations.length;
            if (
              job.status !== lastStatus ||
              currentIterationCount !== lastIteration
            ) {
              lastStatus = job.status;
              lastIteration = currentIterationCount;

              sendEvent({
                jobId: job.id,
                status: job.status,
                currentStage: job.currentStage,
                iterations: job.iterations,
                finalVideoUrl: job.finalVideoUrl,
              });
            }

            // Stop polling if job is done
            if (job.status === "COMPLETED" || job.status === "FAILED") {
              sendEvent({ done: true });
              controller.close();
              return;
            }

            // Continue polling
            setTimeout(poll, 1000);
          } catch (error) {
            console.error("SSE poll error:", error);
            sendEvent({ error: "Internal server error" });
            controller.close();
          }
        };

        // Start polling
        poll();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // Regular JSON response
  try {
    const job = await db.job.findUnique({
      where: { id },
      include: {
        iterations: {
          orderBy: { number: "asc" },
        },
        referenceImages: true,
      },
    });

    if (!job) {
      return Response.json(
        { success: false, error: "Job not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    return Response.json(
      { success: false, error: "Failed to fetch job status" },
      { status: 500 }
    );
  }
}

