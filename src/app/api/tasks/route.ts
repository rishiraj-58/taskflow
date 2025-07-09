import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Task schema for validation
const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "completed", "blocked"]),
  dueDate: z.string().nullable().optional(),
  projectId: z.string(),
  sprintId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    console.log(`Fetching all tasks for the user`);
    
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

    // Get all workspaces the user is a member of
    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId: dbUser.id },
      include: { workspace: true }
    });

    const workspaceIds = workspaces.map((member: { workspaceId: string }) => member.workspaceId);

    // Get all projects in those workspaces
    const projects = await prisma.project.findMany({
      where: { workspaceId: { in: workspaceIds } }
    });

    const projectIds = projects.map((project: { id: string }) => project.id);

    // Fetch all tasks from those projects with project information
    const tasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds }
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
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
      projectName: task.project.name
    }));

    console.log(`Found ${formattedTasks.length} tasks across all projects`);
    
    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log("Creating new task");
    
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
      where: { id: taskData.projectId },
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
      console.log(`User ${userId} does not have access to project ${taskData.projectId}`);
      return NextResponse.json({ error: "Unauthorized access to this project" }, { status: 403 });
    }

    // If assigneeId is provided, verify that user exists and is a member of the workspace
    if (taskData.assigneeId) {
      console.log(`Verifying assignee: ${taskData.assigneeId}`);
      
      // Get assignee's basic info
      const assignee = await prisma.user.findUnique({
        where: { id: taskData.assigneeId }
      });

      if (!assignee) {
        console.log(`Assignee not found with ID: ${taskData.assigneeId}`);
        return NextResponse.json(
          { error: "Assignee user not found" },
          { status: 400 }
        );
      }
      
      // Verify assignee is a member of the workspace
      const isWorkspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          userId: taskData.assigneeId
        }
      });
      
      if (!isWorkspaceMember) {
        console.log(`Assignee ${taskData.assigneeId} is not a member of workspace: ${project.workspaceId}`);
        return NextResponse.json(
          { error: "Assignee is not a member of this project's workspace" },
          { status: 400 }
        );
      }
      
      console.log(`Assignee ${taskData.assigneeId} verified as workspace member`);
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
        type: "feature",
        dueDate: dueDate,
        project: {
          connect: { id: taskData.projectId }
        },
        assignee: taskData.assigneeId 
          ? { connect: { id: taskData.assigneeId } }
          : undefined,
        creator: {
          connect: { id: dbUser.id }
        },
        sprint: taskData.sprintId
          ? { connect: { id: taskData.sprintId } }
          : undefined
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
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

    // Format task for response
    const formattedTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      assigneeId: task.assigneeId,
      assignee: task.assignee,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      projectId: task.projectId,
      project: task.project
    };

    console.log(`Created task with ID: ${task.id}`);
    
    return NextResponse.json(formattedTask, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 