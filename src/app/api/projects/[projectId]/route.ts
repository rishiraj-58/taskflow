import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`Fetching project: ${params.projectId}`);
    
    const { userId } = await auth();
    
    if (!userId) {
      console.log("Unauthorized access attempt to project details");
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
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true
          }
        }
      }
    });

    // Check if project exists and user is a member of its workspace
    if (!project) {
      console.log(`Project ${params.projectId} not found`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.workspace.members.length === 0) {
      console.log(`User ${userId} does not have access to project ${params.projectId}`);
      return NextResponse.json({ error: "Unauthorized access to this project" }, { status: 403 });
    }

    // Format project for response
    const formattedProject = {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      workspaceId: project.workspaceId,
      workspaceName: project.workspace.name,
      owner: {
        id: project.owner.id,
        name: `${project.owner.firstName} ${project.owner.lastName}`.trim(),
        email: project.owner.email,
        imageUrl: project.owner.imageUrl
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };

    return NextResponse.json(formattedProject);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 }
    );
  }
} 