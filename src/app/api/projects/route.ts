import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = await db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            // Count only COMPLETED jobs (saved generations)
            jobs: {
              where: { status: "COMPLETED" },
            },
          },
        },
        jobs: {
          take: 1,
          orderBy: { createdAt: "desc" },
          where: { status: "COMPLETED" },
          select: {
            finalVideoUrl: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: projects.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        jobCount: p._count.jobs, // Now only counts COMPLETED jobs
        latestJob: p.jobs[0] || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = createProjectSchema.parse(body);

    const project = await db.project.create({
      data: { name },
    });

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating project:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create project" },
      { status: 500 }
    );
  }
}

