import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/auth-utils";

// Schema for bug updates
const bugUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "FIXED", "VERIFIED", "CLOSED", "REOPENED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  stepsToReproduce: z.string().optional(),
  environment: z.string().optional(),
  browserInfo: z.string().optional(),
  operatingSystem: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable().transform(date => {
    if (!date) return null;
    return new Date(date);
  }),
});

/**
 * GET handler to retrieve a specific bug
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; bugId: string } }
) {
  try {
    console.log(`Fetching bug ${params.bugId} for project ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, bugId } = params;
    
    // Check if user has access to the project
    const hasAccess = await hasProjectAccess(userId, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the bug
    const bug = await db.bug.findUnique({
      where: {
        id: bugId,
        projectId: projectId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!bug) {
      return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    return NextResponse.json(bug);
  } catch (error) {
    console.error("Error fetching bug:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler to update a bug
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; bugId: string } }
) {
  try {
    console.log(`Updating bug ${params.bugId} for project ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, bugId } = params;
    
    // Check if user has access to the project
    const hasAccess = await hasProjectAccess(userId, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user from database
    const dbUser = await db.user.findUnique({
      where: { clerkId: userId },
    });
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if bug exists
    const existingBug = await db.bug.findUnique({
      where: {
        id: bugId,
        projectId: projectId,
      },
    });

    if (!existingBug) {
      return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    // Validate the request body
    const body = await request.json();
    const validationResult = bugUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.format() },
        { status: 400 }
      );
    }

    const updatedData = validationResult.data;

    // Update the bug
    const updatedBug = await db.bug.update({
      where: {
        id: bugId,
      },
      data: updatedData.assigneeId === null 
        ? { 
            ...updatedData,
            assigneeId: null 
          }
        : updatedData.assigneeId 
          ? { 
              ...updatedData
            }
          : {
              ...updatedData
            },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
      },
    });

    // Log the activity
    await db.activityLog.create({
      data: {
        entityId: updatedBug.id,
        entityType: "BUG",
        action: "UPDATE",
        description: `Updated bug "${updatedBug.title}"`,
        userId: dbUser.id,
      },
    });

    return NextResponse.json(updatedBug);
  } catch (error) {
    console.error("Error updating bug:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler to delete a bug
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; bugId: string } }
) {
  try {
    console.log(`Deleting bug ${params.bugId} from project ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId, bugId } = params;
    
    // Check if user has access to the project
    const hasAccess = await hasProjectAccess(userId, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user from database
    const dbUser = await db.user.findUnique({
      where: { clerkId: userId },
    });
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if bug exists
    const existingBug = await db.bug.findUnique({
      where: {
        id: bugId,
        projectId: projectId,
      },
    });

    if (!existingBug) {
      return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    // Delete the bug
    await db.bug.delete({
      where: {
        id: bugId,
      },
    });

    // Log the activity
    await db.activityLog.create({
      data: {
        entityId: bugId,
        entityType: "BUG",
        action: "DELETE",
        description: `Deleted bug "${existingBug.title}"`,
        userId: dbUser.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting bug:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 