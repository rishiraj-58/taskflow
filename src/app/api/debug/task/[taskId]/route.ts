import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  // Ensure we're in development mode for safety
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { message: "Debug endpoints are only available in development mode" },
      { status: 403 }
    );
  }

  const { taskId } = params;
  
  if (!taskId) {
    return NextResponse.json(
      { message: "Missing taskId parameter" },
      { status: 400 }
    );
  }

  try {
    console.log(`Debug API: Fetching task ${taskId}`);
    
    // Get current user
    const { userId } = await auth();
    console.log(`Debug API: Current user ClerkId ${userId || "not authenticated"}`);
    
    // Get task data
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
        creator: true,
        project: true
      }
    });

    if (!task) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    console.log(`Debug API: Found task ${task.id} in project ${task.projectId}`);

    // Get current user data
    let currentUser = null;
    if (userId) {
      currentUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
          workspaces: true
        }
      });
    }

    // Get project data
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
      include: {
        workspace: {
          include: {
            members: currentUser ? {
              where: { userId: currentUser.id }
            } : true
          }
        },
        owner: true
      }
    });

    if (!project) {
      return NextResponse.json({
        task,
        project: null,
        currentUser: null,
        hasAccess: false,
        message: "Project not found"
      });
    }

    // Check if user has access to the task
    const hasAccess = await checkUserAccess(userId, task.projectId);
    console.log(`Debug API: User has access: ${hasAccess}`);

    // Return debug response
    return NextResponse.json({
      task,
      project,
      currentUser,
      hasAccess
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      { message: "Error fetching debug data", error: String(error) },
      { status: 500 }
    );
  }
}

async function checkUserAccess(clerkId: string | null | undefined, projectId: string): Promise<boolean> {
  if (!clerkId) return false;

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: {
        workspaces: true
      }
    });

    if (!user) return false;

    // Find project and workspace
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: true
      }
    });

    if (!project) return false;

    // Check if user is a member of the workspace that contains this project
    const isWorkspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId: user.id
      }
    });

    return !!isWorkspaceMember;
  } catch (error) {
    console.error("Error checking user access:", error);
    return false;
  }
} 