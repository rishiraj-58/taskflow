import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const AssignTasksSchema = z.object({
  taskIds: z.array(z.string()),
  sprintId: z.string().nullable(),
});

// Assign tasks to a sprint
export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify the user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: params.projectId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: dbUser.id }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has access to the project
    if (project.workspace.members.length === 0) {
      return NextResponse.json({ error: "Not authorized to access this project" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = AssignTasksSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors },
        { status: 400 }
      );
    }

    const { taskIds, sprintId } = validation.data;

    // If a sprint is provided, verify it exists and belongs to this project
    if (sprintId) {
      const sprint = await prisma.sprint.findUnique({
        where: {
          id: sprintId,
          projectId: params.projectId,
        },
      });

      if (!sprint) {
        return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
      }
    }

    // Verify all tasks exist and belong to this project
    const tasks = await prisma.task.findMany({
      where: {
        id: { in: taskIds },
        projectId: params.projectId,
      },
    });

    if (tasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: "One or more tasks not found or do not belong to this project" },
        { status: 400 }
      );
    }

    // Update the tasks
    const updatedTasks = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        projectId: params.projectId,
      },
      data: {
        sprintId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      updated: updatedTasks.count,
      sprintId: sprintId || null
    });
  } catch (error) {
    console.error("Error assigning tasks to sprint:", error);
    return NextResponse.json(
      { error: "Failed to assign tasks to sprint" },
      { status: 500 }
    );
  }
} 