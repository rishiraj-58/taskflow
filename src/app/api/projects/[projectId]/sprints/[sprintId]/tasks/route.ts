import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess } from "@/lib/project-access";

// Schema for adding tasks to sprint
const TaskAssignmentSchema = z.object({
  taskIds: z.array(z.string()).min(1, "At least one task must be selected"),
});

// Schema for removing tasks from sprint
const TaskRemovalSchema = z.object({
  taskIds: z.array(z.string()).min(1, "At least one task must be selected"),
});

// Get all tasks in a sprint
export async function GET(
  request: Request,
  { params }: { params: { projectId: string; sprintId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to sprint tasks");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId, sprintId } = params;
    
    // Check if user has access to this project
    const hasAccess = await checkProjectAccess(userId, projectId);
    
    if (!hasAccess) {
      console.log(`User ${userId} denied access to tasks in sprint ${sprintId}`);
      return new NextResponse("Access denied", { status: 403 });
    }

    // Check if sprint exists and belongs to this project
    const sprint = await prisma.sprint.findUnique({
      where: {
        id: sprintId,
        projectId,
      },
    });

    if (!sprint) {
      console.log(`Sprint ${sprintId} not found in project ${projectId}`);
      return new NextResponse("Sprint not found", { status: 404 });
    }

    // Fetch tasks in this sprint
    const tasks = await prisma.task.findMany({
      where: {
        sprintId,
        projectId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate sprint progress metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task: any) => task.status === "done").length;
    const progressPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    // Count tasks by status
    const tasksByStatus = {
      todo: tasks.filter((task: any) => task.status === "todo").length,
      "in-progress": tasks.filter((task: any) => task.status === "in-progress").length,
      review: tasks.filter((task: any) => task.status === "review").length,
      done: completedTasks,
    };

    console.log(`Fetched ${tasks.length} tasks for sprint ${sprintId}`);
    return NextResponse.json({
      tasks,
      totalTasks,
      completedTasks,
      progressPercentage,
      tasksByStatus,
    });
  } catch (error) {
    console.error("Error fetching sprint tasks:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Add tasks to sprint
export async function POST(
  request: Request,
  { params }: { params: { projectId: string; sprintId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to add tasks to sprint");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId, sprintId } = params;
    
    // Check if user has access to this project
    const hasAccess = await checkProjectAccess(userId, projectId);
    
    if (!hasAccess) {
      console.log(`User ${userId} denied access to add tasks to sprint ${sprintId}`);
      return new NextResponse("Access denied", { status: 403 });
    }

    // Check if sprint exists and belongs to this project
    const sprint = await prisma.sprint.findUnique({
      where: {
        id: sprintId,
        projectId,
      },
    });

    if (!sprint) {
      console.log(`Sprint ${sprintId} not found in project ${projectId}`);
      return new NextResponse("Sprint not found", { status: 404 });
    }

    const body = await request.json();
    const { taskIds } = TaskAssignmentSchema.parse(body);

    // Verify all tasks exist and belong to this project
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        projectId,
      },
    });

    if (tasks.length !== taskIds.length) {
      const foundIds = tasks.map((t: any) => t.id);
      const missingIds = taskIds.filter((id: any) => !foundIds.includes(id));
      console.log(`Some tasks were not found: ${missingIds.join(', ')}`);
      return new NextResponse("One or more tasks not found", { status: 404 });
    }

    // Update tasks to assign them to this sprint
    const updateResult = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        projectId,
      },
      data: {
        sprintId,
      },
    });

    console.log(`Added ${updateResult.count} tasks to sprint ${sprintId}`);
    return NextResponse.json({ 
      success: true,
      updatedCount: updateResult.count 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error adding tasks to sprint:", error.errors);
      return new NextResponse("Invalid task data", { status: 400 });
    }
    
    console.error("Error adding tasks to sprint:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// Remove tasks from sprint
export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string; sprintId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to remove tasks from sprint");
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId, sprintId } = params;
    
    // Check if user has access to this project
    const hasAccess = await checkProjectAccess(userId, projectId);
    
    if (!hasAccess) {
      console.log(`User ${userId} denied access to remove tasks from sprint ${sprintId}`);
      return new NextResponse("Access denied", { status: 403 });
    }

    // Check if sprint exists and belongs to this project
    const sprint = await prisma.sprint.findUnique({
      where: {
        id: sprintId,
        projectId,
      },
    });

    if (!sprint) {
      console.log(`Sprint ${sprintId} not found in project ${projectId}`);
      return new NextResponse("Sprint not found", { status: 404 });
    }

    const body = await request.json();
    const { taskIds } = TaskRemovalSchema.parse(body);

    // Update tasks to remove them from this sprint
    const updateResult = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        projectId,
        sprintId, // Only remove from this specific sprint
      },
      data: {
        sprintId: null,
      },
    });

    console.log(`Removed ${updateResult.count} tasks from sprint ${sprintId}`);
    return NextResponse.json({ 
      success: true,
      updatedCount: updateResult.count 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Validation error removing tasks from sprint:", error.errors);
      return new NextResponse("Invalid task data", { status: 400 });
    }
    
    console.error("Error removing tasks from sprint:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 