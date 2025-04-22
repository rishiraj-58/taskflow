import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema for task update validation
const taskUpdateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in-progress", "review", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  type: z.enum(["bug", "feature", "improvement", "task", "documentation"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});

// Helper function to check if user has access to project
async function checkProjectAccess(projectId: string, userId: string) {
  try {
    // Find the project and its associated workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: {
          include: {
            members: true
          }
        }
      }
    });
    
    if (!project) return false;
    
    // Find the user in the database to get their internal ID
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    
    if (!dbUser) return false;
    
    // Check if user is a member of the workspace that contains this project
    const isMember = project.workspace.members.some(
      (member: any) => member.userId === dbUser.id
    );
    
    return isMember;
  } catch (error) {
    console.error("Error checking project access:", error);
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { projectId: string; taskId: string } }
) {
  try {
    console.log(`Fetching task details: ${params.taskId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to task details");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      console.log('User not found in database for clerkId:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the project and check if user has access via workspace membership
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

    // Check if project exists and user is a member of its workspace
    if (!project || project.workspace.members.length === 0) {
      console.log(`User ${userId} does not have access to project ${params.projectId}`);
      return NextResponse.json({ error: "Unauthorized access to this project" }, { status: 403 });
    }

    // Fetch task with all related data
    const task = await prisma.task.findUnique({
      where: {
        id: params.taskId,
        projectId: params.projectId
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!task) {
      console.log(`Task ${params.taskId} not found in project ${params.projectId}`);
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Format task for response
    const formattedTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee ? `${task.assignee.firstName || ''} ${task.assignee.lastName || ''}`.trim() : null,
      projectId: task.projectId,
      projectName: task.project.name,
      sprintId: task.sprintId,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };

    return NextResponse.json(formattedTask);
  } catch (error) {
    console.error("Error fetching task details:", error);
    return NextResponse.json(
      { error: "Failed to fetch task details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { projectId: string, taskId: string } }
) {
  try {
    console.log(`Updating task: ${params.taskId} in project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt when updating task");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check project access
    const hasAccess = await checkProjectAccess(params.projectId, userId);
    if (!hasAccess) {
      console.log(`User ${userId} does not have access to project ${params.projectId}`);
      return NextResponse.json({ error: "Unauthorized access to this project" }, { status: 403 });
    }

    const body = await request.json();
    
    // Validate request body
    const validation = taskUpdateSchema.safeParse(body);
    
    if (!validation.success) {
      console.log("Task update validation failed:", validation.error);
      return NextResponse.json(
        { error: "Invalid task data", details: validation.error.format() },
        { status: 400 }
      );
    }

    const taskData = validation.data;

    // If assigneeId is provided, verify that user is a member of the project
    if (taskData.assigneeId) {
      // Get project with its workspace and members
      const project = await prisma.project.findUnique({
        where: { id: params.projectId },
        include: {
          workspace: {
            include: {
              members: true
            }
          }
        }
      });
      
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
      
      // Check if the assignee is a member of the project's workspace
      const assigneeIsMember = project.workspace.members.some(
        (member: any) => member.userId === taskData.assigneeId
      );

      if (!assigneeIsMember) {
        return NextResponse.json(
          { error: "Assignee is not a member of this project's workspace" },
          { status: 400 }
        );
      }
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: {
        id: params.taskId,
        projectId: params.projectId
      }
    });

    if (!existingTask) {
      console.log(`Task ${params.taskId} not found in project ${params.projectId}`);
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update the task
    const task = await prisma.task.update({
      where: {
        id: params.taskId
      },
      data: {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        type: taskData.type,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
        assigneeId: taskData.assigneeId === null ? null : taskData.assigneeId
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Format task for response
    const formattedTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim() : null,
      dueDate: task.dueDate,
      updatedAt: task.updatedAt
    };

    console.log(`Updated task with ID: ${task.id}`);
    
    return NextResponse.json(formattedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { projectId: string, taskId: string } }
) {
  try {
    console.log(`Deleting task: ${params.taskId} from project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt when deleting task");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check project access
    const hasAccess = await checkProjectAccess(params.projectId, userId);
    if (!hasAccess) {
      console.log(`User ${userId} does not have access to project ${params.projectId}`);
      return NextResponse.json({ error: "Unauthorized access to this project" }, { status: 403 });
    }

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: {
        id: params.taskId,
        projectId: params.projectId
      }
    });

    if (!existingTask) {
      console.log(`Task ${params.taskId} not found in project ${params.projectId}`);
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete the task
    await prisma.task.delete({
      where: {
        id: params.taskId
      }
    });

    console.log(`Deleted task with ID: ${params.taskId}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
} 