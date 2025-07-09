import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hasProjectAccess, getCurrentUserId } from "@/lib/auth-utils";

// Schema for sprint creation
const sprintSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  startDate: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, "Invalid start date format"),
  endDate: z.string().refine((date) => {
    return !isNaN(Date.parse(date));
  }, "Invalid end date format"),
}).refine((data) => {
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  return endDate > startDate;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

/**
 * GET handler to retrieve all sprints for a project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log("Fetching sprints for project:", params.projectId);
    
    const userId = await getCurrentUserId();
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

    // Fetch all sprints for the project
    const sprints = await db.sprint.findMany({
      where: {
        projectId,
      },
      orderBy: {
        startDate: 'asc',
      },
      include: {
        tasks: true,
      },
    });

    console.log(`Found ${sprints.length} sprints for project ${projectId}`);

    // Calculate completed and total tasks for each sprint
    const sprintsWithTaskCounts = sprints.map((sprint: any) => {
      const completedTasks = sprint.tasks.filter((task: any) => 
        task.status === "done"
      ).length;
      const totalTasks = sprint.tasks.length;

      return {
        id: sprint.id,
        name: sprint.name,
        description: sprint.description,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        projectId: sprint.projectId,
        completedTasks,
        totalTasks,
      };
    });

    return NextResponse.json(sprintsWithTaskCounts);
  } catch (error) {
    console.error("Error fetching sprints:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST handler to create a new sprint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log("Creating sprint for project:", params.projectId);
    
    const userId = await getCurrentUserId();
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

    // Validate the request body
    const body = await request.json();
    const validationResult = sprintSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { name, description, startDate, endDate } = validationResult.data;

    // Create the new sprint
    const sprint = await db.sprint.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        project: {
          connect: {
            id: projectId,
          },
        },
      },
    });

    console.log(`Created new sprint "${name}" for project ${projectId}`);
    return NextResponse.json(sprint);
  } catch (error) {
    console.error("Error creating sprint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 