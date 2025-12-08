import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Admin endpoint to view and manage waitlist
 * 
 * SECURITY: Protected by ADMIN_API_KEY environment variable
 * 
 * Usage:
 * GET /api/admin/waitlist?key=YOUR_ADMIN_API_KEY
 * GET /api/admin/waitlist?key=YOUR_ADMIN_API_KEY&format=csv
 * GET /api/admin/waitlist?key=YOUR_ADMIN_API_KEY&status=pending
 */

function verifyAdminKey(request: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    console.warn("ADMIN_API_KEY not set in environment variables");
    return false;
  }
  
  const providedKey = request.nextUrl.searchParams.get("key");
  return providedKey === adminKey;
}

export async function GET(request: NextRequest) {
  // Verify admin access
  if (!verifyAdminKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const status = request.nextUrl.searchParams.get("status");
    const format = request.nextUrl.searchParams.get("format");

    // Build query
    const whereClause = status ? { status } : {};

    const entries = await db.waitlist.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    // Return CSV format if requested
    if (format === "csv") {
      const csv = [
        "Email,Status,Source,Created At,Notes",
        ...entries.map(
          (e) =>
            `"${e.email}","${e.status}","${e.source}","${e.createdAt.toISOString()}","${e.notes || ""}"`
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="celea-waitlist-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Return JSON with stats
    const stats = {
      total: entries.length,
      pending: entries.filter((e) => e.status === "pending").length,
      invited: entries.filter((e) => e.status === "invited").length,
      rejected: entries.filter((e) => e.status === "rejected").length,
    };

    return NextResponse.json({
      stats,
      entries: entries.map((e) => ({
        id: e.id,
        email: e.email,
        status: e.status,
        source: e.source,
        notes: e.notes,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching waitlist:", error);
    return NextResponse.json(
      { error: "Failed to fetch waitlist" },
      { status: 500 }
    );
  }
}

// Update waitlist entry status
export async function PATCH(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { id, status, notes } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Entry ID required" },
        { status: 400 }
      );
    }

    const updated = await db.waitlist.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (error) {
    console.error("Error updating waitlist entry:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

// Delete waitlist entry
export async function DELETE(request: NextRequest) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const id = request.nextUrl.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Entry ID required" },
        { status: 400 }
      );
    }

    await db.waitlist.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting waitlist entry:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}

