import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkProjectAccess } from "@/lib/project-access";

// Validation schema for updating sprints
const sprintUpdateSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  startDate: z.string().transform(val => new Date(val)).optional(),
  endDate: z.string().transform(val => new Date(val)).optional(),
  status: z.enum(["planned", "active", "completed"]).optional(),
});

// Task type for type-safety
interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl: string | null;
  } | null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; sprintId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to sprint details");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId, sprintId } = params;
    
    // Check if user has access to the project
    const hasAccess = await checkProjectAccess(userId, projectId);
    
    if (!hasAccess) {
      console.log(`User ${userId} denied access to sprint ${sprintId}`);
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Fetch sprint details with task counts
    const sprint = await db.sprint.findUnique({
      where: {
        id: sprintId,
        projectId: projectId,
      },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
              }
            }
          }
        }
      }
    });

    if (!sprint) {
      console.log(`Sprint ${sprintId} not found in project ${projectId}`);
      return new NextResponse("Sprint not found", { status: 404 });
    }

    // Calculate additional statistics
    const tasksByStatus = {
      todo: sprint.tasks.filter((task: Task) => task.status === "todo").length,
      inProgress: sprint.tasks.filter((task: Task) => task.status === "in-progress").length,
      review: sprint.tasks.filter((task: Task) => task.status === "review").length,
      done: sprint.tasks.filter((task: Task) => task.status === "done").length,
    };

    const tasksByPriority = {
      low: sprint.tasks.filter((task: Task) => task.priority === "low").length,
      medium: sprint.tasks.filter((task: Task) => task.priority === "medium").length,
      high: sprint.tasks.filter((task: Task) => task.priority === "high").length,
      urgent: sprint.tasks.filter((task: Task) => task.priority === "urgent").length,
    };

    const response = {
      ...sprint,
      stats: {
        total: sprint.tasks.length,
        byStatus: tasksByStatus,
        byPriority: tasksByPriority,
        completionRate: sprint.tasks.length > 0 
          ? Math.round((tasksByStatus.done / sprint.tasks.length) * 100) 
          : 0
      }
    };

    console.log(`Fetched sprint ${sprintId} with ${sprint.tasks.length} tasks`);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching sprint details:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; sprintId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized attempt to update sprint");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId, sprintId } = params;
    
    // Check if user has access to the project
    const hasAccess = await checkProjectAccess(userId, projectId);
    
    if (!hasAccess) {
      console.log(`User ${userId} denied access to update sprint ${sprintId}`);
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Check if sprint exists and belongs to this project
    const sprintExists = await db.sprint.findUnique({
      where: {
        id: sprintId,
        projectId: projectId,
      },
    });

    if (!sprintExists) {
      console.log(`Sprint ${sprintId} not found in project ${projectId}`);
      return new NextResponse("Sprint not found", { status: 404 });
    }

    const body = await req.json();
    const validatedData = sprintUpdateSchema.parse(body);

    // Update the sprint
    const updatedSprint = await db.sprint.update({
      where: {
        id: sprintId,
      },
      data: validatedData,
    });

    console.log(`Updated sprint ${sprintId}`);
    return NextResponse.json(updatedSprint);
  } catch (error) {
    console.error("Error updating sprint:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; sprintId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized attempt to delete sprint");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId, sprintId } = params;
    
    // Check if user has access to the project
    const hasAccess = await checkProjectAccess(userId, projectId);
    
    if (!hasAccess) {
      console.log(`User ${userId} denied access to delete sprint ${sprintId}`);
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Check if sprint exists and belongs to this project
    const sprintExists = await db.sprint.findUnique({
      where: {
        id: sprintId,
        projectId: projectId,
      },
    });

    if (!sprintExists) {
      console.log(`Sprint ${sprintId} not found in project ${projectId}`);
      return new NextResponse("Sprint not found", { status: 404 });
    }
    
    // First update all tasks in the sprint to remove the sprint association
    await db.task.updateMany({
      where: {
        sprintId: sprintId,
      },
      data: {
        sprintId: null,
      },
    });

    // Delete the sprint
    await db.sprint.delete({
      where: {
        id: sprintId,
      },
    });

    console.log(`Deleted sprint ${sprintId} from project ${projectId}`);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting sprint:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
} 