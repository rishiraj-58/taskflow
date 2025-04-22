import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    console.log(`Direct task access for task: ${params.taskId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to task");
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

    // Get the task with project and workspace info to check access
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
      include: {
        project: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId: dbUser.id }
                }
              }
            }
          }
        },
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

    if (!task) {
      console.log(`Task ${params.taskId} not found`);
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check if user has access to the project via workspace membership
    if (task.project.workspace.members.length === 0) {
      console.log(`User ${userId} does not have access to project ${task.projectId}`);
      return NextResponse.json({ error: "Unauthorized access to this task" }, { status: 403 });
    }

    // Format task for response with project info
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
      projectId: task.projectId,
      projectName: task.project.name
    };

    console.log(`Successfully retrieved task: ${task.id}, project: ${task.projectId}`);
    
    return NextResponse.json(formattedTask);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
} 