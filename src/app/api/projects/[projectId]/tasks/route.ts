import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema for task creation validation
const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in-progress", "review", "done"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  type: z.enum(["bug", "feature", "improvement", "task", "documentation"]).default("task"),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional()
});

export async function GET(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Fetching tasks for project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to tasks");
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

    // Get URL query parameters
    const url = new URL(request.url);
    const filterParam = url.searchParams.get('filter');
    
    // Build the where clause for tasks query
    const whereClause: any = {
      projectId: params.projectId
    };
    
    // Apply filter for tasks not assigned to any sprint if requested
    if (filterParam === 'nosprint') {
      whereClause.sprintId = null;
      console.log('Filtering for tasks not assigned to any sprint');
    }

    // Fetch all tasks for the project with assignee information
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format tasks for response
    const formattedTasks = tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      assigneeId: task.assigneeId,
      assigneeName: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim() : null,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      projectId: task.projectId,
      sprintId: task.sprintId
    }));

    console.log(`Found ${formattedTasks.length} tasks${filterParam ? ' with filter: ' + filterParam : ''} for project ${params.projectId}`);
    
    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Creating new task for project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt when creating task");
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

    const body = await request.json();
    
    // Log the request body for debugging
    console.log("Task creation request body:", JSON.stringify(body, null, 2));
    
    // Validate request body
    const validation = taskSchema.safeParse(body);
    
    if (!validation.success) {
      console.log("Task validation failed:", validation.error);
      return NextResponse.json(
        { error: "Invalid task data", details: validation.error.format() },
        { status: 400 }
      );
    }

    const taskData = validation.data;
    console.log("Parsed task data:", JSON.stringify(taskData, null, 2));

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

    // If assigneeId is provided, verify that user exists
    if (taskData.assigneeId) {
      // Get assignee's basic info
      const assignee = await prisma.user.findUnique({
        where: { id: taskData.assigneeId }
      });

      if (!assignee) {
        return NextResponse.json(
          { error: "Assignee user not found" },
          { status: 400 }
        );
      }
      
      // Verify assignee is a member of the workspace
      const isWorkspaceMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: project.workspaceId,
            userId: taskData.assigneeId
          }
        }
      });
      
      if (!isWorkspaceMember) {
        return NextResponse.json(
          { error: "Assignee is not a member of this project's workspace" },
          { status: 400 }
        );
      }
    }

    // Create the task
    console.log("Creating task with dueDate:", taskData.dueDate);
    const dueDate = taskData.dueDate ? new Date(taskData.dueDate) : null;
    console.log("Parsed dueDate:", dueDate);
    
    const task = await prisma.task.create({
      data: {
        title: taskData.title,
        description: taskData.description || "",
        status: taskData.status,
        priority: taskData.priority,
        type: taskData.type,
        dueDate: dueDate,
        project: {
          connect: { id: params.projectId }
        },
        assignee: taskData.assigneeId 
          ? { connect: { id: taskData.assigneeId } }
          : undefined,
        creator: {
          connect: { id: dbUser.id }
        }
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
      createdAt: task.createdAt,
      projectId: task.projectId
    };

    console.log(`Created task with ID: ${task.id}`);
    
    return NextResponse.json(formattedTask, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
} 