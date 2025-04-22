import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasProjectAccess } from "@/lib/auth-utils";

// Schema for bug creation
const bugSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "FIXED", "VERIFIED", "CLOSED", "REOPENED"]).default("OPEN"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  stepsToReproduce: z.string().optional(),
  environment: z.string().optional(),
  browserInfo: z.string().optional(),
  operatingSystem: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional().refine(
    (date) => {
      if (!date) return true;
      return !isNaN(Date.parse(date));
    },
    { message: "Invalid date format" }
  ),
});

/**
 * GET handler to retrieve all bugs for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Fetching bugs for project: ${params.projectId}`);
    
    const { userId } = await auth();
    console.log("Auth result - userId:", userId);
    
    if (!userId) {
      console.log("Unauthorized access - no valid userId found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = params;
    
    // Check if user has access to the project
    const hasAccess = await hasProjectAccess(userId, projectId);
    if (!hasAccess) {
      console.log(`User ${userId} does not have access to project ${projectId}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const severity = url.searchParams.get("severity");
    const assigneeId = url.searchParams.get("assigneeId");
    
    // Build query filters
    const where: any = { projectId };
    
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (severity) where.severity = severity;
    if (assigneeId) where.assigneeId = assigneeId;

    // Fetch all bugs for the project with the specified filters
    const bugs = await db.bug.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
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

    console.log(`Found ${bugs.length} bugs for project ${projectId}`);
    return NextResponse.json(bugs);
  } catch (error) {
    console.error("Error fetching bugs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create a new bug
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log("Creating bug for project:", params.projectId);
    
    const { userId } = await auth();
    console.log("Auth result - userId:", userId);
    
    if (!userId) {
      console.log("Unauthorized access - no valid userId found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = params;
    
    // Check if user has access to the project
    const hasAccess = await hasProjectAccess(userId, projectId);
    if (!hasAccess) {
      console.log(`User ${userId} does not have access to project ${projectId}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get user from database
    const dbUser = await db.user.findUnique({
      where: { clerkId: userId },
    });
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Validate the request body
    const body = await request.json();
    const validationResult = bugSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.format() },
        { status: 400 }
      );
    }

    const {
      title,
      description,
      status,
      priority,
      severity,
      stepsToReproduce,
      environment,
      browserInfo,
      operatingSystem,
      assigneeId,
      dueDate,
    } = validationResult.data;

    // Create the new bug
    const bug = await db.bug.create({
      data: {
        title,
        description,
        status: status as any,
        priority: priority as any,
        severity: severity as any,
        stepsToReproduce,
        environment,
        browserInfo,
        operatingSystem,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        project: {
          connect: { id: projectId },
        },
        reporter: {
          connect: { id: dbUser.id },
        },
        ...(assigneeId && {
          assignee: {
            connect: { id: assigneeId },
          },
        }),
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
        entityId: bug.id,
        entityType: "BUG",
        action: "CREATE",
        description: `Created bug "${title}"`,
        userId: dbUser.id,
      },
    });

    console.log(`Created new bug "${title}" for project ${projectId}`);
    return NextResponse.json(bug);
  } catch (error) {
    console.error("Error creating bug:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 