import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

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